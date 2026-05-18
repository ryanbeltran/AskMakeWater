/**
 * useJourneyContext — Shared hook for journey computation.
 *
 * Given an activity + operator, computes the full journey from the user's
 * ZIP code (or default "75201" Dallas, TX) to the nearest data center:
 * location, grid mix, water sources, drought/stress, distance, and
 * energy/water calculations.
 *
 * Used by both the always-visible JourneyMap (in ResultCard) and the
 * expanded journey detail (WaterTrace).
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { lookupZip } from '../data/zipToLocation';
import { getStateGridMix, formatGridMix } from '../data/stateGridMix';
import { getNearestRegion } from '../data/dcRegions';
import { getOperatorForActivity, getJourneyMode } from '../data/serviceRouting';
import { getActivityEmoji } from '../data/activityEmojiMap';
import droughtData from '../data/droughtStatus.json';
import stressData from '../data/waterStress.json';

const DEFAULT_ZIP = '75201';

// ── Helpers ──────────────────────────────────────────────────────

function getDrought(countyKey, stateCode) {
  const county = droughtData.counties?.[countyKey];
  if (county) return county;
  const state = droughtData.states?.[stateCode];
  if (state) return state;
  return null;
}

function getStress(countyKey, stateCode) {
  const county = stressData.counties?.[countyKey];
  if (county) return county;
  const state = stressData.states?.[stateCode];
  if (state) return state;
  return null;
}

/** Build WaterSourceBadges props from drought + stress data. */
export function buildBadgeProps(drought, stress) {
  const props = {};
  if (drought) {
    props.drought = {
      code: drought.code,
      label: drought.label,
      color_key: drought.color_key,
      regional_addendum: drought.regional_addendum || null,
      source: 'US Drought Monitor',
      as_of: drought.as_of || droughtData._meta?.as_of,
    };
  }
  if (stress) {
    props.stress = {
      code: stress.code,
      label: stress.label,
      color_key: stress.color_key,
      source: 'WRI Aqueduct',
    };
  }
  return props;
}

// ── Hook ─────────────────────────────────────────────────────────

export default function useJourneyContext({
  activityId = null,
  activityName = 'digital activity',
  activityKwh = 0.12,
  durationHours = 1,
  operatorClass = null,
}) {
  // Read ZIP from localStorage, fallback to default
  const [zip, setZipState] = useState(() => {
    try { return localStorage.getItem('mw_user_zip') || ''; }
    catch { return ''; }
  });

  const isDefault = !zip;
  const effectiveZip = zip || DEFAULT_ZIP;

  // Listen for ZIP changes (cross-tab + same-tab polling)
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === 'mw_user_zip') setZipState(e.newValue || '');
    }
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      try {
        const z = localStorage.getItem('mw_user_zip') || '';
        setZipState(prev => prev !== z ? z : prev);
      } catch { /* ignore */ }
    }, 1000);
    return () => { window.removeEventListener('storage', handleStorage); clearInterval(interval); };
  }, []);

  // ZIP setters
  const setZip = useCallback((val) => {
    try { localStorage.setItem('mw_user_zip', val); }
    catch { /* ignore */ }
    setZipState(val);
  }, []);

  const clearZip = useCallback(() => {
    try { localStorage.removeItem('mw_user_zip'); }
    catch { /* ignore */ }
    setZipState('');
  }, []);

  // ── Compute journey mode ───────────────────────────────────────
  const mode = useMemo(() => {
    const resolvedOp = operatorClass || getOperatorForActivity(activityId);
    return getJourneyMode(activityId, resolvedOp);
  }, [activityId, operatorClass]);

  // ── Compute journey data ──────────────────────────────────────
  const journey = useMemo(() => {
    const loc = lookupZip(effectiveZip);
    if (!loc) return null;

    const userGrid = getStateGridMix(loc.state);
    const userEnergyKwh = activityKwh * durationHours;
    const emoji = getActivityEmoji(activityId);
    const userDrought = getDrought(null, loc.state);
    const userStress = getStress(null, loc.state);

    if (mode === 'local') {
      // Local-only: all water from user's grid, no DC
      const userWaterMl = userEnergyKwh * userGrid.grid_water_intensity_l_per_kwh * 1000;
      return {
        mode: 'local',
        loc,
        userGrid,
        userEnergyKwh,
        userWaterMl,
        totalWaterMl: userWaterMl,
        pctGeneration: 100,
        pctCooling: 0,
        userDrought,
        userStress,
        emoji,
        // DC fields nulled out for local mode
        dcRegion: null,
        dcGrid: null,
        dcEnergyKwh: 0,
        dcWaterMl: 0,
        dcGridWaterMl: 0,
        dcCoolingWaterMl: 0,
        dcDrought: null,
        dcStress: null,
        resolvedOperator: null,
      };
    }

    // Digital mode — full journey
    const resolvedOperator = operatorClass || getOperatorForActivity(activityId) || 'hyperscaler_aws';
    const dcRegion = getNearestRegion(resolvedOperator, loc.lat, loc.lng);
    const dcGrid = getStateGridMix(dcRegion.state);
    const dcEnergyKwh = userEnergyKwh * 0.8;

    const userWaterMl = userEnergyKwh * userGrid.grid_water_intensity_l_per_kwh * 1000;
    const dcGridWaterMl = dcEnergyKwh * dcGrid.grid_water_intensity_l_per_kwh * 1000;
    const dcCoolingWaterMl = dcEnergyKwh * dcRegion.wue_l_per_kwh * 1000;
    const dcWaterMl = dcGridWaterMl + dcCoolingWaterMl;
    const totalWaterMl = userWaterMl + dcWaterMl;

    const totalGridWater = userWaterMl + dcGridWaterMl;
    const pctGeneration = totalWaterMl > 0 ? Math.round((totalGridWater / totalWaterMl) * 100) : 0;
    const pctCooling = 100 - pctGeneration;

    const dcDrought = getDrought(dcRegion.county_key, dcRegion.state);
    const dcStress = getStress(dcRegion.county_key, dcRegion.state);

    return {
      mode: 'digital',
      loc,
      dcRegion,
      userGrid,
      dcGrid,
      userEnergyKwh,
      dcEnergyKwh,
      userWaterMl,
      dcWaterMl,
      dcGridWaterMl,
      dcCoolingWaterMl,
      totalWaterMl,
      pctGeneration,
      pctCooling,
      userDrought,
      userStress,
      dcDrought,
      dcStress,
      emoji,
      resolvedOperator,
    };
  }, [effectiveZip, activityId, activityKwh, durationHours, operatorClass, mode]);

  return {
    zip,
    effectiveZip,
    isDefault,
    mode,
    journey,
    setZip,
    clearZip,
    formatGridMix,
  };
}

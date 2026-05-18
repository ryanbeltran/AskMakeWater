/**
 * WaterTrace — Water & Energy Journey View content.
 *
 * Phase 2A-3: Wired to real per-ZIP data. Given a user's ZIP code and the
 * queried activity, computes the actual journey: user location → nearest
 * data center for that service's operator → real grid mix, water sources,
 * drought/stress data, and distance.
 *
 * Props (from ResultCard):
 *   activityId    — e.g. 'netflix_hd_per_hour'
 *   activityName  — e.g. 'Netflix HD streaming'
 *   activityKwh   — energy per unit (kWh), from the result
 *   durationHours — duration in hours
 *   operatorClass — e.g. 'hyperscaler_aws' (auto-detected or user-set)
 */
import { useState, useMemo } from 'react';
import TraceStage from './TraceStage';
import InputSubEntry from './InputSubEntry';
import WaterSourceBadges from './WaterSourceBadges';
import JourneyMap from './JourneyMap';
import { lookupZip } from '../data/zipToLocation';
import { getStateGridMix, formatGridMix } from '../data/stateGridMix';
import { getNearestRegion } from '../data/dcRegions';
import { getOperatorForActivity } from '../data/serviceRouting';
import { getActivityEmoji } from '../data/activityEmojiMap';
import droughtData from '../data/droughtStatus.json';
import stressData from '../data/waterStress.json';

// ─── Section heading ─────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
      {children}
    </p>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Look up drought data for a county key, falling back to state. */
function getDrought(countyKey, stateCode) {
  const county = droughtData.counties?.[countyKey];
  if (county) return county;
  const state = droughtData.states?.[stateCode];
  if (state) return state;
  return null;
}

/** Look up water stress data for a county key, falling back to state. */
function getStress(countyKey, stateCode) {
  const county = stressData.counties?.[countyKey];
  if (county) return county;
  const state = stressData.states?.[stateCode];
  if (state) return state;
  return null;
}

/** Build WaterSourceBadges props from drought + stress data. */
function buildBadgeProps(drought, stress) {
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

const UNMODELED_FACTORS = [
  'Time of day (grid mix shifts hourly)',
  'Seasonal variation (summer peak adds load + cooling demand)',
  'Embodied water in hardware (TV, servers, network gear)',
  'Renewable PPA claims vs delivered grid power',
  'Watershed return flows',
];

export default function WaterTrace({
  activityId = null,
  activityName = 'digital activity',
  activityKwh = 0.12,
  durationHours = 1,
  operatorClass = null,
}) {
  const [zip, setZip] = useState(() => {
    try { return localStorage.getItem('mw_user_zip') || ''; }
    catch { return ''; }
  });
  const [zipInput, setZipInput] = useState('');
  const [showDisclosure, setShowDisclosure] = useState(false);

  function handleSubmitZip(e) {
    e.preventDefault();
    const val = zipInput.trim();
    if (!val) return;
    try { localStorage.setItem('mw_user_zip', val); }
    catch { /* ignore */ }
    setZip(val);
  }

  function handleClearZip() {
    try { localStorage.removeItem('mw_user_zip'); }
    catch { /* ignore */ }
    setZip('');
    setZipInput('');
  }

  // ─── Compute journey data from ZIP + activity ─────────────────
  const journey = useMemo(() => {
    const loc = lookupZip(zip);
    if (!loc) return null;

    // Resolve operator class
    const resolvedOperator = operatorClass || getOperatorForActivity(activityId) || 'hyperscaler_aws';

    // Find nearest DC region
    const dcRegion = getNearestRegion(resolvedOperator, loc.lat, loc.lng);

    // Grid mix for user's state and DC's state
    const userGrid = getStateGridMix(loc.state);
    const dcGrid = getStateGridMix(dcRegion.state);

    // Energy: user device energy = activityKwh * durationHours
    // DC energy: approximate as 80% of user-side for streaming/browsing
    // (Phase 2A-4 will use real per-activity DC energy models)
    const userEnergyKwh = activityKwh * durationHours;
    const dcEnergyKwh = userEnergyKwh * 0.8;

    // Water calculations
    // User side: all indirect (grid water from power generation)
    const userWaterMl = userEnergyKwh * userGrid.grid_water_intensity_l_per_kwh * 1000;
    // DC side: grid water + direct cooling water
    const dcGridWaterMl = dcEnergyKwh * dcGrid.grid_water_intensity_l_per_kwh * 1000;
    const dcCoolingWaterMl = dcEnergyKwh * dcRegion.wue_l_per_kwh * 1000;
    const dcWaterMl = dcGridWaterMl + dcCoolingWaterMl;
    const totalWaterMl = userWaterMl + dcWaterMl;

    // Percentages
    const totalGridWater = userWaterMl + dcGridWaterMl;
    const pctGeneration = totalWaterMl > 0 ? Math.round((totalGridWater / totalWaterMl) * 100) : 0;
    const pctCooling = 100 - pctGeneration;

    // Drought/stress lookups
    // User side: try state-level (we don't have county keys for arbitrary ZIPs)
    const userDrought = getDrought(null, loc.state);
    const userStress = getStress(null, loc.state);

    // DC side: use county_key from dcRegion
    const dcDrought = getDrought(dcRegion.county_key, dcRegion.state);
    const dcStress = getStress(dcRegion.county_key, dcRegion.state);

    // Activity emoji
    const emoji = getActivityEmoji(activityId);

    return {
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
  }, [zip, activityId, activityKwh, durationHours, operatorClass]);

  // ─── Format helpers ───────────────────────────────────────────
  const fmt = (ml) => {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
    return `${Math.round(ml)} mL`;
  };
  const fmtKwh = (kwh) => {
    if (kwh < 0.01) return `${(kwh * 1000).toFixed(1)} Wh`;
    return `${kwh.toFixed(2)} kWh`;
  };

  return (
    <div className="space-y-4">
      {/* ZIP input row */}
      {!zip ? (
        <form onSubmit={handleSubmitZip} className="flex items-center gap-2">
          <label className="text-xs text-gray-500 flex-shrink-0">Your ZIP code</label>
          <input
            type="text"
            value={zipInput}
            onChange={e => setZipInput(e.target.value)}
            placeholder="Enter your ZIP code"
            maxLength={10}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water min-w-0"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium text-white bg-mw-water rounded-lg hover:bg-mw-water-dark transition-colors cursor-pointer flex-shrink-0"
          >
            See the journey
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            Showing journey for ZIP <strong className="text-gray-700">{zip}</strong>
            {journey && <> — {journey.loc.city}, {journey.loc.state}</>}
          </span>
          <button
            onClick={handleClearZip}
            className="text-mw-water hover:underline cursor-pointer"
          >
            (change)
          </button>
        </div>
      )}

      {/* Journey content — only shown after ZIP entry + valid lookup */}
      {zip && journey && (
        <>
          {/* ─── Journey Map ─── */}
          <JourneyMap
            activityEmoji={journey.emoji}
            activityName={activityName}
            userCity={`${journey.loc.city}, ${journey.loc.state}`}
            userUtility={journey.userGrid.primary_utilities[0] || journey.loc.primary_utility}
            userWatershed={journey.loc.watershed_hint}
            userDroughtLabel={journey.userDrought?.label?.toLowerCase() || ''}
            dcLabel={`Data center · ${journey.dcRegion.operator_label} ${journey.dcRegion.region_id}`}
            dcCity={`${journey.dcRegion.city}, ${journey.dcRegion.state}`}
            dcUtility={journey.dcGrid.primary_utilities[0] || 'Grid operator'}
            dcWaterUtility={journey.dcRegion.water_utility}
            dcWatershed={journey.dcRegion.watershed_name}
            dcDroughtLabel={journey.dcDrought?.label?.toLowerCase() || ''}
            distanceMi={journey.dcRegion.distance_mi}
          />

          {/* ─── Section 1: THE DATA PATH ─── */}
          <div className="space-y-3">
            <SectionHeading>The data path</SectionHeading>

            <TraceStage
              emoji={journey.emoji}
              title="Your location"
              subtitle={`${journey.loc.city}, ${journey.loc.state} ${zip}`}
              facts={[
                `${journey.loc.primary_utility} local utility`,
                `Local grid: ${formatGridMix(journey.userGrid.grid_mix)}`,
                `Water context: ${journey.loc.watershed_hint}${journey.userDrought ? `, ${journey.userDrought.label.toLowerCase()}` : ''}`,
              ]}
              confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
              source={{ label: journey.userGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
            />

            {/* Round-trip distance indicator */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-gray-300 text-lg leading-none">↓</span>
              <span className="text-[11px] text-gray-400">
                data travels {journey.dcRegion.distance_mi.toLocaleString()} mi each way
              </span>
              <span className="text-gray-300 text-lg leading-none">↑</span>
            </div>

            <TraceStage
              emoji="🏢"
              title="Data center"
              subtitle={`${journey.dcRegion.operator_label} ${journey.dcRegion.region_id}, ${journey.dcRegion.city}, ${journey.dcRegion.state}`}
              facts={[
                `Cooling: ${journey.dcRegion.typical_cooling} · WUE ${journey.dcRegion.wue_l_per_kwh} L/kWh`,
                `${journey.dcRegion.county}, ${journey.dcRegion.state}`,
              ]}
              confidence="medium"
              source={{
                label: `${journey.dcRegion.operator_label} sustainability report`,
                url: journey.dcRegion.operator === 'hyperscaler_aws'
                  ? 'https://sustainability.aboutamazon.com/2024-amazon-sustainability-report.pdf'
                  : journey.dcRegion.operator === 'hyperscaler_gcp'
                  ? 'https://sustainability.google/reports/google-2024-environmental-report/'
                  : journey.dcRegion.operator === 'hyperscaler_msft'
                  ? 'https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RW1lMjE'
                  : 'https://sustainability.fb.com/2024-sustainability-report/',
              }}
            />
          </div>

          {/* ─── Section 2: WHAT IT TAKES TO RUN ─── */}
          <div className="space-y-3">
            <SectionHeading>What it takes to run</SectionHeading>

            {/* Side-by-side grid — collapses to stacked at ≤500px */}
            <div className="grid grid-cols-1 min-[501px]:grid-cols-2 gap-2">

              {/* ── Power card (⚡ only) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  <span className="mr-1">🔌</span> Power
                </p>

                {/* Your side */}
                <InputSubEntry
                  side="your"
                  utility={journey.userGrid.primary_utilities[0] || journey.loc.primary_utility}
                  location={`${journey.loc.city}, ${journey.loc.state}`}
                  confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
                  metricType="energy"
                  value={fmtKwh(journey.userEnergyKwh)}
                  source={{ label: journey.userGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
                >
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {formatGridMix(journey.userGrid.grid_mix)}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Water intensity: {journey.userGrid.grid_water_intensity_l_per_kwh} L/kWh
                    {journey.userGrid.is_estimated && <span className="text-amber-600"> (estimated)</span>}
                  </p>
                </InputSubEntry>

                <div className="border-t border-gray-200/60" />

                {/* Data center side */}
                <InputSubEntry
                  side="datacenter"
                  utility={journey.dcGrid.primary_utilities[0] || 'Grid operator'}
                  location={`${journey.dcRegion.city}, ${journey.dcRegion.state}`}
                  confidence={journey.dcGrid.is_estimated ? 'medium' : 'high'}
                  metricType="energy"
                  value={fmtKwh(journey.dcEnergyKwh)}
                  source={{ label: journey.dcGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
                >
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {formatGridMix(journey.dcGrid.grid_mix)}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Water intensity: {journey.dcGrid.grid_water_intensity_l_per_kwh} L/kWh
                    {journey.dcGrid.is_estimated && <span className="text-amber-600"> (estimated)</span>}
                  </p>
                </InputSubEntry>
              </div>

              {/* ── Water card (💧 only) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  <span className="mr-1">💧</span> Water
                </p>

                {/* Your side */}
                <InputSubEntry
                  side="your"
                  utility={journey.loc.watershed_hint}
                  location={`${journey.loc.primary_utility} · ${journey.loc.city}`}
                  confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
                  metricType="water"
                  value={fmt(journey.userWaterMl)}
                  breakdown="indirect, from your local grid"
                  source={{ label: 'US Drought Monitor + local utility', url: 'https://droughtmonitor.unl.edu' }}
                >
                  <WaterSourceBadges {...buildBadgeProps(journey.userDrought, journey.userStress)} />
                </InputSubEntry>

                <div className="border-t border-gray-200/60" />

                {/* Data center side */}
                <InputSubEntry
                  side="datacenter"
                  utility={journey.dcRegion.watershed_name}
                  location={`${journey.dcRegion.water_utility} · ${journey.dcRegion.state}`}
                  confidence="medium"
                  metricType="water"
                  value={fmt(journey.dcWaterMl)}
                  breakdown={`${fmt(journey.dcGridWaterMl)} grid + ${fmt(journey.dcCoolingWaterMl)} cooling`}
                  source={{ label: `US Drought Monitor + ${journey.dcRegion.water_utility}`, url: 'https://droughtmonitor.unl.edu' }}
                >
                  <WaterSourceBadges {...buildBadgeProps(journey.dcDrought, journey.dcStress)} />
                </InputSubEntry>
              </div>
            </div>
          </div>

          {/* Total water summary */}
          <div className="bg-mw-water-light/40 border border-mw-water/15 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-gray-800">
              Total water for this query: ~{fmt(journey.totalWaterMl)}
            </p>
            <p className="text-xs text-gray-500">
              {journey.pctGeneration}% from power generation, {journey.pctCooling}% from cooling
            </p>
          </div>

          {/* What this journey doesn't yet model */}
          <div>
            <button
              onClick={() => setShowDisclosure(!showDisclosure)}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showDisclosure ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              What this journey doesn&apos;t yet model
            </button>

            {showDisclosure && (
              <ul className="mt-2 space-y-1 pl-4">
                {UNMODELED_FACTORS.map((factor, i) => (
                  <li key={i} className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                    <span className="mt-0.5 flex-shrink-0">&#8226;</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Invalid ZIP message */}
      {zip && !journey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            We couldn&apos;t find location data for ZIP code <strong>{zip}</strong>.
            This feature currently supports US ZIP codes only.
          </p>
          <button
            onClick={handleClearZip}
            className="mt-2 text-xs text-mw-water hover:underline cursor-pointer"
          >
            Try a different ZIP
          </button>
        </div>
      )}
    </div>
  );
}

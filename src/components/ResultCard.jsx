import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import WaterDrop from './WaterDrop';
import InteractiveBreakdown from './InteractiveBreakdown';
import ImproveModal from './ImproveModal';
import WaterTrace from './WaterTrace';
import { recalculate, recalculateConfidence, calculateMetaWater, formatWater, DEVICES, REGIONS, OPERATOR_CLASSES, COOLING_TECH, calculatePowerSourceVariants } from '../data/recalculate';
import AIModelComparison from './AIModelComparison';
import PowerSourceChart from './PowerSourceChart';
import { getReferenceData } from '../data/referenceDataClient';

const BOTTLE_ML = 500;

function BottleCount({ ml }) {
  if (!ml || ml < 50) return null; // don't show for tiny amounts
  const bottles = ml / BOTTLE_ML;
  const display = bottles < 10 ? bottles.toFixed(1) : Math.round(bottles);
  const fullBottles = Math.min(Math.floor(bottles), 5); // show up to 5 icons
  const hasMore = bottles > 5;
  return (
    <span className="flex items-center gap-1 text-sm text-mw-water">
      {'🍶'.repeat(fullBottles)}{hasMore ? '+' : ''}
      <span className="text-xs font-medium text-gray-500">{display} bottles (500 mL)</span>
    </span>
  );
}

function ComparisonIcon({ type }) {
  const icons = {
    drop: '\uD83D\uDCA7',
    teaspoon: '\uD83E\uDD44',
    glass: '\uD83E\uDD5B',
    bottle: '\uD83C\uDF76',
    bathtub: '\uD83D\uDEC1',
    shower: '\uD83D\uDEBF',
  };
  return <span className="text-2xl">{icons[type] || icons.drop}</span>;
}

function ConfidenceBar({ score }) {
  let color = 'bg-mw-forest';
  if (score < 50) color = 'bg-mw-human';
  else if (score < 70) color = 'bg-mw-solar';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-600 tabular-nums w-12 text-right">
        {score}%
      </span>
    </div>
  );
}

// Map refinement option values to reference data keys
function mapRefinementToParam(questionId, value, affects) {
  const deviceMap = {
    'Phone': 'phone',
    'Laptop': 'laptop',
    'Desktop PC': 'desktop',
    '55" LED TV': 'tv_55_led',
    '65" OLED TV': 'tv_65_oled',
    'Gaming Console': 'console',
    'Smart Speaker': 'smart_speaker',
    'Tablet': 'tablet',
    'Projector': 'projector',
  };

  const regionMap = {
    'US Southwest': 'us_southwest_arizona',
    'US Northeast': 'us_northeast',
    'US Virginia': 'us_virginia',
    'US Southeast': 'us_southeast',
    'US Chicago': 'us_chicago',
    'US Iowa': 'us_iowa',
    'US Oregon': 'us_oregon',
    'US Texas / San Antonio': 'us_texas_san_antonio',
    'Nordics': 'nordics',
    'Northern Europe': 'nordics',
    'Singapore': 'singapore',
    'Southeast Asia': 'southeast_asia',
    'Ireland': 'ireland',
    'UK': 'uk',
    'Netherlands': 'netherlands',
    'Germany': 'germany',
    'Southern Europe': 'southern_europe',
    'Middle East / UAE': 'middle_east_uae',
    'India / Mumbai': 'india_mumbai',
    'Japan': 'japan',
    'South Korea': 'south_korea',
    'China (coastal)': 'china_east',
    'China (inland)': 'china_west',
    'Australia': 'australia',
    'Brazil': 'brazil',
    'Canada': 'canada',
    'Africa': 'west_africa',
  };

  const resolutionMap = {
    'SD (480p)': 0.5,
    'HD (1080p)': 1.0,
    '4K': 2.0,
  };

  if (affects === 'device_kwh' || questionId === 'device') {
    const key = deviceMap[value];
    if (key) return { device_key: key };
  }

  if (affects === 'wue' || questionId === 'region') {
    const key = regionMap[value];
    if (key) return { region_key: key };
  }

  if (affects === 'streaming_kwh' || questionId === 'resolution') {
    const mult = resolutionMap[value];
    if (mult !== undefined) return { resolution_multiplier: mult };
  }

  return {};
}

function RawDataView({ rawData }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(rawData, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'makewater-calculation.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setShowRaw(!showRaw)}
        className="text-xs font-medium text-gray-400 hover:text-mw-water transition-colors cursor-pointer flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {showRaw ? 'Hide raw data' : 'View raw data'}
      </button>

      {showRaw && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={handleCopy}
              className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="text-[10px] px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer"
            >
              Download .json
            </button>
          </div>
          <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto leading-relaxed font-mono max-h-80 overflow-y-auto">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

// Compare current region to best/worst US regions to show impact
function RegionalComparisonNote({ activityKwh, duration, durationHours, deviceKey, currentRegionKey, customDeviceWatts, resolutionMultiplier }) {
  // Only show for non-default US regions
  if (currentRegionKey === 'industry_average') return null;
  const currentRegion = REGIONS[currentRegionKey];
  if (!currentRegion) return null;

  // Find a contrasting US region
  const contrastPairs = {
    us_southwest_arizona: 'us_oregon',
    us_texas_san_antonio: 'us_oregon',
    us_southeast: 'us_oregon',
    us_virginia: 'us_oregon',
    us_california: 'us_oregon',
    us_northeast: 'us_oregon',
    us_chicago: 'us_oregon',
    us_oregon: 'us_southwest_arizona',
    us_iowa: 'us_southwest_arizona',
  };

  const contrastKey = contrastPairs[currentRegionKey];
  if (!contrastKey) return null;

  const contrastRegion = REGIONS[contrastKey];
  if (!contrastRegion) return null;

  const effectiveKwh = activityKwh * (resolutionMultiplier || 1.0);

  const currentResult = recalculate({
    activity_kwh: effectiveKwh, duration, device_key: deviceKey,
    region_key: currentRegionKey, duration_hours: durationHours,
    custom_device_watts: customDeviceWatts,
  });
  const contrastResult = recalculate({
    activity_kwh: effectiveKwh, duration, device_key: deviceKey,
    region_key: contrastKey, duration_hours: durationHours,
    custom_device_watts: customDeviceWatts,
  });

  const diff = Math.abs(currentResult.water_ml - contrastResult.water_ml);
  // Only show if the difference is meaningful (> 5 mL or > 20% change)
  if (diff < 5 && diff / Math.max(currentResult.water_ml, 1) < 0.2) return null;

  const isCurrentHigher = currentResult.water_ml > contrastResult.water_ml;
  const verb = isCurrentHigher ? 'save' : 'use';
  const shortCurrentLabel = currentRegion.label.replace(/^US — /, '');
  const shortContrastLabel = contrastRegion.label.replace(/^US — /, '');

  return (
    <div className="bg-mw-water-light/30 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
      <span className="font-medium text-gray-700">Regional impact: </span>
      Moving this same query from {shortCurrentLabel} to {shortContrastLabel} would {verb} approximately{' '}
      <span className="font-semibold text-mw-water">{formatWater(diff)}</span> of water
      {isCurrentHigher
        ? ' due to cooler climate and lower-intensity grid energy sources.'
        : ' due to warmer climate and higher cooling demand.'}
    </div>
  );
}

const MODEL_LABELS = {
  'claude-haiku-4-5-20251001': 'haiku',
  'claude-sonnet-4-20250514': 'sonnet',
};

function buildRawExport({ query, model, usage, data, params, calculatedResult, confidenceData, isModified }) {
  const activeParams = isModified ? params : data.editable_params || params;
  const activeResult = isModified ? calculatedResult : null;
  const activityKwh = activeParams.activity_kwh || 0;
  const deviceKey = activeParams.device_key || 'none';
  const regionKey = activeParams.region_key || 'industry_average';
  const device = DEVICES[deviceKey] || DEVICES.none;
  const region = REGIONS[regionKey] || REGIONS.industry_average;
  const duration = activeParams.duration || 1;
  const durationHours = activeParams.duration_hours || duration;

  const deviceKwhPerHour = deviceKey === 'custom' && activeParams.custom_device_watts > 0
    ? activeParams.custom_device_watts / 1000
    : device.kwh;
  const totalKwh = (activityKwh * duration) + (deviceKwhPerHour * durationHours);
  const waterMl = activeResult ? activeResult.water_ml : data.water_ml;

  const totalTokens = usage ? (usage.input_tokens + usage.output_tokens) : 0;
  const queryWaterMl = usage ? calculateMetaWater(totalTokens) : 0;
  const modelLabel = MODEL_LABELS[model] || model || 'unknown';

  const sourceIds = (data.sources || []).map(s => s.id);

  return {
    query: query || data.activity || '',
    classification: {
      model: modelLabel,
      activity_id: data.activity_id || 'unknown',
      parameters: {
        [activeParams.duration_unit || 'units']: duration,
        device: deviceKey,
        ...(activeParams.resolution_multiplier && activeParams.resolution_multiplier !== 1.0
          ? { resolution_multiplier: activeParams.resolution_multiplier }
          : {}),
      },
      region: regionKey,
    },
    lookup_values: {
      activity_kwh_per_unit: activityKwh,
      device_kwh_per_hour: deviceKwhPerHour,
      wue_applied: region.wue,
      wue_source: regionKey,
    },
    calculation: {
      total_kwh: `(${activityKwh} + ${deviceKwhPerHour}) x ${duration} = ${totalKwh.toFixed(4)}`,
      water_liters: `${totalKwh.toFixed(4)} x ${region.wue} = ${(totalKwh * region.wue).toFixed(4)}`,
      water_ml: Math.round(waterMl * 10) / 10,
    },
    confidence_score: isModified
      ? confidenceData.confidence_score
      : data.confidence_score,
    meta: {
      model_used: modelLabel,
      tokens: totalTokens,
      query_water_cost_ml: Math.round(queryWaterMl * 100) / 100,
      ...(usage?.cache_read_input_tokens > 0 ? { cache_hit: true } : {}),
    },
    sources: sourceIds,
  };
}

export default function ResultCard({ data, query, model, usage, onTier2Submit, focusRequest = null, onSuggestCorrection = null }) {
  const [expanded, setExpanded] = useState(false);
  const breakdownRef = useRef(null);
  const [highlightedField, setHighlightedField] = useState(null);
  const [improveOpen, setImproveOpen] = useState(false);
  const [researchBadge, setResearchBadge] = useState(null); // 'pending_review' after accepting
  const [traceOpen, setTraceOpen] = useState(false);

  // Phase 1 checkpoint gate. Phase 2 will remove this and wire
  // the section to real per-ZIP lookups for all users.
  const [showTrace] = useState(() => {
    try { return localStorage.getItem('mw_trace_preview') === 'true'; }
    catch { return false; }
  });

  // Respond to focusRequest: expand breakdown, scroll to the target field,
  // focus its native control, and briefly highlight it.
  useEffect(() => {
    if (!focusRequest || !focusRequest.field) return;
    setExpanded(true);

    // Wait for the expand animation / DOM to settle, then scroll + focus.
    const timer = setTimeout(() => {
      const root = breakdownRef.current;
      if (!root) return;
      const el = root.querySelector(`[data-focus-target="${focusRequest.field}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
      }
      setHighlightedField(focusRequest.field);
      setTimeout(() => setHighlightedField(null), 1800);
    }, 120);

    return () => clearTimeout(timer);
  }, [focusRequest]);

  // Extract initial editable params from AI response
  const initialParams = useMemo(() => {
    const parsed = data.editable_params || {};
    return {
      activity_kwh: parsed.activity_kwh || data.water_ml / 1000 / 1.8 || 0.077,
      duration: parsed.duration || 1,
      duration_unit: parsed.duration_unit || 'hours',
      duration_hours: parsed.duration_hours || parsed.duration || 1,
      device_key: parsed.device_key || 'none',
      region_key: parsed.region_key || 'industry_average',
      resolution_multiplier: 1.0,
      custom_device_watts: 0,
      operator_class: parsed.operator_class || null,
      cooling_tech: parsed.cooling_tech || null,
    };
  }, [data]);

  const [params, setParams] = useState(initialParams);
  const [tier2Narrative, setTier2Narrative] = useState(null);
  const [referenceData, setReferenceData] = useState(null);

  // Load public reference data once per session; cached in-module.
  useEffect(() => {
    let cancelled = false;
    getReferenceData().then(payload => {
      if (!cancelled) setReferenceData(payload);
    });
    return () => { cancelled = true; };
  }, []);

  const onParamChange = useCallback((updates) => {
    setParams(prev => {
      const next = { ...prev, ...updates };
      if (updates.duration !== undefined && updates.duration_hours === undefined) {
        next.duration_hours = updates.duration;
      }
      return next;
    });
  }, []);

  // Recalculate on every param change. Reference data is threaded through so
  // regional_wue overrides take effect once they've loaded; if it's null the
  // calculation falls back to hardcoded REGIONS values transparently.
  const calculatedResult = useMemo(() => {
    const effectiveKwh = params.activity_kwh * (params.resolution_multiplier || 1.0);
    return recalculate({
      activity_kwh: effectiveKwh,
      duration: params.duration,
      device_key: params.device_key,
      region_key: params.region_key,
      custom_device_watts: params.custom_device_watts,
      duration_hours: params.duration_hours,
      reference_data: referenceData,
      operator_class: params.operator_class,
      cooling_tech: params.cooling_tech,
    });
  }, [params, referenceData]);

  // Power source variants — one recalculation per published power source in
  // the reference data. Empty array until reference data loads or if no
  // cited/attributed power_sources exist.
  const powerSourceVariants = useMemo(() => {
    if (!referenceData) return [];
    const effectiveKwh = params.activity_kwh * (params.resolution_multiplier || 1.0);
    return calculatePowerSourceVariants({
      params: {
        activity_kwh: effectiveKwh,
        duration: params.duration,
        device_key: params.device_key,
        region_key: params.region_key,
        custom_device_watts: params.custom_device_watts,
        duration_hours: params.duration_hours,
      },
      reference_data: referenceData,
    });
  }, [params, referenceData]);

  // Recalculate confidence based on user refinements
  const confidenceData = useMemo(() => {
    if (!data.confidence_factors) return { confidence_factors: {}, confidence_score: 0 };

    const overrides = {};
    // If user picked a specific device, mark device_energy_measured as met
    if (params.device_key !== 'none' && params.device_key !== (initialParams.device_key || 'none')) {
      overrides.device_energy_measured = true;
    }
    // If user picked a specific region (not global average)
    if (params.region_key !== 'industry_average') {
      // Full credit requires both site WUE and grid water intensity to be
      // region-specific. If grid water uses the national default, we give
      // partial credit (handled by halving the points in recalculateConfidence
      // when met is 'partial').
      const region = REGIONS[params.region_key];
      if (region && !region.estimated && !region.gridEstimated) {
        overrides.regional_specific = true;  // full 10 points
      } else if (region && !region.estimated) {
        overrides.regional_specific = 'partial'; // 5 points — site-specific but grid estimated
      }
      // Estimated site WUE regions get no regional credit (default)
    }

    return recalculateConfidence(data.confidence_factors, overrides);
  }, [data.confidence_factors, params.device_key, params.region_key, initialParams.device_key]);

  // Has the user changed anything from defaults?
  const isModified = params.device_key !== initialParams.device_key ||
    params.region_key !== initialParams.region_key ||
    params.duration !== initialParams.duration ||
    params.resolution_multiplier !== 1.0 ||
    (params.device_key === 'custom' && params.custom_device_watts > 0) ||
    params.operator_class !== initialParams.operator_class ||
    params.cooling_tech !== initialParams.cooling_tech;

  // Display values: use recalculated if modified, otherwise original
  const displayWater = isModified ? calculatedResult.water_display : data.water_display;
  const displayComparison = isModified ? calculatedResult.comparison : data.comparison;
  const displayComparisonIcon = isModified ? calculatedResult.comparison_icon : data.comparison_icon;
  const displayConfidence = isModified ? confidenceData.confidence_score : data.confidence_score;

  // Handle Tier 1 refinement selection
  function handleRefinementSelect(questionId, value, affects) {
    const paramUpdates = mapRefinementToParam(questionId, value, affects);
    if (Object.keys(paramUpdates).length > 0) {
      onParamChange(paramUpdates);
    }
  }

  // Handle Tier 2
  async function handleTier2(text) {
    if (!onTier2Submit) return;
    const result = await onTier2Submit(text, data);
    if (result) setTier2Narrative(result);
  }

  // Handle research acceptance — update the card with researched values
  function handleResearchAccept(research) {
    onParamChange({
      activity_kwh: research.kwh_per_hour,
      duration: research.duration_hours,
      duration_hours: research.duration_hours,
    });
    setResearchBadge('pending_review');
  }

  // Show "Improve this estimate" CTA when confidence < 40%
  const showImproveCTA = (data.general_energy || data.estimated) && displayConfidence < 40;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Main result */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 bg-mw-water-light rounded-xl flex items-center justify-center">
            <ComparisonIcon type={displayComparisonIcon} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">{data.activity}</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold text-mw-base tracking-tight transition-all duration-300">
                {displayWater}
              </p>
              <BottleCount ml={isModified ? calculatedResult.water_ml : data.water_ml} />
            </div>
            <p className="text-sm text-gray-600 mt-1">{displayComparison}</p>
            {isModified && (
              <p className="text-[10px] text-mw-water mt-1">
                Updated from your adjustments
              </p>
            )}
          </div>
          {data.estimated && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                AI Estimate
              </span>
            </div>
          )}
          {data.general_energy && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                General Estimate
              </span>
            </div>
          )}
        </div>

        {/* General-energy explanatory note */}
        {data.general_energy && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-yellow-900 leading-relaxed">
              Based on estimated wattage, not published activity data.
              {data.general_energy_watts && (
                <> Estimated draw: <strong>{data.general_energy_watts} W</strong>
                  {data.general_energy_source && <> from <strong>{data.general_energy_source}</strong></>}
                  .</>
              )}
            </p>
            {data.general_energy_note && (
              <p className="text-[11px] text-yellow-800 italic leading-relaxed">
                <strong className="not-italic">Basis:</strong> {data.general_energy_note}
              </p>
            )}
            <button
              type="button"
              onClick={() => onSuggestCorrection?.(data)}
              className="text-[11px] font-semibold text-yellow-900 hover:underline cursor-pointer"
            >
              Submit correction →
            </button>
          </div>
        )}

        {/* Estimated-tier explanatory note */}
        {data.estimated && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-amber-900 leading-relaxed">
              This activity isn't in our verified database yet.
              {data.estimated_similar_label && (
                <> This estimate is based on similarity to <strong>{data.estimated_similar_label}</strong>.</>
              )}{' '}
              Have better data? Let us know.
            </p>
            {data.estimated_reasoning && (
              <p className="text-[11px] text-amber-800 italic leading-relaxed">
                <strong className="not-italic">Reasoning:</strong> {data.estimated_reasoning}
              </p>
            )}
            <button
              type="button"
              onClick={() => onSuggestCorrection?.(data)}
              className="text-[11px] font-semibold text-amber-900 hover:underline cursor-pointer"
            >
              Submit correction →
            </button>
          </div>
        )}

        {/* Confidence */}
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            {(data.estimated || data.general_energy) ? 'Confidence (capped — AI estimate)' : 'Accuracy confidence'}
          </p>
          <ConfidenceBar score={displayConfidence} />
        </div>

        {/* Research badge */}
        {researchBadge && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Researched (pending review)
            </span>
          </div>
        )}

        {/* Improve this estimate CTA */}
        {showImproveCTA && !researchBadge && (
          <button
            onClick={() => setImproveOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-mw-water border border-mw-water/30 rounded-xl hover:bg-mw-water-light transition-colors cursor-pointer bg-transparent"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Improve this estimate
          </button>
        )}

        {/* Operator class auto-detection note */}
        {initialParams.operator_class && initialParams.operator_class !== 'industry_typical' && OPERATOR_CLASSES[initialParams.operator_class] && (
          <p className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
            Detected: <strong>{data.activity_id?.replace(/_/g, ' ')}</strong> → {OPERATOR_CLASSES[initialParams.operator_class].label} (hyperscaler).
            <span className="text-gray-400"> You can change this in Advanced.</span>
          </p>
        )}
      </div>

      {/* Power source comparison — collapsed by default, only renders when
          cited/attributed power_sources reference data is available */}
      <PowerSourceChart variants={powerSourceVariants} />

      {/* Water & Energy Journey View — gated behind localStorage flag */}
      {showTrace && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setTraceOpen(!traceOpen)}
            className="w-full px-5 py-3 text-left text-sm font-medium text-mw-water hover:bg-mw-water-light/50 transition-colors flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Water &amp; Energy Journey View
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${traceOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {traceOpen && (
            <div className="px-5 pb-5">
              <WaterTrace />
            </div>
          )}
        </div>
      )}

      {/* Expandable breakdown */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 text-left text-sm font-medium text-mw-water hover:bg-mw-water-light/50 transition-colors flex items-center justify-between cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <WaterDrop size={14} className="text-mw-water" />
            How was this calculated?
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div ref={breakdownRef} className="px-5 pb-5 space-y-5">
            {/* Interactive editable breakdown */}
            <InteractiveBreakdown
              params={params}
              onParamChange={onParamChange}
              calculatedResult={calculatedResult}
              originalData={data}
              confidenceData={confidenceData}
              activityId={data.activity_id}
              highlightedField={highlightedField}
            />

            {/* Educational comparison: show water savings if region changed significantly */}
            <RegionalComparisonNote
              activityKwh={params.activity_kwh}
              duration={params.duration}
              durationHours={params.duration_hours}
              deviceKey={params.device_key}
              currentRegionKey={params.region_key}
              customDeviceWatts={params.custom_device_watts}
              resolutionMultiplier={params.resolution_multiplier}
            />

            {/* AI model comparison */}
            {data.show_model_comparison && data.comparison_type && (
              <AIModelComparison
                comparisonType={data.comparison_type}
                regionKey={params.region_key}
                count={params.duration}
                primaryActivityId={data.activity_id}
              />
            )}


            {/* Tier 2 response */}
            {tier2Narrative && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  AI Refinement
                </p>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                  {tier2Narrative}
                </div>
              </div>
            )}

            {/* Raw data export */}
            <RawDataView rawData={buildRawExport({
              query,
              model,
              usage,
              data,
              params,
              calculatedResult,
              confidenceData,
              isModified,
            })} />
          </div>
        )}
      </div>

      {/* Deep-research modal */}
      <ImproveModal
        open={improveOpen}
        onClose={() => setImproveOpen(false)}
        data={data}
        onAccept={handleResearchAccept}
      />
    </div>
  );
}

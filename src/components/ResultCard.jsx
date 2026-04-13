import { useState, useMemo, useCallback } from 'react';
import WaterDrop from './WaterDrop';
import InteractiveBreakdown from './InteractiveBreakdown';
import { recalculate, recalculateConfidence, calculateMetaWater, formatWater, DEVICES, REGIONS } from '../data/recalculate';
import AIModelComparison from './AIModelComparison';

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

export default function ResultCard({ data, query, model, usage, onTier2Submit }) {
  const [expanded, setExpanded] = useState(false);

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
    };
  }, [data]);

  const [params, setParams] = useState(initialParams);
  const [tier2Narrative, setTier2Narrative] = useState(null);

  const onParamChange = useCallback((updates) => {
    setParams(prev => {
      const next = { ...prev, ...updates };
      if (updates.duration !== undefined && updates.duration_hours === undefined) {
        next.duration_hours = updates.duration;
      }
      return next;
    });
  }, []);

  // Recalculate on every param change
  const calculatedResult = useMemo(() => {
    const effectiveKwh = params.activity_kwh * (params.resolution_multiplier || 1.0);
    return recalculate({
      activity_kwh: effectiveKwh,
      duration: params.duration,
      device_key: params.device_key,
      region_key: params.region_key,
      custom_device_watts: params.custom_device_watts,
      duration_hours: params.duration_hours,
    });
  }, [params]);

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
      // Published data regions get full credit; estimated regions get partial
      const region = REGIONS[params.region_key];
      overrides.regional_specific = region && !region.estimated;
      // Even estimated regions are more specific than global average,
      // but we don't award the full confidence points
    }

    return recalculateConfidence(data.confidence_factors, overrides);
  }, [data.confidence_factors, params.device_key, params.region_key, initialParams.device_key]);

  // Has the user changed anything from defaults?
  const isModified = params.device_key !== initialParams.device_key ||
    params.region_key !== initialParams.region_key ||
    params.duration !== initialParams.duration ||
    params.resolution_multiplier !== 1.0 ||
    (params.device_key === 'custom' && params.custom_device_watts > 0);

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
        </div>

        {/* Confidence */}
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Accuracy confidence
          </p>
          <ConfidenceBar score={displayConfidence} />
        </div>
      </div>

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
          <div className="px-5 pb-5 space-y-5">
            {/* Interactive editable breakdown */}
            <InteractiveBreakdown
              params={params}
              onParamChange={onParamChange}
              calculatedResult={calculatedResult}
              originalData={data}
              confidenceData={confidenceData}
              activityId={data.activity_id}
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
    </div>
  );
}

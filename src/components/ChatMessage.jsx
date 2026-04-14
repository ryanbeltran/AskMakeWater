import ResultCard from './ResultCard';
import ComparisonTable from './ComparisonTable';
import FollowUpChips from './FollowUpChips';
import MetaCost from './MetaCost';
import WaterDrop from './WaterDrop';
import { getActivity } from '../data/activityLookup';
import { recalculate, recalculateConfidence, formatWater, getComparison, DEVICES, REGIONS, clampEstimatedKwh, buildEstimatedConfidence, clampGeneralWatts, buildGeneralEnergyConfidence } from '../data/recalculate';
import { getComparisonType } from '../data/aiModelComparison';

/**
 * Build a result object for an AI-estimated (tier 3) classification.
 * Uses the AI-supplied kWh value instead of a catalog lookup, clamps it to a
 * realistic range, and caps confidence at ESTIMATED_CONFIDENCE_CAP.
 */
function buildEstimatedResult(classification) {
  const duration = classification.duration || 1;
  const deviceKey = classification.device_hint || 'none';
  const regionKey = classification.region_hint || 'industry_average';
  const similarTo = classification.similar_to || null;
  const name = classification.suggested_activity_name || 'Unrecognized digital activity';
  const reasoning = classification.reasoning || 'AI-generated estimate based on similar activities.';

  // Clamp the AI-provided kWh to the guardrail range
  const clamped = clampEstimatedKwh(classification.estimated_kwh_per_hour);

  // Reuse the shared recalculate() math — it doesn't care where activity_kwh came from
  const calculated = recalculate({
    activity_kwh: clamped.value,
    duration,
    device_key: deviceKey,
    region_key: regionKey,
    duration_hours: duration, // estimated entries are always per-hour
  });

  // Build confidence factors specific to estimated entries (capped)
  const { factors: confidenceFactors, score: confidenceScore } = buildEstimatedConfidence({
    similarTo,
    deviceMeasured: deviceKey !== 'none' && DEVICES[deviceKey]?.kwh > 0,
  });

  // Source list shows the peer activity the estimate was anchored on
  const similarActivity = similarTo ? getActivity(similarTo) : null;
  const sources = similarActivity
    ? [{
        id: similarActivity.source_id,
        title: `Anchored on ${similarActivity.label} — ${similarActivity.source_title}`,
        year: similarActivity.source_year,
      }]
    : [];

  return {
    activity_id: 'estimated',
    activity: `${name}${duration > 1 ? ` (${duration} hours)` : ''}`,
    duration: `${duration} hours`,
    water_ml: calculated.water_ml,
    water_display: calculated.water_display,
    comparison: calculated.comparison,
    comparison_icon: calculated.comparison_icon,
    confidence_score: confidenceScore,
    confidence_factors: confidenceFactors,
    sources,
    editable_params: {
      activity_kwh: clamped.value,
      duration,
      duration_unit: 'hours',
      duration_hours: duration,
      device_key: deviceKey,
      region_key: regionKey,
    },
    refinement_questions: [],
    show_model_comparison: false,
    comparison_type: null,
    calculated,
    approximate: false,
    approximate_note: null,
    // Estimated-tier metadata
    estimated: true,
    estimated_name: name,
    estimated_reasoning: reasoning,
    estimated_similar_to: similarTo,
    estimated_similar_label: similarActivity?.label || null,
    estimated_kwh_clamped: clamped.clamped,
    estimated_kwh_used: clamped.value,
  };
}

/**
 * Build a result object for a general_energy classification — AI-supplied
 * wattage (watts) for any energy-using activity (digital or physical).
 * Converts watts to kWh/hour for the shared recalculate() math.
 */
function buildGeneralEnergyResult(classification) {
  const duration = classification.duration || 1;
  const durationUnit = classification.duration_unit || 'hours';
  const deviceKey = classification.device_hint || 'none';
  const regionKey = classification.region_hint || 'industry_average';
  const name = classification.suggested_activity_name || 'Energy-using activity';
  const energySource = classification.energy_source || null;
  const confidenceNote = classification.confidence_note || 'AI-estimated wattage based on typical device ratings.';

  const clamped = clampGeneralWatts(classification.estimated_watts);
  // watts → kWh per hour
  const kwhPerHour = clamped.value / 1000;

  // For non-hour units we still treat the wattage as hourly power draw and
  // set duration_hours to the numeric duration (e.g. 2 microwave cycles = 2 h
  // would be wrong, so when unit != hours we default duration_hours to duration
  // as a simple per-unit energy cost). The model should prefer hours when possible.
  const durationHours = durationUnit === 'hours' ? duration : duration;

  const calculated = recalculate({
    activity_kwh: kwhPerHour,
    duration: durationHours,
    device_key: deviceKey,
    region_key: regionKey,
    duration_hours: durationHours,
  });

  const { factors: confidenceFactors, score: confidenceScore } = buildGeneralEnergyConfidence({
    energySource,
    deviceMeasured: deviceKey !== 'none' && DEVICES[deviceKey]?.kwh > 0,
  });

  return {
    activity_id: 'general_energy',
    activity: `${name}${duration > 1 ? ` (${duration} ${durationUnit})` : ''}`,
    duration: `${duration} ${durationUnit}`,
    water_ml: calculated.water_ml,
    water_display: calculated.water_display,
    comparison: calculated.comparison,
    comparison_icon: calculated.comparison_icon,
    confidence_score: confidenceScore,
    confidence_factors: confidenceFactors,
    sources: [],
    editable_params: {
      activity_kwh: kwhPerHour,
      duration: durationHours,
      duration_unit: 'hours',
      duration_hours: durationHours,
      device_key: deviceKey,
      region_key: regionKey,
    },
    refinement_questions: [],
    show_model_comparison: false,
    comparison_type: null,
    calculated,
    approximate: false,
    approximate_note: null,
    // General-energy metadata
    general_energy: true,
    general_energy_name: name,
    general_energy_watts: clamped.value,
    general_energy_source: energySource,
    general_energy_note: confidenceNote,
    general_energy_clamped: clamped.clamped,
  };
}

/**
 * Build a full result object from a single classification item.
 * Shared between single-query and comparison modes.
 */
function buildResultFromClassification(classification) {
  // General energy tier — AI-supplied wattage for any energy-using activity
  if (classification.activity_id === 'general_energy') {
    return buildGeneralEnergyResult(classification);
  }

  // Legacy estimated tier — kept for backward compatibility with any
  // classifier responses that still emit the old shape.
  if (classification.estimated === true) {
    return buildEstimatedResult(classification);
  }

  const activity = getActivity(classification.activity_id);
  if (!activity && classification.activity_id !== 'unknown') return null;
  if (classification.activity_id === 'unknown') return null;

  const duration = classification.duration || 1;
  const deviceKey = classification.device_hint || activity.default_device || 'none';
  const regionKey = classification.region_hint || 'industry_average';

  const calculated = recalculate({
    activity_kwh: activity.kwh,
    duration,
    device_key: deviceKey,
    region_key: regionKey,
    duration_hours: activity.unit === 'hours' ? duration : 0,
  });

  const cb = activity.confidence_base;
  const region = REGIONS[regionKey];
  const device = DEVICES[deviceKey];

  const confidenceFactors = {
    energy_source_published: {
      met: cb.energy_published,
      detail: cb.energy_published
        ? `${activity.source_title} (${activity.source_year})`
        : 'No peer-reviewed energy source',
      points: cb.energy_published ? 25 : 0,
    },
    wue_provider_specific: {
      met: false,
      detail: regionKey === 'industry_average'
        ? 'Using industry average WUE (1.8 L/kWh)'
        : `Using ${region?.label || 'regional'} WUE (${region?.wue} L/kWh)`,
      points: 0,
    },
    multi_source_verified: {
      met: cb.multi_source,
      detail: cb.multi_source
        ? 'Verified by multiple independent sources'
        : 'Single source estimate',
      points: cb.multi_source ? 15 : 0,
    },
    direct_not_extrapolated: {
      met: cb.direct_data,
      detail: cb.direct_data
        ? 'Direct measurement data'
        : 'Extrapolated from comparable data',
      points: cb.direct_data ? 15 : 0,
    },
    regional_specific: {
      met: regionKey !== 'industry_average' && region && !region.estimated,
      detail: regionKey === 'industry_average'
        ? 'No region specified, using industry average'
        : `${region?.label || regionKey}${region?.estimated ? ' (estimated WUE)' : ''}`,
      points: regionKey !== 'industry_average' && region && !region.estimated ? 10 : 0,
    },
    data_under_2_years: {
      met: cb.data_recent,
      detail: cb.data_recent
        ? 'Source data is recent'
        : `Source data from ${activity.source_year}`,
      points: cb.data_recent ? 10 : 0,
    },
    device_energy_measured: {
      met: deviceKey !== 'none' && device && device.kwh > 0,
      detail: deviceKey !== 'none' && device
        ? `${device.label} energy from measured wattage data`
        : 'No device energy (server only)',
      points: deviceKey !== 'none' && device && device.kwh > 0 ? 5 : 0,
    },
  };

  const confidenceScore = Object.values(confidenceFactors).reduce((sum, f) => sum + f.points, 0);
  const refinementQuestions = buildRefinementQuestions(activity.suggested_refinements, activity.category);

  const sources = [{ id: activity.source_id, title: activity.source_title, year: activity.source_year }];

  return {
    activity_id: classification.activity_id,
    activity: activity.label + (duration > 1 ? ` (${duration} ${activity.unit})` : ''),
    duration: `${duration} ${activity.unit}`,
    water_ml: calculated.water_ml,
    water_display: calculated.water_display,
    comparison: calculated.comparison,
    comparison_icon: calculated.comparison_icon,
    confidence_score: confidenceScore,
    confidence_factors: confidenceFactors,
    sources,
    editable_params: {
      activity_kwh: activity.kwh,
      duration,
      duration_unit: activity.unit,
      duration_hours: activity.unit === 'hours' ? duration : 0,
      device_key: deviceKey,
      region_key: regionKey,
    },
    refinement_questions: refinementQuestions,
    show_model_comparison: classification.show_model_comparison || !!getComparisonType(classification.activity_id),
    comparison_type: getComparisonType(classification.activity_id),
    // Expose raw calculated values for ComparisonTable
    calculated,
    // Approximate match info (off-catalog activities mapped to nearest match)
    approximate: classification.approximate || false,
    approximate_note: classification.approximate_note || null,
  };
}

/**
 * Parse the classifier's <classify> JSON and build full result(s).
 * Supports both single-activity and comparison modes.
 */
function parseClassifierResponse(text) {
  const classifyMatch = text.match(/<classify>\s*([\s\S]*?)\s*<\/classify>/);
  if (!classifyMatch) return { resultData: null, comparisonItems: null, narrative: text.trim() };

  let classification;
  try {
    classification = JSON.parse(classifyMatch[1]);
  } catch {
    return { resultData: null, comparisonItems: null, narrative: text.trim() };
  }

  const narrative = classification.narrative || '';

  // Greetings — no result
  if (classification.activity_id === 'greeting') {
    return { resultData: null, comparisonItems: null, narrative };
  }

  // COMPARISON MODE: multiple items
  if (classification.comparison === true && Array.isArray(classification.items) && classification.items.length >= 2) {
    const comparisonItems = classification.items
      .slice(0, 5) // cap at 5
      .map(item => buildResultFromClassification(item))
      .filter(Boolean);

    if (comparisonItems.length >= 2) {
      return { resultData: null, comparisonItems, narrative };
    }
    // Fall through to single mode if too many items failed to resolve
  }

  // SINGLE MODE
  // For "unknown" activities, return narrative only
  if (classification.activity_id === 'unknown') {
    return { resultData: null, comparisonItems: null, narrative };
  }

  const resultData = buildResultFromClassification(classification);
  if (!resultData) {
    return {
      resultData: null,
      comparisonItems: null,
      narrative: narrative || `I couldn't find a matching activity for "${classification.activity_id}".`,
    };
  }

  return { resultData, comparisonItems: null, narrative };
}

function buildRefinementQuestions(suggested, category) {
  if (!suggested || suggested.length === 0) return [];

  const questionTemplates = {
    device: {
      id: 'device',
      question: 'What device are you using?',
      type: 'select',
      options: ['Phone', 'Tablet', 'Laptop', 'Desktop PC', '55" LED TV', '65" OLED TV', 'Gaming Console'],
      affects: 'device_kwh',
    },
    region: {
      id: 'region',
      question: 'Where are you located?',
      type: 'select',
      options: [
        'US Northeast', 'US Virginia', 'US Southeast', 'US Chicago', 'US Iowa',
        'US Texas / San Antonio', 'US Southwest', 'US Oregon',
        'Canada', 'UK', 'Germany', 'Southern Europe', 'Northern Europe',
        'Middle East / UAE', 'India / Mumbai', 'Japan', 'South Korea',
        'Southeast Asia', 'Singapore', 'China (coastal)', 'Australia', 'Brazil', 'Africa',
      ],
      affects: 'wue',
    },
    resolution: {
      id: 'resolution',
      question: 'What resolution are you streaming?',
      type: 'select',
      options: ['SD (480p)', 'HD (1080p)', '4K'],
      affects: 'streaming_kwh',
    },
  };

  return suggested
    .filter(key => questionTemplates[key])
    .map(key => questionTemplates[key]);
}

// Legacy parser for any old-format responses
function parseLegacyResponse(text) {
  const resultMatch = text.match(/<water-result>\s*([\s\S]*?)\s*<\/water-result>/);
  if (!resultMatch) return null;
  try {
    return JSON.parse(resultMatch[1]);
  } catch {
    return null;
  }
}

export default function ChatMessage({ message, query, usage, model, onTier2Submit, isRepeatQuery = false, showFollowUps = false, onFollowUpAction = null, followUpsDisabled = false, focusRequest = null, onSuggestCorrection = null }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-mw-water text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Try new classifier format first, fall back to legacy
  let { resultData, comparisonItems, narrative } = parseClassifierResponse(message.content);
  if (!resultData && !comparisonItems) {
    const legacy = parseLegacyResponse(message.content);
    if (legacy) {
      resultData = legacy;
      narrative = message.content.replace(/<water-result>[\s\S]*?<\/water-result>/, '').trim();
    }
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-mw-water-light flex items-center justify-center">
            <WaterDrop size={12} className="text-mw-water" />
          </div>
          <span className="text-xs font-medium text-gray-400">ask makewater</span>
        </div>

        {/* Comparison mode */}
        {comparisonItems && comparisonItems.length >= 2 && (
          <ComparisonTable items={comparisonItems} narrative={narrative} />
        )}

        {/* Single result mode */}
        {resultData && !comparisonItems && (
          <>
            {/* Approximate match notice */}
            {resultData.approximate && resultData.approximate_note && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800 leading-relaxed flex items-start gap-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">~</span>
                <span>{resultData.approximate_note}</span>
              </div>
            )}
            <ResultCard
              data={resultData}
              query={query}
              model={model}
              usage={usage}
              onTier2Submit={onTier2Submit}
              focusRequest={focusRequest}
              onSuggestCorrection={onSuggestCorrection}
            />
          </>
        )}

        {/* Narrative (only show separately if not in comparison mode, which includes it) */}
        {/* For approximate matches with a result card, skip the narrative to avoid duplication */}
        {narrative && !comparisonItems && !(resultData && resultData.approximate) && (
          <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {narrative}
          </div>
        )}

        {/* Follow-up suggestion chips — shown only on the latest result message */}
        {showFollowUps && onFollowUpAction && (resultData || comparisonItems) && (
          <FollowUpChips onAction={onFollowUpAction} disabled={followUpsDisabled} />
        )}

        {usage && (
          <div className="pl-1">
            <MetaCost
              inputTokens={usage.input_tokens}
              outputTokens={usage.output_tokens}
              model={model}
              cacheReadTokens={usage.cache_read_input_tokens}
              isRepeatQuery={isRepeatQuery}
            />
          </div>
        )}
      </div>
    </div>
  );
}

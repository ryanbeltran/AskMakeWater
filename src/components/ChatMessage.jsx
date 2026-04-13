import ResultCard from './ResultCard';
import MetaCost from './MetaCost';
import WaterDrop from './WaterDrop';
import { getActivity } from '../data/activityLookup';
import { recalculate, recalculateConfidence, formatWater, getComparison, DEVICES, REGIONS } from '../data/recalculate';
import { getComparisonType } from '../data/aiModelComparison';

/**
 * Parse the classifier's <classify> JSON and build a full result
 * using client-side data. No math comes from the AI.
 */
function parseClassifierResponse(text) {
  const classifyMatch = text.match(/<classify>\s*([\s\S]*?)\s*<\/classify>/);
  if (!classifyMatch) return { resultData: null, narrative: text.trim() };

  let classification;
  try {
    classification = JSON.parse(classifyMatch[1]);
  } catch {
    return { resultData: null, narrative: text.trim() };
  }

  const narrative = classification.narrative || '';

  // Greetings or unknown — no result card
  if (classification.activity_id === 'greeting') {
    return { resultData: null, narrative };
  }

  // Look up activity in our local catalog
  const activity = getActivity(classification.activity_id);
  if (!activity && classification.activity_id !== 'unknown') {
    return {
      resultData: null,
      narrative: narrative || `I couldn't find a matching activity for "${classification.activity_id}".`,
    };
  }

  // For "unknown" activities, return a message with no result card
  if (classification.activity_id === 'unknown') {
    return { resultData: null, narrative };
  }

  // Extract parameters from classification
  const duration = classification.duration || 1;
  const deviceKey = classification.device_hint || activity.default_device || 'none';
  const regionKey = classification.region_hint || 'industry_average';

  // Calculate water cost deterministically
  const calculated = recalculate({
    activity_kwh: activity.kwh,
    duration,
    device_key: deviceKey,
    region_key: regionKey,
    duration_hours: activity.unit === 'hours' ? duration : 0,
  });

  // Build confidence factors from activity's confidence_base
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

  // Build refinement questions from activity's suggested_refinements
  const refinementQuestions = buildRefinementQuestions(activity.suggested_refinements, activity.category);

  // Build sources
  const sources = activity.source_id !== 'estimated' && activity.source_id !== 'various'
    ? [{ id: activity.source_id, title: activity.source_title, year: activity.source_year }]
    : [{ id: activity.source_id, title: activity.source_title, year: activity.source_year }];

  const resultData = {
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
    // AI model comparison
    show_model_comparison: classification.show_model_comparison || !!getComparisonType(classification.activity_id),
    comparison_type: getComparisonType(classification.activity_id),
  };

  return { resultData, narrative };
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

export default function ChatMessage({ message, query, usage, model, onTier2Submit }) {
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
  let { resultData, narrative } = parseClassifierResponse(message.content);
  if (!resultData) {
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

        {resultData && (
          <ResultCard
            data={resultData}
            query={query}
            model={model}
            usage={usage}
            onTier2Submit={onTier2Submit}
          />
        )}

        {narrative && (
          <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {narrative}
          </div>
        )}

        {usage && (
          <div className="pl-1">
            <MetaCost
              inputTokens={usage.input_tokens}
              outputTokens={usage.output_tokens}
              model={model}
              cacheReadTokens={usage.cache_read_input_tokens}
            />
          </div>
        )}
      </div>
    </div>
  );
}

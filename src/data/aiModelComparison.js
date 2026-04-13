/**
 * AI model comparison data.
 *
 * Energy values in watt-hours (Wh) per operation.
 * To convert to water: water_ml = wh * wue (L/kWh)
 *   because: (wh/1000 kWh) * wue (L/kWh) * 1000 (mL/L) = wh * wue
 *
 * Confidence:
 *   "medium" — self-reported by the provider or from peer-reviewed research
 *   "low"    — third-party estimate, extrapolated, or based on limited data
 *
 * IMPORTANT: Most AI companies don't publish per-query energy data.
 * These estimates are based on the best available research and vary in confidence.
 * Google's Gemini figure is self-reported. Most others are third-party estimates.
 */

export const AI_MODEL_COMPARISON = {
  text_query: {
    label: 'Text query (single prompt + response)',
    models: {
      gpt4: {
        label: 'GPT-4 / GPT-4o',
        wh: 2.9,
        confidence: 'medium',
        provider: 'OpenAI / Microsoft Azure',
        typical_regions: ['us_virginia', 'us_iowa'],
      },
      gpt4o_mini: {
        label: 'GPT-4o mini',
        wh: 0.5,
        confidence: 'low',
        provider: 'OpenAI / Microsoft Azure',
        typical_regions: ['us_virginia', 'us_iowa'],
      },
      claude_sonnet: {
        label: 'Claude Sonnet',
        wh: 1.5,
        confidence: 'low',
        provider: 'Anthropic / AWS + GCP',
        typical_regions: ['us_virginia', 'us_oregon'],
      },
      claude_haiku: {
        label: 'Claude Haiku',
        wh: 0.3,
        confidence: 'low',
        provider: 'Anthropic / AWS + GCP',
        typical_regions: ['us_virginia', 'us_oregon'],
      },
      gemini: {
        label: 'Google Gemini',
        wh: 0.24,
        confidence: 'medium',
        provider: 'Google',
        typical_regions: ['us_oregon', 'us_iowa'],
        note: 'Self-reported by Google in their 2025 environmental report.',
      },
      grok: {
        label: 'Grok (xAI)',
        wh: 2.0,
        confidence: 'low',
        provider: 'xAI',
        typical_regions: ['us_southeast'],
        note: 'xAI operates a large GPU cluster in Memphis, TN.',
      },
      llama_local: {
        label: 'Llama (local)',
        wh: 3.0,
        confidence: 'low',
        provider: 'Local hardware',
        note: 'Highly variable based on GPU. No data center water, but grid water applies.',
      },
    },
  },

  image_generation: {
    label: 'Image generation (1 image)',
    models: {
      dall_e: {
        label: 'DALL-E 3',
        wh: 1.0,
        confidence: 'low',
        provider: 'OpenAI / Microsoft Azure',
        typical_regions: ['us_virginia', 'us_iowa'],
      },
      midjourney: {
        label: 'Midjourney',
        wh: 0.8,
        confidence: 'low',
        provider: 'Midjourney / Google Cloud',
        typical_regions: ['us_oregon', 'us_iowa'],
      },
      stable_diffusion_cloud: {
        label: 'Stable Diffusion (cloud)',
        wh: 0.6,
        confidence: 'low',
        provider: 'Various cloud providers',
        typical_regions: ['us_virginia', 'us_oregon'],
      },
      stable_diffusion_local: {
        label: 'Stable Diffusion (local)',
        wh: 1.5,
        confidence: 'low',
        provider: 'Local hardware',
        note: 'Running on consumer GPU. No data center water, but higher per-image energy.',
      },
    },
  },

  video_generation: {
    label: 'Video generation (5-second clip)',
    models: {
      sora: {
        label: 'Sora (OpenAI)',
        wh: 1000,
        confidence: 'low',
        provider: 'OpenAI',
        typical_regions: ['us_virginia', 'us_iowa'],
        note: 'Approximately 1 kWh for a 5-second clip. Very energy-intensive.',
      },
      runway: {
        label: 'Runway Gen-3',
        wh: 500,
        confidence: 'low',
        provider: 'Runway',
        typical_regions: ['us_virginia'],
        note: 'Estimated at roughly half of Sora based on model size.',
      },
    },
  },
};

// Map activity IDs to comparison types
const ACTIVITY_TO_COMPARISON = {
  chatgpt_single_query: 'text_query',
  chatgpt_conversation: 'text_query', // show per-query comparison for context
  google_gemini_query: 'text_query',
  ai_image_generation: 'image_generation',
  ai_video_generation_5sec: 'video_generation',
};

/**
 * Get the comparison type for an activity, if applicable.
 */
export function getComparisonType(activityId) {
  return ACTIVITY_TO_COMPARISON[activityId] || null;
}

/**
 * Get comparison data for a type.
 */
export function getComparisonData(type) {
  return AI_MODEL_COMPARISON[type] || null;
}

/**
 * Calculate water cost for all models of a given type.
 * @param {string} type - 'text_query', 'image_generation', 'video_generation'
 * @param {number} wue - Water Usage Effectiveness (L/kWh)
 * @param {number} count - Number of operations (default 1)
 * @returns {Array<{key, label, water_ml, wh, confidence, provider, typical_regions, note}>}
 */
export function calculateModelComparison(type, wue = 1.8, count = 1) {
  const data = AI_MODEL_COMPARISON[type];
  if (!data) return [];

  return Object.entries(data.models)
    .map(([key, model]) => ({
      key,
      label: model.label,
      water_ml: model.wh * wue * count,
      wh: model.wh * count,
      confidence: model.confidence,
      provider: model.provider,
      typical_regions: model.typical_regions || [],
      note: model.note || null,
    }))
    .sort((a, b) => a.water_ml - b.water_ml);
}

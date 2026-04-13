import Anthropic from '@anthropic-ai/sdk';
import buildClassifierPrompt from './systemPrompt.js';

// Lightweight catalog for the classifier prompt (no energy data, just IDs/labels)
const ACTIVITY_CATALOG = [
  { id: 'chatgpt_single_query', label: 'ChatGPT query (single)', unit: 'queries', default_device: 'none' },
  { id: 'chatgpt_conversation', label: 'ChatGPT conversation (20-50 exchanges)', unit: 'conversations', default_device: 'none' },
  { id: 'google_gemini_query', label: 'Google Gemini text query', unit: 'queries', default_device: 'none' },
  { id: 'ai_image_generation', label: 'AI image generation (1 image)', unit: 'images', default_device: 'none' },
  { id: 'ai_video_generation_5sec', label: 'AI video generation (5 seconds)', unit: 'clips', default_device: 'none' },
  { id: 'google_search', label: 'Google search', unit: 'searches', default_device: 'none' },
  { id: 'google_ai_overview_search', label: 'Google AI Overview search', unit: 'searches', default_device: 'none' },
  { id: 'netflix_hd_per_hour', label: 'Netflix HD streaming', unit: 'hours', default_device: 'tv_55_led' },
  { id: 'netflix_4k_per_hour', label: 'Netflix 4K streaming', unit: 'hours', default_device: 'tv_65_oled' },
  { id: 'youtube_hd_per_hour', label: 'YouTube HD streaming', unit: 'hours', default_device: 'phone' },
  { id: 'youtube_sd_per_hour', label: 'YouTube SD streaming', unit: 'hours', default_device: 'phone' },
  { id: 'tiktok_per_hour', label: 'TikTok scrolling', unit: 'hours', default_device: 'phone' },
  { id: 'zoom_video_call_per_hour', label: 'Zoom video call', unit: 'hours', default_device: 'laptop' },
  { id: 'facebook_per_hour', label: 'Facebook scrolling', unit: 'hours', default_device: 'phone' },
  { id: 'instagram_per_hour', label: 'Instagram scrolling', unit: 'hours', default_device: 'phone' },
  { id: 'twitter_per_hour', label: 'X (Twitter) scrolling', unit: 'hours', default_device: 'phone' },
  { id: 'snapchat_per_hour', label: 'Snapchat usage', unit: 'hours', default_device: 'phone' },
  { id: 'email_regular', label: 'Email (no attachment)', unit: 'emails', default_device: 'none' },
  { id: 'email_with_attachment', label: 'Email (with large attachment)', unit: 'emails', default_device: 'none' },
  { id: 'cloud_gaming_per_hour', label: 'Cloud gaming (server + device)', unit: 'hours', default_device: 'console' },
  { id: 'console_gaming_per_hour', label: 'Console gaming (offline)', unit: 'hours', default_device: 'console' },
  { id: 'mobile_gaming_per_hour', label: 'Mobile gaming', unit: 'hours', default_device: 'phone' },
  { id: 'bitcoin_transaction', label: 'Bitcoin transaction', unit: 'transactions', default_device: 'none' },
  { id: 'ethereum_transaction', label: 'Ethereum transaction (post-Merge)', unit: 'transactions', default_device: 'none' },
];

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';
const TIER2_MODEL = 'claude-sonnet-4-20250514';

async function callWithRetry(client, params, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.messages.create(params);
    } catch (error) {
      const status = error.status || error.statusCode;
      if ((status === 529 || status === 429) && i < retries) {
        const delay = (i + 1) * 2000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    return res.status(500).json({ error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY in your environment variables.' });
  }

  const { messages, max_tokens, tier2 } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const client = new Anthropic({ apiKey });

    // Tier 2 uses Sonnet for nuanced reasoning
    const isTier2 = tier2 === true;
    const model = isTier2 ? TIER2_MODEL : CLASSIFIER_MODEL;

    const systemPrompt = isTier2
      ? 'You are a water cost expert for MakeWater, a 501(c)(3) nonprofit. Provide brief, helpful refinements to water cost estimates. Be concise (2-3 sentences). Do NOT return JSON or structured data.'
      : buildClassifierPrompt(ACTIVITY_CATALOG);

    const response = await callWithRetry(client, {
      model,
      max_tokens: max_tokens || (isTier2 ? 500 : 1024),
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const cacheRead = response.usage?.cache_read_input_tokens || 0;
    const cacheCreation = response.usage?.cache_creation_input_tokens || 0;

    return res.status(200).json({
      text,
      model,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheCreation,
      },
    });
  } catch (error) {
    console.error('Anthropic API error:', error);

    const status = error.status || error.statusCode;
    if (status === 529) {
      return res.status(503).json({
        error: 'Our AI is temporarily overloaded. Please try again in a moment.',
      });
    }
    if (status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Please wait a few seconds and try again.',
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to get response from Claude',
    });
  }
}

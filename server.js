// Local dev server for API routes (not needed on Vercel)
// Usage: node server.js
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import buildClassifierPrompt from './api/systemPrompt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {}

// Lightweight catalog (same as api/chat.js)
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

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Usage tracking endpoint
  if (req.url === '/api/usage') {
    return handleUsage(req, res);
  }

  // Admin auth endpoint
  if (req.url === '/api/admin-auth') {
    return handleAdminAuth(req, res);
  }

  if (req.url !== '/api/chat') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Set ANTHROPIC_API_KEY in .env.local' }));
  }

  try {
    const { messages, max_tokens, tier2 } = JSON.parse(body);
    const client = new Anthropic({ apiKey });

    const isTier2 = tier2 === true;
    const model = isTier2 ? TIER2_MODEL : CLASSIFIER_MODEL;

    const systemPrompt = isTier2
      ? 'You are a water cost expert for MakeWater, a 501(c)(3) nonprofit. Provide brief, helpful refinements to water cost estimates. Be concise (2-3 sentences). Do NOT return JSON or structured data.'
      : buildClassifierPrompt(ACTIVITY_CATALOG);

    const response = await client.messages.create({
      model,
      max_tokens: max_tokens || (isTier2 ? 500 : 1024),
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      text,
      model,
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
        cache_read_input_tokens: response.usage?.cache_read_input_tokens || 0,
        cache_creation_input_tokens: response.usage?.cache_creation_input_tokens || 0,
      },
    }));
  } catch (err) {
    console.error('API error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

// In-memory usage store (same logic as api/usage.js)
let usageStore = {
  date: new Date().toISOString().slice(0, 10),
  total_ml: 0,
  query_count: 0,
  recent: [],   // public: query + timestamp only
  stats: [],    // private: full analytics
};

async function handleUsage(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  if (usageStore.date !== today) {
    usageStore = { date: today, total_ml: 0, query_count: 0, recent: [], stats: [] };
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      date: usageStore.date,
      total_ml: Math.round(usageStore.total_ml * 10) / 10,
      max_ml: 500,
      query_count: usageStore.query_count,
      bottle_full: usageStore.total_ml >= 500,
      recent: usageStore.recent,
    }));
  }

  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);

    const publicEntry = {
      query: String(data.query || '').slice(0, 200),
      timestamp: Date.now(),
    };

    const statEntry = {
      query: String(data.query || '').slice(0, 200),
      activity_id: data.activity_id || 'unknown',
      water_ml: Math.round((data.water_ml || 0) * 100) / 100,
      tokens: data.tokens || 0,
      zip_code: data.zip_code || null,
      region: data.region || null,
      device: data.device || null,
      timestamp: Date.now(),
    };

    usageStore.total_ml += data.water_ml || 0;
    usageStore.query_count += 1;
    usageStore.recent.unshift(publicEntry);
    usageStore.stats.unshift(statEntry);
    if (usageStore.recent.length > 10) usageStore.recent = usageStore.recent.slice(0, 10);
    if (usageStore.stats.length > 200) usageStore.stats = usageStore.stats.slice(0, 200);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      total_ml: Math.round(usageStore.total_ml * 10) / 10,
      max_ml: 500,
      query_count: usageStore.query_count,
      bottle_full: usageStore.total_ml >= 500,
    }));
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

async function handleAdminAuth(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  const { password } = JSON.parse(body);
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'ADMIN_PASSWORD not configured' }));
  }
  if (password === adminPassword) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  res.writeHead(401, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Invalid password' }));
}

server.listen(3001, () => {
  console.log('API server running at http://localhost:3001');
});

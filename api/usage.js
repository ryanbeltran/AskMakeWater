/**
 * Server-side usage tracking for the global water bottle.
 *
 * GET  /api/usage — returns today's cumulative usage + recent queries
 * POST /api/usage — reports a new query's water cost
 *
 * Storage: in-memory (persists across warm Vercel invocations).
 * Resets on cold start or deploy. For production, upgrade to
 * Vercel KV, Upstash Redis, or a database.
 */

const MAX_RECENT = 10;
const DAILY_BOTTLE_ML = 500;

// Module-level store — survives warm starts on Vercel
let store = {
  date: new Date().toISOString().slice(0, 10),
  total_ml: 0,
  query_count: 0,
  recent: [],   // public: query text + timestamp only
  stats: [],    // private: full analytics (zip, region, device, tokens, etc.)
};

function resetIfNewDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (store.date !== today) {
    store = { date: today, total_ml: 0, query_count: 0, recent: [] };
  }
}

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  resetIfNewDay();

  if (req.method === 'GET') {
    return res.status(200).json({
      date: store.date,
      total_ml: Math.round(store.total_ml * 10) / 10,
      max_ml: DAILY_BOTTLE_ML,
      query_count: store.query_count,
      bottle_full: store.total_ml >= DAILY_BOTTLE_ML,
      recent: store.recent,
    });
  }

  if (req.method === 'POST') {
    const { query, water_ml, tokens, activity_id, zip_code, region, device } = req.body || {};

    if (!query || water_ml === undefined) {
      return res.status(400).json({ error: 'query and water_ml are required' });
    }

    // Public entry — only the query text and timestamp
    const publicEntry = {
      query: String(query).slice(0, 200),
      timestamp: Date.now(),
    };

    // Private stats — full analytics, never returned to clients
    const statEntry = {
      query: String(query).slice(0, 200),
      activity_id: activity_id || 'unknown',
      water_ml: Math.round(water_ml * 100) / 100,
      tokens: tokens || 0,
      zip_code: zip_code || null,
      region: region || null,
      device: device || null,
      timestamp: Date.now(),
    };

    store.total_ml += water_ml;
    store.query_count += 1;
    store.recent.unshift(publicEntry);
    store.stats.unshift(statEntry);
    if (store.recent.length > MAX_RECENT) {
      store.recent = store.recent.slice(0, MAX_RECENT);
    }
    if (store.stats.length > 200) {
      store.stats = store.stats.slice(0, 200);
    }

    return res.status(200).json({
      total_ml: Math.round(store.total_ml * 10) / 10,
      max_ml: DAILY_BOTTLE_ML,
      query_count: store.query_count,
      bottle_full: store.total_ml >= DAILY_BOTTLE_ML,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

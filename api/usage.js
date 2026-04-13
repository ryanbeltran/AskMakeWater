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
  recent: [], // newest first
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
    const { query, activity_id, water_ml, water_display, comparison, comparison_icon } = req.body || {};

    if (!query || water_ml === undefined) {
      return res.status(400).json({ error: 'query and water_ml are required' });
    }

    const entry = {
      query: String(query).slice(0, 200), // truncate long queries
      activity_id: activity_id || 'unknown',
      water_ml: Math.round(water_ml * 10) / 10,
      water_display: water_display || `~${Math.round(water_ml)} mL`,
      comparison: comparison || '',
      comparison_icon: comparison_icon || 'drop',
      timestamp: Date.now(),
    };

    store.total_ml += water_ml;
    store.query_count += 1;
    store.recent.unshift(entry);
    if (store.recent.length > MAX_RECENT) {
      store.recent = store.recent.slice(0, MAX_RECENT);
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

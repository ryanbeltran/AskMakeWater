/**
 * Server-side usage tracking for the global water bottle.
 *
 * GET  /api/usage — returns today's cumulative usage + recent queries
 * POST /api/usage — reports a new query's water cost
 *
 * Storage: Upstash Redis (persists across deploys and cold starts).
 * Falls back to in-memory for local dev when Redis env vars are not set.
 */

import { Redis } from '@upstash/redis';

const MAX_RECENT = 10;
const DAILY_BOTTLE_ML = 500;

// --- Redis client (only created if env vars exist) ---
let redis = null;
function getRedis() {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }
  return null;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// --- Redis-backed storage ---
async function getStoreFromRedis(r) {
  const key = `usage:${todayKey()}`;
  const data = await r.get(key);
  if (data && typeof data === 'object') return data;
  return { date: todayKey(), total_ml: 0, query_count: 0, recent: [], stats: [] };
}

async function saveStoreToRedis(r, store) {
  const key = `usage:${todayKey()}`;
  // Expire at end of day + 1 hour buffer (max 25 hours)
  await r.set(key, store, { ex: 90000 });
}

// --- In-memory fallback for local dev ---
let memStore = {
  date: todayKey(),
  total_ml: 0,
  query_count: 0,
  recent: [],
  stats: [],
};

function getMemStore() {
  const today = todayKey();
  if (memStore.date !== today) {
    memStore = { date: today, total_ml: 0, query_count: 0, recent: [], stats: [] };
  }
  return memStore;
}

// --- Handler ---
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const r = getRedis();

  if (req.method === 'GET') {
    const store = r ? await getStoreFromRedis(r) : getMemStore();
    return res.status(200).json({
      date: store.date,
      total_ml: Math.round((store.total_ml || 0) * 10) / 10,
      max_ml: DAILY_BOTTLE_ML,
      query_count: store.query_count || 0,
      bottle_full: (store.total_ml || 0) >= DAILY_BOTTLE_ML,
      recent: store.recent || [],
    });
  }

  if (req.method === 'POST') {
    const { query, water_ml, tokens, activity_id, zip_code, region, device } = req.body || {};

    if (!query || water_ml === undefined) {
      return res.status(400).json({ error: 'query and water_ml are required' });
    }

    const publicEntry = {
      query: String(query).slice(0, 200),
      timestamp: Date.now(),
    };

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

    const store = r ? await getStoreFromRedis(r) : getMemStore();

    store.total_ml = (store.total_ml || 0) + water_ml;
    store.query_count = (store.query_count || 0) + 1;
    store.recent = store.recent || [];
    store.stats = store.stats || [];
    store.recent.unshift(publicEntry);
    store.stats.unshift(statEntry);
    if (store.recent.length > MAX_RECENT) {
      store.recent = store.recent.slice(0, MAX_RECENT);
    }
    if (store.stats.length > 200) {
      store.stats = store.stats.slice(0, 200);
    }

    if (r) {
      await saveStoreToRedis(r, store);
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

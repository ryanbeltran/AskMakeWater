/**
 * Public reference data endpoint (GET only, unauthenticated).
 *
 * Returns all reference datasets whose visibility is 'cited' or 'attributed'.
 * Drafts are excluded — they must never influence public calculations.
 *
 * Response shape:
 * {
 *   power_sources: [{ id, slug, name, visibility, data: [...] }, ...],
 *   cooling_methods: [...],
 *   regional_wue: [...],
 *   activity_energy: [...],
 *   other: [...],
 *   generated_at: 173...
 * }
 *
 * Caching:
 * - Server: 5-minute in-memory TTL, keyed off module scope. Subsequent calls
 *   within the TTL window skip Redis entirely.
 * - Response also sets `Cache-Control: public, s-maxage=300, stale-while-revalidate=300`
 *   so Vercel's edge cache can hold it too.
 * - The frontend fetches this once per session (see src/data/referenceDataClient.js).
 *
 * If Redis is unreachable, returns an empty structured payload with HTTP 200 so
 * the frontend can fall back to hardcoded defaults cleanly — the calculator must
 * never break because reference data is unavailable.
 */

import { Redis } from '@upstash/redis';

const KEY_PREFIX = 'reference:';
const CATEGORIES = ['power_sources', 'cooling_methods', 'regional_wue', 'activity_energy', 'other'];
const TTL_MS = 5 * 60 * 1000;

let redisClient = null;
function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisClient = new Redis({ url, token });
    return redisClient;
  }
  return null;
}

let cache = { payload: null, expires: 0 };

function emptyPayload() {
  const p = { generated_at: Date.now() };
  for (const cat of CATEGORIES) p[cat] = [];
  return p;
}

function minimizeDataset(ds) {
  return {
    id: ds.id,
    slug: ds.slug,
    name: ds.name,
    category: ds.category,
    visibility: ds.visibility,
    data: ds.data || [],
    source_type: ds.source_type || null,
    source_citation: ds.source_citation || '',
    source_url: ds.source_url || '',
    year: ds.source_fields?.year || null,
  };
}

async function loadFromRedis(r) {
  const payload = emptyPayload();
  try {
    const keys = await r.keys(`${KEY_PREFIX}*`);
    if (!keys || keys.length === 0) return payload;
    const values = await r.mget(...keys);
    for (const v of values) {
      if (!v || typeof v !== 'object') continue;
      if (v.visibility === 'draft') continue;
      const cat = v.category;
      if (!CATEGORIES.includes(cat)) continue;
      payload[cat].push(minimizeDataset(v));
    }
    for (const cat of CATEGORIES) {
      payload[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  } catch (err) {
    // Swallow — return whatever we have (possibly empty). The frontend falls back.
    console.warn('[referenceData] Redis load failed:', err.message);
  }
  return payload;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const now = Date.now();
  if (cache.payload && cache.expires > now) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
    res.setHeader('X-Cache', 'hit');
    return res.status(200).json(cache.payload);
  }

  const r = getRedis();
  let payload;
  if (r) {
    payload = await loadFromRedis(r);
  } else {
    payload = emptyPayload();
  }

  cache = { payload, expires: now + TTL_MS };

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
  res.setHeader('X-Cache', 'miss');
  return res.status(200).json(payload);
}

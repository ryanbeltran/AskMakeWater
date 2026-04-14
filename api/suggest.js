/**
 * Suggestions + corrections learning pipeline.
 *
 * POST /api/suggest — body `{ type: 'suggestion' | 'correction', ... }`
 *   type=suggestion: logged when the classifier returns an estimated-tier
 *     result. Upserts a `suggestion:<slug>` key with count and first/last seen.
 *   type=correction: logged when a user submits a correction form on an
 *     estimated result. Appended to the `corrections:<slug>` list.
 *
 * GET  /api/suggest — admin-auth'd; returns all suggestions + their corrections.
 *
 * Storage: Upstash Redis. Falls back to in-memory for local dev when env vars
 * are not set (same pattern as api/usage.js).
 *
 * Guardrails:
 *   - kWh values are clamped to [0.001, 50] at store time in case the frontend
 *     sent an unclamped value.
 *   - Activity names and string fields are truncated.
 *   - Suggestions never auto-promote to the verified catalog; admin review is
 *     required and happens out-of-band via /admin.
 */

import { Redis } from '@upstash/redis';

const KWH_MIN = 0.001;
const KWH_MAX = 50;
const MAX_CORRECTIONS_PER_SLUG = 50;
const SUGGESTION_KEY_PREFIX = 'suggestion:';
const CORRECTION_KEY_PREFIX = 'corrections:';

// --- Redis client ---
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

// --- In-memory fallback for local dev ---
const memStore = {
  suggestions: new Map(), // slug -> entry
  corrections: new Map(), // slug -> array
};

// --- Helpers ---
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'unknown';
}

function clampKwh(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return KWH_MIN;
  if (n < KWH_MIN) return KWH_MIN;
  if (n > KWH_MAX) return KWH_MAX;
  return n;
}

function trunc(str, max = 500) {
  return String(str || '').slice(0, max);
}

async function upsertSuggestion(r, payload) {
  const slug = slugify(payload.suggested_activity_name);
  const key = `${SUGGESTION_KEY_PREFIX}${slug}`;
  const now = Date.now();

  let existing = null;
  if (r) {
    existing = await r.get(key);
  } else {
    existing = memStore.suggestions.get(slug) || null;
  }

  const entry = existing && typeof existing === 'object' ? existing : {
    slug,
    name: trunc(payload.suggested_activity_name, 120),
    count: 0,
    first_seen: now,
    last_seen: now,
    approved: false,
  };

  entry.count = (entry.count || 0) + 1;
  entry.last_seen = now;
  entry.last_kwh = clampKwh(payload.estimated_kwh_per_hour);
  entry.last_reasoning = trunc(payload.reasoning, 400);
  entry.last_similar_to = trunc(payload.similar_to, 60);
  entry.last_query = trunc(payload.query, 200);

  if (r) {
    await r.set(key, entry);
  } else {
    memStore.suggestions.set(slug, entry);
  }

  return entry;
}

async function appendCorrection(r, payload) {
  const slug = slugify(payload.suggested_activity_name || payload.slug);
  const key = `${CORRECTION_KEY_PREFIX}${slug}`;
  const correction = {
    submitted_at: Date.now(),
    activity_name: trunc(payload.activity_name || payload.suggested_activity_name, 120),
    suggested_kwh: payload.suggested_kwh !== undefined ? clampKwh(payload.suggested_kwh) : null,
    source_url: trunc(payload.source_url, 500),
    notes: trunc(payload.notes, 1000),
  };

  if (r) {
    let list = (await r.get(key)) || [];
    if (!Array.isArray(list)) list = [];
    list.unshift(correction);
    if (list.length > MAX_CORRECTIONS_PER_SLUG) list = list.slice(0, MAX_CORRECTIONS_PER_SLUG);
    await r.set(key, list);
  } else {
    const list = memStore.corrections.get(slug) || [];
    list.unshift(correction);
    if (list.length > MAX_CORRECTIONS_PER_SLUG) list.length = MAX_CORRECTIONS_PER_SLUG;
    memStore.corrections.set(slug, list);
  }

  return { slug, correction };
}

async function listAll(r) {
  let suggestions = [];
  let correctionsBySlug = {};

  if (r) {
    const sKeys = await r.keys(`${SUGGESTION_KEY_PREFIX}*`);
    if (sKeys.length > 0) {
      const values = await r.mget(...sKeys);
      suggestions = values.filter(v => v && typeof v === 'object');
    }
    const cKeys = await r.keys(`${CORRECTION_KEY_PREFIX}*`);
    if (cKeys.length > 0) {
      const values = await r.mget(...cKeys);
      cKeys.forEach((k, i) => {
        const slug = k.replace(CORRECTION_KEY_PREFIX, '');
        if (Array.isArray(values[i])) correctionsBySlug[slug] = values[i];
      });
    }
  } else {
    suggestions = [...memStore.suggestions.values()];
    correctionsBySlug = Object.fromEntries(memStore.corrections);
  }

  suggestions.sort((a, b) => (b.count || 0) - (a.count || 0));
  return { suggestions, correctionsBySlug };
}

function isAuthorizedAdmin(req) {
  const token = req.headers?.authorization?.replace(/^Bearer\s+/i, '') || req.headers?.['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN;
  return expected && token && token === expected;
}

// --- Handler ---
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const r = getRedis();

  if (req.method === 'POST') {
    const body = req.body || {};
    const type = body.type;

    if (type === 'suggestion') {
      if (!body.suggested_activity_name) {
        return res.status(400).json({ error: 'suggested_activity_name is required' });
      }
      const entry = await upsertSuggestion(r, body);
      return res.status(200).json({ ok: true, entry });
    }

    if (type === 'correction') {
      if (!body.suggested_activity_name && !body.slug) {
        return res.status(400).json({ error: 'suggested_activity_name or slug is required' });
      }
      const result = await appendCorrection(r, body);
      return res.status(200).json({ ok: true, ...result });
    }

    return res.status(400).json({ error: 'type must be "suggestion" or "correction"' });
  }

  if (req.method === 'GET') {
    if (!isAuthorizedAdmin(req)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const data = await listAll(r);
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

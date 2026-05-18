/**
 * api/stat.js — Anonymous aggregate analytics endpoint.
 *
 * POST /api/stat { event, subkey? }
 *
 * Increments three Redis counters per event:
 *   stats:counter:{event}[:{subkey}]      — lifetime total (no expiry)
 *   stats:daily:{event}[:{subkey}]:{date}  — per-day (90-day TTL)
 *   stats:weekly:{event}[:{subkey}]:{week}  — per-week (2-year TTL)
 *
 * GET /api/stat?password=...
 *   Returns all stats for the admin dashboard.
 *
 * Rate limit: 60 events per IP per minute via Redis sliding window.
 * No PII stored beyond ephemeral rate-limit keys.
 */

import { Redis } from '@upstash/redis';

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 60;    // events per window
const DAILY_TTL = 90 * 24 * 60 * 60;   // 90 days
const WEEKLY_TTL = 2 * 365 * 24 * 60 * 60; // ~2 years

const VALID_EVENTS = new Set([
  'page_view',
  'query_submitted',
  'zip_entered',
  'journey_expanded',
  'deep_research_started',
  'sponsor_page_visit',
  'feedback_clicked',
]);

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thisWeek() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const r = getRedis();

  // ── GET: Admin stats read ──────────────────────────────────────
  if (req.method === 'GET') {
    const password = req.headers['x-admin-password'] || req.query?.password || '';
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!r) return res.status(200).json({ counters: {}, daily: {} });

    try {
      // Scan for all counter keys
      const counters = {};
      let cursor = 0;
      do {
        const [next, keys] = await r.scan(cursor, { match: 'stats:counter:*', count: 200 });
        cursor = next;
        if (keys.length > 0) {
          const values = await r.mget(...keys);
          keys.forEach((k, i) => {
            const label = k.replace('stats:counter:', '');
            counters[label] = parseInt(values[i], 10) || 0;
          });
        }
      } while (cursor !== 0);

      // Fetch last 30 days for each known event
      const dailyData = {};
      const dateStr = today();
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      dates.reverse();

      // Collect all event keys (unique events from counters)
      const eventKeys = Object.keys(counters);
      for (const eventKey of eventKeys) {
        const dailyKeys = dates.map(d => `stats:daily:${eventKey}:${d}`);
        const vals = dailyKeys.length > 0 ? await r.mget(...dailyKeys) : [];
        dailyData[eventKey] = dates.map((d, i) => ({
          date: d,
          count: parseInt(vals[i], 10) || 0,
        }));
      }

      return res.status(200).json({ counters, daily: dailyData, dates });
    } catch (err) {
      return res.status(500).json({ error: 'Redis read failed' });
    }
  }

  // ── POST: Increment counters ───────────────────────────────────
  if (req.method === 'POST') {
    const { event, subkey } = req.body || {};

    if (!event || !VALID_EVENTS.has(event)) {
      return res.status(400).json({ error: 'Invalid event' });
    }

    // Sanitize subkey
    const cleanSubkey = subkey ? String(subkey).replace(/[^a-zA-Z0-9_\-\/]/g, '').slice(0, 50) : null;
    const fullKey = cleanSubkey ? `${event}:${cleanSubkey}` : event;

    if (!r) {
      // No Redis — silently accept
      return res.status(204).end();
    }

    try {
      // Rate limit check
      const ip = clientIp(req);
      const rlKey = `stats:rl:${ip}`;
      const rlCount = await r.incr(rlKey);
      if (rlCount === 1) {
        await r.expire(rlKey, RATE_LIMIT_WINDOW);
      }
      if (rlCount > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Rate limited' });
      }

      const dateKey = today();
      const weekKey = thisWeek();

      // Increment all three counters in a pipeline
      const pipeline = r.pipeline();
      pipeline.incr(`stats:counter:${fullKey}`);
      pipeline.incr(`stats:daily:${fullKey}:${dateKey}`);
      pipeline.incr(`stats:weekly:${fullKey}:${weekKey}`);
      // Set TTLs (only if key is new — use expire, not expireat)
      pipeline.expire(`stats:daily:${fullKey}:${dateKey}`, DAILY_TTL);
      pipeline.expire(`stats:weekly:${fullKey}:${weekKey}`, WEEKLY_TTL);
      await pipeline.exec();

      return res.status(204).end();
    } catch {
      // Silently accept on Redis error — never block user
      return res.status(204).end();
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

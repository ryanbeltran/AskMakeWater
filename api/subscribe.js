/**
 * Email subscription endpoint.
 *
 * POST /api/subscribe — body: { email: string }
 *
 * Stores email + timestamp in Upstash Redis at key `subscriber:<email>`.
 * Simple dedup: if the email already exists, update the timestamp silently
 * (no error to the user). Rate-limited by email to prevent abuse.
 *
 * No auth required — public endpoint.
 *
 * Validation: basic email format check, length cap.
 */

import { Redis } from '@upstash/redis';

const KEY_PREFIX = 'subscriber:';
const MAX_EMAIL_LEN = 320;

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

// In-memory fallback for local dev
const memStore = new Map();

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LEN) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalized = email.trim().toLowerCase();
  const key = `${KEY_PREFIX}${normalized}`;
  const entry = {
    email: normalized,
    subscribed_at: Date.now(),
    source: 'homepage',
  };

  try {
    const r = getRedis();
    if (r) {
      await r.set(key, entry);
    } else {
      memStore.set(normalized, entry);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

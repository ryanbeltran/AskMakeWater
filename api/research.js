/**
 * Deep-research endpoint: Sonnet + web_search for low-confidence results.
 *
 * POST /api/research
 *   Body: { query, current_watts, current_duration_seconds }
 *   Returns: { proposed_watts, proposed_duration_seconds, sources[], confidence_note, water_cost_ml }
 *
 * Rate limits:
 *   - Per-IP: 3 runs / day (Redis key: research:ip:<ip>:<date>)
 *   - Site-wide: configurable via RESEARCH_DAILY_CAP env var (default 20)
 *     (Redis key: research:site:<date>)
 *
 * Water cost is charged BEFORE the Sonnet call and refunded on failure.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

// Vercel serverless function config — Sonnet + web_search needs up to 60s
export const config = { maxDuration: 60 };

const RESEARCH_MODEL = 'claude-sonnet-4-20250514';

// Inline from recalculate.js to avoid importing the full frontend module
// (which pulls in water_cost_reference_data.json and breaks Vercel bundling)
function calculateMetaWater(totalTokens, wue = 1.8) {
  const wh = totalTokens * 0.14 / 1000;
  return wh * wue;
}
const PER_IP_CAP = 3;
const SITE_CAP = parseInt(process.env.RESEARCH_DAILY_CAP || '20', 10);
// Estimated water cost for a Sonnet + web_search call (~5000 tokens)
const ESTIMATED_WATER_ML = 30;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

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
const memLimits = {};

async function getRateLimits(ip) {
  const r = getRedis();
  const today = todayKey();
  const ipKey = `research:ip:${ip}:${today}`;
  const siteKey = `research:site:${today}`;

  if (r) {
    const [ipCount, siteCount] = await Promise.all([
      r.get(ipKey).then(v => parseInt(v || '0', 10)),
      r.get(siteKey).then(v => parseInt(v || '0', 10)),
    ]);
    return { ipCount, siteCount, ipKey, siteKey };
  }

  // In-memory fallback
  if (!memLimits[today]) {
    Object.keys(memLimits).forEach(k => delete memLimits[k]);
    memLimits[today] = { site: 0, ips: {} };
  }
  const store = memLimits[today];
  return {
    ipCount: store.ips[ip] || 0,
    siteCount: store.site || 0,
    ipKey, siteKey,
  };
}

async function incrementLimits(ip) {
  const r = getRedis();
  const today = todayKey();
  const ipKey = `research:ip:${ip}:${today}`;
  const siteKey = `research:site:${today}`;

  if (r) {
    await Promise.all([
      r.incr(ipKey).then(() => r.expire(ipKey, 90000)),
      r.incr(siteKey).then(() => r.expire(siteKey, 90000)),
    ]);
  } else {
    if (!memLimits[today]) memLimits[today] = { site: 0, ips: {} };
    memLimits[today].site = (memLimits[today].site || 0) + 1;
    memLimits[today].ips[ip] = (memLimits[today].ips[ip] || 0) + 1;
  }
}

async function chargeWater(waterMl) {
  const r = getRedis();
  if (!r) return;
  const key = `usage:${todayKey()}`;
  const store = await r.get(key);
  if (store && typeof store === 'object') {
    store.total_ml = (store.total_ml || 0) + waterMl;
    store.query_count = (store.query_count || 0) + 1;
    await r.set(key, store, { ex: 90000 });
  }
}

async function refundWater(waterMl) {
  const r = getRedis();
  if (!r) return;
  const key = `usage:${todayKey()}`;
  const store = await r.get(key);
  if (store && typeof store === 'object') {
    store.total_ml = Math.max(0, (store.total_ml || 0) - waterMl);
    await r.set(key, store, { ex: 90000 });
  }
}

async function saveDraft(r, draft) {
  if (!r) return;
  const draftId = `research_draft:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await r.set(draftId, draft, { ex: 60 * 60 * 24 * 30 }); // 30 days TTL
  return draftId;
}

export default async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    // Top-level safety net — ensures Vercel NEVER returns a non-JSON response
    console.error('Unhandled research API error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unexpected server error',
      water_cost_ml: 0,
    });
  }
}

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    return res.status(204).end();
  }

  // GET — return remaining budget, or list drafts for admin
  if (req.method === 'GET') {
    const action = req.query?.action;

    // Admin: list research drafts
    if (action === 'list_drafts') {
      const adminPw = process.env.ADMIN_PASSWORD;
      if (adminPw && req.headers['x-admin-password'] !== adminPw) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const r = getRedis();
      if (!r) return res.status(200).json({ drafts: [] });

      try {
        // Scan for all research_draft:* keys
        const drafts = [];
        let cursor = 0;
        do {
          const [nextCursor, keys] = await r.scan(cursor, { match: 'research_draft:*', count: 100 });
          cursor = nextCursor;
          for (const key of keys) {
            const draft = await r.get(key);
            if (draft && typeof draft === 'object') {
              drafts.push({ id: key, ...draft });
            }
          }
        } while (cursor !== 0);

        // Sort newest first
        drafts.sort((a, b) => (b.submitted_at || 0) - (a.submitted_at || 0));
        return res.status(200).json({ drafts });
      } catch (err) {
        console.error('Error listing drafts:', err);
        return res.status(500).json({ error: 'Failed to list drafts' });
      }
    }

    // Default GET: return budget info
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const { ipCount, siteCount } = await getRateLimits(ip);
    return res.status(200).json({
      ip_remaining: Math.max(0, PER_IP_CAP - ipCount),
      site_remaining: Math.max(0, SITE_CAP - siteCount),
      site_cap: SITE_CAP,
      ip_cap: PER_IP_CAP,
    });
  }

  // PUT — admin: promote or reject a draft
  if (req.method === 'PUT') {
    const adminPw = process.env.ADMIN_PASSWORD;
    if (adminPw && req.headers['x-admin-password'] !== adminPw) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { draft_id, action, visibility } = req.body || {};
    if (!draft_id || !action) {
      return res.status(400).json({ error: 'draft_id and action are required' });
    }

    const r = getRedis();
    if (!r) return res.status(500).json({ error: 'Redis not available' });

    try {
      const draft = await r.get(draft_id);
      if (!draft || typeof draft !== 'object') {
        return res.status(404).json({ error: 'Draft not found' });
      }

      if (action === 'promote') {
        draft.visibility = visibility || 'attributed';
        draft.promoted_at = Date.now();
        await r.set(draft_id, draft, { ex: 60 * 60 * 24 * 90 }); // 90 days for promoted
        return res.status(200).json({ success: true, message: `Draft promoted to ${draft.visibility}` });
      }

      if (action === 'reject') {
        draft.visibility = 'rejected';
        draft.rejected_at = Date.now();
        await r.set(draft_id, draft, { ex: 60 * 60 * 24 * 7 }); // 7 days then auto-delete
        return res.status(200).json({ success: true, message: 'Draft rejected' });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err) {
      console.error('Error updating draft:', err);
      return res.status(500).json({ error: 'Failed to update draft' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { query, current_watts, current_duration_seconds } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  // Check rate limits
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const { ipCount, siteCount } = await getRateLimits(ip);

  if (siteCount >= SITE_CAP) {
    return res.status(429).json({
      error: 'site_budget_exhausted',
      message: 'Research budget resets tomorrow',
      site_remaining: 0,
    });
  }
  if (ipCount >= PER_IP_CAP) {
    return res.status(429).json({
      error: 'ip_budget_exhausted',
      message: `You've used your ${PER_IP_CAP} research runs today`,
      ip_remaining: 0,
      site_remaining: Math.max(0, SITE_CAP - siteCount),
    });
  }

  // Charge water upfront
  await chargeWater(ESTIMATED_WATER_ML);
  await incrementLimits(ip);

  try {
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a research assistant for MakeWater's Digital Water Cost Calculator. Your job is to find published wattage/energy data for a specific activity.

TASK: Given a user query about an activity, search for published sources that report the energy consumption (in watts or kWh) of that activity.

RETURN FORMAT: Return ONLY valid JSON (no markdown, no explanation):
{
  "proposed_watts": <number — typical power draw in watts>,
  "proposed_duration_seconds": <number — typical duration of one unit of this activity in seconds>,
  "sources": [
    {
      "url": "<canonical URL>",
      "title": "<paper/article title>",
      "year": <number>,
      "publisher": "<publisher or institution>",
      "snippet": "<1-2 sentence key finding>"
    }
  ],
  "confidence_note": "<1-2 sentences explaining your methodology and confidence level>"
}

RULES:
- Search for real published data. Do NOT invent numbers.
- Return 1-5 sources, prioritizing peer-reviewed research, government reports, and manufacturer specs.
- proposed_watts should be a single realistic number representing typical power draw.
- proposed_duration_seconds should represent one typical "unit" of the activity (e.g., elevator: 10-15 sec per floor; microwave: 120-180 sec per use).
- If you cannot find reliable data, set proposed_watts to null and explain in confidence_note.
- Current estimate for context: ${current_watts ? `${current_watts}W` : 'unknown'} for ${current_duration_seconds ? `${current_duration_seconds}s` : 'unknown duration'}.`;

    const response = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [
        { role: 'user', content: `Research the energy consumption of: "${query}"` },
      ],
    });

    // Extract text from response blocks
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON from the response
    let result;
    try {
      // Try to find JSON in the response (may be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      result = null;
    }

    if (!result || result.proposed_watts == null) {
      // Refund water on failure
      await refundWater(ESTIMATED_WATER_ML);
      return res.status(200).json({
        success: false,
        error: 'Could not find reliable published data',
        confidence_note: result?.confidence_note || 'No published sources found for this activity.',
        water_cost_ml: 0,
      });
    }

    // Save as draft in Redis
    const r = getRedis();
    const draft = {
      activity_query: query,
      proposed_watts: result.proposed_watts,
      proposed_duration_seconds: result.proposed_duration_seconds,
      sources: result.sources || [],
      confidence_note: result.confidence_note,
      user_action: null, // will be set by frontend: approved/edited/rejected
      submitted_at: Date.now(),
      visibility: 'draft',
      source_attribution: 'ai_research',
      current_watts: current_watts || null,
      current_duration_seconds: current_duration_seconds || null,
    };

    const draftId = r ? await saveDraft(r, draft) : `local_${Date.now()}`;

    // Calculate actual water cost from tokens used
    const totalTokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    const actualWaterMl = calculateMetaWater(totalTokens);

    // Adjust water charge (refund overpayment or charge underpayment)
    const diff = ESTIMATED_WATER_ML - actualWaterMl;
    if (diff > 0) await refundWater(diff);
    else if (diff < 0) await chargeWater(-diff);

    const newLimits = await getRateLimits(ip);

    return res.status(200).json({
      success: true,
      proposed_watts: result.proposed_watts,
      proposed_duration_seconds: result.proposed_duration_seconds,
      sources: result.sources || [],
      confidence_note: result.confidence_note,
      water_cost_ml: Math.round(actualWaterMl * 100) / 100,
      draft_id: draftId,
      ip_remaining: Math.max(0, PER_IP_CAP - newLimits.ipCount),
      site_remaining: Math.max(0, SITE_CAP - newLimits.siteCount),
    });
  } catch (error) {
    console.error('Research API error:', error);
    // Refund water on failure
    await refundWater(ESTIMATED_WATER_ML);
    return res.status(500).json({
      success: false,
      error: error.message || 'Research failed',
      water_cost_ml: 0,
    });
  }
}

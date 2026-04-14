/**
 * Reference data CRUD endpoint (admin-only).
 *
 * Storage keys:
 *   reference:<category>:<slug>  — a single dataset
 *   reference_seeded             — boolean flag so we only seed starter data once
 *
 * Dataset shape:
 * {
 *   id: 'power_sources/solar',
 *   slug: 'solar',
 *   name: 'Solar PV — water intensity (US average)',
 *   category: 'power_sources' | 'cooling_methods' | 'regional_wue' | 'activity_energy' | 'other',
 *   data: [{ ... row ... }],
 *   source_type: 'research_paper' | 'government_report' | 'industry_whitepaper' |
 *                'conference' | 'personal_communication' | 'proprietary' |
 *                'website' | 'dataset',
 *   source_citation: 'Formatted citation string',
 *   source_fields: { author, title, year, url, journal, page, doi, organization, notes },
 *   source_url: 'https://...',
 *   visibility: 'cited' | 'attributed' | 'draft',
 *   date_added: 1712...,
 *   updated_at: 1712...,
 *   added_by: 'admin',
 * }
 *
 * Visibility tier is derived from citation completeness (see computeVisibility
 * below). Drafts never reach public-facing calculations.
 *
 * Methods:
 *   GET /api/reference                       → { datasets: [...] }
 *   GET /api/reference?id=<category>/<slug>  → { dataset }
 *   POST /api/reference                      → create
 *   PUT /api/reference?id=<...>              → update
 *   DELETE /api/reference?id=<...>           → delete
 *
 * Auth: all methods require X-Admin-Password header matching ADMIN_PASSWORD.
 */

import { Redis } from '@upstash/redis';

const KEY_PREFIX = 'reference:';
const SEEDED_FLAG = 'reference_seeded';

export const CATEGORIES = ['power_sources', 'cooling_methods', 'regional_wue', 'activity_energy', 'other'];
export const SOURCE_TYPES = [
  'research_paper',
  'government_report',
  'industry_whitepaper',
  'conference',
  'personal_communication',
  'proprietary',
  'website',
  'dataset',
];

// --- Redis client (with in-memory fallback for local dev) ---
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

const memStore = {
  datasets: new Map(), // id → dataset
  seeded: false,
};

// --- Starter datasets ---
// These are seeded the first time the endpoint is accessed. They are
// baseline published values from widely cited sources so the site has
// something to work with immediately. Each has visibility: 'cited'.
const STARTER_DATASETS = [
  // Power sources — water per kWh generated (life-cycle, operation + cooling)
  // Values in liters per kWh.
  {
    slug: 'solar_pv',
    name: 'Solar PV — water intensity (life-cycle)',
    category: 'power_sources',
    data: [{
      source_type: 'solar',
      label: 'Solar PV',
      water_per_kwh_generation_liters: 0.04,
      water_per_kwh_cooling_liters: 0.0,
      total_water_per_kwh_liters: 0.04,
    }],
  },
  {
    slug: 'wind_onshore',
    name: 'Wind (onshore) — water intensity',
    category: 'power_sources',
    data: [{
      source_type: 'wind',
      label: 'Wind (onshore)',
      water_per_kwh_generation_liters: 0.004,
      water_per_kwh_cooling_liters: 0.0,
      total_water_per_kwh_liters: 0.004,
    }],
  },
  {
    slug: 'natural_gas_combined_cycle',
    name: 'Natural gas (combined cycle) — water intensity',
    category: 'power_sources',
    data: [{
      source_type: 'natural_gas',
      label: 'Natural gas (combined cycle)',
      water_per_kwh_generation_liters: 0.06,
      water_per_kwh_cooling_liters: 0.78,
      total_water_per_kwh_liters: 0.84,
    }],
  },
  {
    slug: 'coal',
    name: 'Coal — water intensity',
    category: 'power_sources',
    data: [{
      source_type: 'coal',
      label: 'Coal',
      water_per_kwh_generation_liters: 0.15,
      water_per_kwh_cooling_liters: 2.05,
      total_water_per_kwh_liters: 2.20,
    }],
  },
  {
    slug: 'nuclear',
    name: 'Nuclear — water intensity',
    category: 'power_sources',
    data: [{
      source_type: 'nuclear',
      label: 'Nuclear',
      water_per_kwh_generation_liters: 0.10,
      water_per_kwh_cooling_liters: 2.30,
      total_water_per_kwh_liters: 2.40,
    }],
  },
  {
    slug: 'hydroelectric',
    name: 'Hydroelectric — evaporative loss',
    category: 'power_sources',
    data: [{
      source_type: 'hydroelectric',
      label: 'Hydroelectric',
      water_per_kwh_generation_liters: 17.0,
      water_per_kwh_cooling_liters: 0.0,
      total_water_per_kwh_liters: 17.0,
      note: 'Evaporative loss from reservoir surfaces. Varies widely by climate and reservoir.',
    }],
  },
  {
    slug: 'us_average_grid_mix',
    name: 'US average grid mix — 2022',
    category: 'power_sources',
    data: [{
      source_type: 'grid_mix',
      label: 'US average grid mix',
      water_per_kwh_generation_liters: 0.10,
      water_per_kwh_cooling_liters: 1.70,
      total_water_per_kwh_liters: 1.80,
      note: 'Weighted average across US generation portfolio.',
    }],
  },
  // Cooling methods — liters per kWh of thermal load rejected
  {
    slug: 'evaporative_cooling',
    name: 'Evaporative cooling — water per kWh',
    category: 'cooling_methods',
    data: [{
      method: 'evaporative',
      label: 'Evaporative cooling',
      water_per_kwh_liters: 1.80,
    }],
  },
  {
    slug: 'air_cooled',
    name: 'Air-cooled — water per kWh',
    category: 'cooling_methods',
    data: [{
      method: 'air_cooled',
      label: 'Air-cooled (dry)',
      water_per_kwh_liters: 0.02,
    }],
  },
  {
    slug: 'hybrid_cooling',
    name: 'Hybrid cooling — water per kWh',
    category: 'cooling_methods',
    data: [{
      method: 'hybrid',
      label: 'Hybrid (adiabatic + dry)',
      water_per_kwh_liters: 0.50,
    }],
  },
];

function baseCitationForStarter() {
  return {
    source_type: 'government_report',
    source_citation: 'Macknick, J. et al. "Operational water consumption and withdrawal factors for electricity generating technologies." NREL/TP-6A20-50900, 2012. https://www.nrel.gov/docs/fy11osti/50900.pdf',
    source_fields: {
      author: 'Macknick, J. et al.',
      title: 'Operational water consumption and withdrawal factors for electricity generating technologies',
      organization: 'National Renewable Energy Laboratory (NREL)',
      year: 2012,
      url: 'https://www.nrel.gov/docs/fy11osti/50900.pdf',
      notes: 'Baseline starter value; refine with newer published data as it becomes available.',
    },
    source_url: 'https://www.nrel.gov/docs/fy11osti/50900.pdf',
    visibility: 'cited',
  };
}

async function seedStarterData(r) {
  const alreadySeeded = r
    ? await r.get(SEEDED_FLAG)
    : memStore.seeded;
  if (alreadySeeded) return false;

  const now = Date.now();
  const citation = baseCitationForStarter();

  for (const starter of STARTER_DATASETS) {
    const id = `${starter.category}/${starter.slug}`;
    const dataset = {
      id,
      slug: starter.slug,
      name: starter.name,
      category: starter.category,
      data: starter.data,
      ...citation,
      date_added: now,
      updated_at: now,
      added_by: 'system:starter',
      is_starter: true,
    };
    const key = `${KEY_PREFIX}${id}`;
    if (r) {
      await r.set(key, dataset);
    } else {
      memStore.datasets.set(id, dataset);
    }
  }

  if (r) {
    await r.set(SEEDED_FLAG, true);
  } else {
    memStore.seeded = true;
  }
  return true;
}

// --- Helpers ---
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'unnamed';
}

function trunc(str, max = 1000) {
  return String(str || '').slice(0, max);
}

/**
 * Derive visibility tier from citation completeness.
 * - cited:      has source_type, title, year, and (url OR doi)
 * - attributed: has source_type + some identifying fields but no public URL
 * - draft:      missing most citation info
 */
export function computeVisibility({ source_type, source_fields }) {
  if (!source_type) return 'draft';
  const f = source_fields || {};
  const hasTitle = !!(f.title && String(f.title).trim());
  const hasYear = !!(f.year);
  const hasAuthor = !!((f.author && String(f.author).trim()) || (f.organization && String(f.organization).trim()));
  const hasPublicLink = !!((f.url && String(f.url).trim()) || (f.doi && String(f.doi).trim()));

  if (hasTitle && hasYear && hasAuthor && hasPublicLink) return 'cited';

  // Personal communication / proprietary can never be cited publicly, but can
  // be attributed if we have who + when.
  if (source_type === 'personal_communication' || source_type === 'proprietary') {
    if (hasAuthor || f.organization) return 'attributed';
    return 'draft';
  }

  if (hasTitle && (hasAuthor || hasYear)) return 'attributed';
  return 'draft';
}

function validatePayload(body) {
  const errors = [];
  if (!body.name) errors.push('name is required');
  if (!body.category) errors.push('category is required');
  if (body.category && !CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (body.source_type && !SOURCE_TYPES.includes(body.source_type)) {
    errors.push(`source_type must be one of: ${SOURCE_TYPES.join(', ')}`);
  }
  if (!Array.isArray(body.data)) errors.push('data must be an array');
  return errors;
}

function buildDatasetFromBody(body, existing = null) {
  const now = Date.now();
  const slug = body.slug || slugify(body.name);
  const id = `${body.category}/${slug}`;
  const source_fields = body.source_fields || {};
  const visibility = computeVisibility({
    source_type: body.source_type,
    source_fields,
  });
  return {
    id,
    slug,
    name: trunc(body.name, 200),
    category: body.category,
    data: Array.isArray(body.data) ? body.data : [],
    source_type: body.source_type || null,
    source_citation: trunc(body.source_citation || '', 1200),
    source_fields,
    source_url: trunc(body.source_url || source_fields.url || '', 500),
    visibility,
    date_added: existing?.date_added || now,
    updated_at: now,
    added_by: existing?.added_by || body.added_by || 'admin',
    is_starter: existing?.is_starter || false,
  };
}

async function listAll(r) {
  if (r) {
    const keys = await r.keys(`${KEY_PREFIX}*`);
    if (keys.length === 0) return [];
    const values = await r.mget(...keys);
    return values.filter(v => v && typeof v === 'object');
  }
  return [...memStore.datasets.values()];
}

async function getOne(r, id) {
  const key = `${KEY_PREFIX}${id}`;
  if (r) return await r.get(key);
  return memStore.datasets.get(id) || null;
}

async function putOne(r, dataset) {
  const key = `${KEY_PREFIX}${dataset.id}`;
  if (r) {
    await r.set(key, dataset);
  } else {
    memStore.datasets.set(dataset.id, dataset);
  }
}

async function deleteOne(r, id) {
  const key = `${KEY_PREFIX}${id}`;
  if (r) {
    await r.del(key);
  } else {
    memStore.datasets.delete(id);
  }
}

function isAuthorized(req) {
  const headerPwd = req.headers?.['x-admin-password']
    || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const expected = process.env.ADMIN_PASSWORD;
  return expected && headerPwd && headerPwd === expected;
}

// --- Handler ---
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const r = getRedis();
  await seedStarterData(r);

  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('id');

  try {
    if (req.method === 'GET') {
      if (id) {
        const dataset = await getOne(r, id);
        if (!dataset) return res.status(404).json({ error: 'not found' });
        return res.status(200).json({ dataset });
      }
      const datasets = await listAll(r);
      datasets.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
      return res.status(200).json({
        datasets,
        categories: CATEGORIES,
        source_types: SOURCE_TYPES,
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const errors = validatePayload(body);
      if (errors.length) return res.status(400).json({ error: errors.join('; ') });
      const dataset = buildDatasetFromBody(body);
      await putOne(r, dataset);
      return res.status(200).json({ ok: true, dataset });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id query param required' });
      const existing = await getOne(r, id);
      if (!existing) return res.status(404).json({ error: 'not found' });
      const body = { ...existing, ...(req.body || {}), category: existing.category, slug: existing.slug };
      const errors = validatePayload(body);
      if (errors.length) return res.status(400).json({ error: errors.join('; ') });
      const dataset = buildDatasetFromBody(body, existing);
      await putOne(r, dataset);
      return res.status(200).json({ ok: true, dataset });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id query param required' });
      const existing = await getOne(r, id);
      if (!existing) return res.status(404).json({ error: 'not found' });
      await deleteOne(r, id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'internal error' });
  }
}

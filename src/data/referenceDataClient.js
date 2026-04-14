/**
 * Session cache for public reference data.
 *
 * One fetch per page load, shared across all calculations. Every caller gets
 * the same promise until it resolves, then the resolved payload until the
 * session ends. If the fetch fails or Redis has nothing, returns an empty
 * payload so callers can fall back to hardcoded defaults transparently.
 */

const EMPTY_PAYLOAD = {
  power_sources: [],
  cooling_methods: [],
  regional_wue: [],
  activity_energy: [],
  other: [],
  generated_at: 0,
};

let pending = null;
let resolved = null;

export function getReferenceData() {
  if (resolved) return Promise.resolve(resolved);
  if (pending) return pending;

  pending = fetch('/api/referenceData')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(payload => {
      resolved = { ...EMPTY_PAYLOAD, ...payload };
      return resolved;
    })
    .catch(() => {
      // Swallow — the calculator must never break because reference data is
      // unavailable. Treat as "no reference data" and fall back.
      resolved = EMPTY_PAYLOAD;
      return resolved;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/**
 * Synchronous accessor. Returns the cached payload if one has already been
 * fetched this session, otherwise null. Useful for render paths that don't
 * want to suspend on a promise.
 */
export function getReferenceDataSync() {
  return resolved;
}

/**
 * Extract a `water_per_kwh_liters` value from a power_sources dataset's first
 * data row. Datasets can store either `total_water_per_kwh_liters` (starter
 * shape) or `water_per_kwh_liters` (ingestion shape). Returns null if neither
 * is present or parseable.
 */
export function getPowerSourceWaterPerKwh(dataset) {
  if (!dataset || !Array.isArray(dataset.data) || dataset.data.length === 0) return null;
  const row = dataset.data[0];
  const candidates = [
    row.total_water_per_kwh_liters,
    row.water_per_kwh_liters,
    row.liters_per_kwh,
    row.value,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/**
 * Unit normalization helpers for reference data ingestion.
 *
 * Keeps everything in the site's canonical units:
 *   - volume:  liters
 *   - energy:  kWh
 *
 * The ingestion UI uses these to offer inline conversions when Sonnet
 * extracts a value in non-canonical units (gallons, m³, BTU, etc.).
 *
 * All conversions are bidirectional and pure. Returns { value, unit } where
 * unit is a canonical label the reference-data layer understands.
 */

// --- Volume → liters ---
const VOLUME_TO_LITERS = {
  liters: 1,
  liter: 1,
  l: 1,
  ml: 0.001,
  milliliters: 0.001,
  milliliter: 0.001,
  gallons: 3.78541,      // US gallon
  gallon: 3.78541,
  gal: 3.78541,
  'us_gallons': 3.78541,
  'uk_gallons': 4.54609,
  'imperial_gallons': 4.54609,
  m3: 1000,
  'm^3': 1000,
  'cubic_meters': 1000,
  'cubic_meter': 1000,
  cubic_feet: 28.3168,
  ft3: 28.3168,
};

// --- Energy → kWh ---
const ENERGY_TO_KWH = {
  kwh: 1,
  'kw_h': 1,
  mwh: 1000,
  gwh: 1_000_000,
  wh: 0.001,
  j: 1 / 3_600_000,
  joule: 1 / 3_600_000,
  joules: 1 / 3_600_000,
  kj: 1 / 3600,
  mj: 1 / 3.6,
  btu: 0.000293071,
  'btus': 0.000293071,
  therm: 29.3001,
  therms: 29.3001,
};

function normalizeUnitKey(unit) {
  return String(unit || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/·/g, '_')
    .replace(/\./g, '');
}

export function toLiters(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const key = normalizeUnitKey(unit);
  const factor = VOLUME_TO_LITERS[key];
  if (factor === undefined) return null;
  return n * factor;
}

export function toKwh(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const key = normalizeUnitKey(unit);
  const factor = ENERGY_TO_KWH[key];
  if (factor === undefined) return null;
  return n * factor;
}

/**
 * Detect a compound "per" unit like "gallons per MWh" or "mL/kWh" and
 * convert it to liters-per-kWh. Returns null if either side is unknown.
 */
export function toLitersPerKwh(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const raw = String(unit || '').toLowerCase();
  const parts = raw.split(/\s*(?:\/|per)\s*/);
  if (parts.length !== 2) return null;
  const [volPart, energyPart] = parts;
  const liters = toLiters(1, volPart);
  const kwh = toKwh(1, energyPart);
  if (liters == null || kwh == null) return null;
  return (n * liters) / kwh;
}

/**
 * Best-effort normalize: tries liters-per-kWh first (compound), then straight
 * volume, then straight energy. Returns { canonical_value, canonical_unit }
 * or null if the input can't be interpreted.
 */
export function normalize(value, unit) {
  const lpkwh = toLitersPerKwh(value, unit);
  if (lpkwh != null) return { canonical_value: lpkwh, canonical_unit: 'liters_per_kwh' };
  const liters = toLiters(value, unit);
  if (liters != null) return { canonical_value: liters, canonical_unit: 'liters' };
  const kwh = toKwh(value, unit);
  if (kwh != null) return { canonical_value: kwh, canonical_unit: 'kwh' };
  return null;
}

export const SUPPORTED_UNITS = {
  volume: Object.keys(VOLUME_TO_LITERS),
  energy: Object.keys(ENERGY_TO_KWH),
};

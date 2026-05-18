/**
 * changelogCost.js — Convert token estimates from changelog.json into
 * water (mL) and energy (Wh) costs, using the same meta-cost formula
 * the app uses for its own query accounting.
 *
 * Formula (matches recalculate.js / calculateMetaWater):
 *   energy_wh  = (tokens / 1000) × 0.14
 *   water_ml   = (energy_wh / 1000) × 1800
 *
 * The 0.14 Wh/1K-token figure comes from industry estimates of
 * inference energy for models in the Sonnet/Haiku class.  The 1.8 L/kWh
 * water intensity is the US-average blended site + grid figure.
 */

import changelog from './changelog.json';

// ── Conversion constants ──────────────────────────────────────────
const WH_PER_1K_TOKENS = 0.14;
const WATER_ML_PER_KWH = 1800; // 1.8 L/kWh = 1800 mL/kWh

// ── Core math ─────────────────────────────────────────────────────

/** Watt-hours consumed by `tokens` inference tokens. */
export function tokensToEnergyWh(tokens) {
  return (tokens / 1000) * WH_PER_1K_TOKENS;
}

/** Millilitres of water attributable to `tokens` inference tokens. */
export function tokensToWaterMl(tokens) {
  const kwh = tokensToEnergyWh(tokens) / 1000;
  return kwh * WATER_ML_PER_KWH;
}

// ── Formatting helpers ────────────────────────────────────────────

/** "~42 mL" or "~1.2 L" */
export function formatWater(ml) {
  if (ml >= 1000) return `~${(ml / 1000).toFixed(1)} L`;
  return `~${Math.round(ml)} mL`;
}

/** "~6.3 Wh" or "~1.2 kWh" */
export function formatEnergy(wh) {
  if (wh >= 1000) return `~${(wh / 1000).toFixed(1)} kWh`;
  return `~${wh.toFixed(1)} Wh`;
}

/** "~300K" or "~8K" */
export function formatTokens(tokens) {
  if (tokens >= 1_000_000) return `~${(tokens / 1_000_000).toFixed(1)}M`;
  return `~${Math.round(tokens / 1000)}K`;
}

// ── Aggregate helpers ─────────────────────────────────────────────

/** Cost object for a single changelog entry. */
export function computeCostFromTokens(tokens) {
  const energy_wh = tokensToEnergyWh(tokens);
  const water_ml = tokensToWaterMl(tokens);
  return { tokens, energy_wh, water_ml };
}

/** Totals across the entire changelog. */
export function computeChangelogTotals() {
  let totalTokens = 0;
  let totalEnergyWh = 0;
  let totalWaterMl = 0;

  for (const entry of changelog) {
    const t = entry.tokens_estimated || 0;
    totalTokens += t;
    totalEnergyWh += tokensToEnergyWh(t);
    totalWaterMl += tokensToWaterMl(t);
  }

  return {
    versions: changelog.length,
    totalTokens,
    totalEnergyWh,
    totalWaterMl,
  };
}

/** Cost for just the v1.0.0 (founding) entry. */
export function getFoundingCost() {
  const v1 = changelog.find(e => e.version === 'v1.0.0');
  if (!v1) return null;
  return computeCostFromTokens(v1.tokens_estimated || 0);
}

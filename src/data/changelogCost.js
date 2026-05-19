/**
 * changelogCost.js — Convert token counts from changelog.json into
 * water (mL) and energy (Wh) costs.
 *
 * Token counts are measured from actual Claude Code session transcripts
 * (output tokens — what the model wrote: code, explanations, tool calls).
 *
 * Energy per token varies by model class:
 *   Haiku/Sonnet class:  0.14 Wh per 1K tokens
 *   Opus class:          0.42 Wh per 1K tokens  (~3× Sonnet)
 *
 * Water intensity: 1.8 L/kWh (US-average blended site + grid).
 */

import changelog from './changelog.json';

// ── Conversion constants ──────────────────────────────────────────
const WH_PER_1K_TOKENS_DEFAULT = 0.14;      // Sonnet/Haiku class
const WH_PER_1K_TOKENS_OPUS = 0.42;         // Opus class (~3× Sonnet)
const WATER_ML_PER_KWH = 1800;              // 1.8 L/kWh = 1800 mL/kWh

/** Get energy factor for a model string. */
function whPer1kTokens(model) {
  if (model && model.includes('opus')) return WH_PER_1K_TOKENS_OPUS;
  return WH_PER_1K_TOKENS_DEFAULT;
}

// ── Core math ─────────────────────────────────────────────────────

/** Watt-hours consumed by `tokens` inference tokens. */
export function tokensToEnergyWh(tokens, model) {
  return (tokens / 1000) * whPer1kTokens(model);
}

/** Millilitres of water attributable to `tokens` inference tokens. */
export function tokensToWaterMl(tokens, model) {
  const kwh = tokensToEnergyWh(tokens, model) / 1000;
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
export function computeCostFromTokens(tokens, model) {
  const energy_wh = tokensToEnergyWh(tokens, model);
  const water_ml = tokensToWaterMl(tokens, model);
  return { tokens, energy_wh, water_ml, model };
}

/** Totals across the entire changelog. */
export function computeChangelogTotals() {
  let totalTokens = 0;
  let totalEnergyWh = 0;
  let totalWaterMl = 0;

  for (const entry of changelog) {
    const t = entry.tokens_estimated || 0;
    const m = entry.model || null;
    totalTokens += t;
    totalEnergyWh += tokensToEnergyWh(t, m);
    totalWaterMl += tokensToWaterMl(t, m);
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
  return computeCostFromTokens(v1.tokens_estimated || 0, v1.model);
}

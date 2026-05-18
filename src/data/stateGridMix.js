/**
 * stateGridMix — US state-level electricity generation mix and grid water intensity.
 *
 * Real data states use EIA Form 923 (2023/2024) fuel mix percentages.
 * States marked is_estimated use US national average as a placeholder.
 *
 * grid_water_intensity_l_per_kwh is derived from the weighted fuel mix
 * using NREL cooling water factors (Macknick et al. 2012) and EESI 2023
 * analysis. National average: 4.54 L/kWh (EESI 2023). States with
 * high renewables get lower values; fossil-heavy states get higher.
 *
 * Phase 2A-3 ships real data for 8 high-DC-density states + DC.
 * Remaining states use national average with is_estimated flag.
 */

const REAL_STATES = {
  TX: {
    state_code: 'TX',
    grid_mix: { gas: 0.47, coal: 0.16, nuclear: 0.10, solar: 0.06, wind: 0.18, hydro: 0.00, other: 0.03 },
    grid_water_intensity_l_per_kwh: 3.63,
    primary_utilities: ['CPS Energy', 'Oncor', 'CenterPoint Energy', 'AEP Texas'],
    source: 'EIA Form 923 2023 + UT COMPASS 2025',
    year: 2023,
  },
  CA: {
    state_code: 'CA',
    grid_mix: { gas: 0.37, coal: 0.00, nuclear: 0.09, solar: 0.19, wind: 0.10, hydro: 0.12, other: 0.13 },
    grid_water_intensity_l_per_kwh: 2.90,
    primary_utilities: ['Pacific Gas & Electric', 'Southern California Edison', 'San Diego Gas & Electric'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  VA: {
    state_code: 'VA',
    grid_mix: { gas: 0.33, coal: 0.12, nuclear: 0.31, solar: 0.06, wind: 0.00, hydro: 0.00, other: 0.18 },
    grid_water_intensity_l_per_kwh: 4.20,
    primary_utilities: ['Dominion Energy'],
    source: 'EIA Form 923 2024',
    year: 2024,
  },
  NY: {
    state_code: 'NY',
    grid_mix: { gas: 0.35, coal: 0.00, nuclear: 0.25, solar: 0.03, wind: 0.04, hydro: 0.24, other: 0.09 },
    grid_water_intensity_l_per_kwh: 3.40,
    primary_utilities: ['Con Edison', 'National Grid', 'NYSEG'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  IL: {
    state_code: 'IL',
    grid_mix: { gas: 0.10, coal: 0.14, nuclear: 0.54, solar: 0.02, wind: 0.14, hydro: 0.00, other: 0.06 },
    grid_water_intensity_l_per_kwh: 4.80,
    primary_utilities: ['ComEd', 'Ameren Illinois'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  WA: {
    state_code: 'WA',
    grid_mix: { gas: 0.08, coal: 0.04, nuclear: 0.08, solar: 0.01, wind: 0.08, hydro: 0.66, other: 0.05 },
    grid_water_intensity_l_per_kwh: 1.80,
    primary_utilities: ['Puget Sound Energy', 'Seattle City Light', 'Bonneville Power'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  OR: {
    state_code: 'OR',
    grid_mix: { gas: 0.18, coal: 0.03, nuclear: 0.00, solar: 0.02, wind: 0.12, hydro: 0.56, other: 0.09 },
    grid_water_intensity_l_per_kwh: 2.10,
    primary_utilities: ['Portland General Electric', 'PacifiCorp'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  IA: {
    state_code: 'IA',
    grid_mix: { gas: 0.06, coal: 0.22, nuclear: 0.00, solar: 0.01, wind: 0.62, hydro: 0.02, other: 0.07 },
    grid_water_intensity_l_per_kwh: 2.40,
    primary_utilities: ['MidAmerican Energy', 'Alliant Energy'],
    source: 'EIA Form 923 2023',
    year: 2023,
  },
  DC: {
    state_code: 'DC',
    grid_mix: { gas: 0.33, coal: 0.12, nuclear: 0.31, solar: 0.06, wind: 0.00, hydro: 0.00, other: 0.18 },
    grid_water_intensity_l_per_kwh: 4.20,
    primary_utilities: ['Pepco'],
    source: 'EIA Form 923 2024 (PJM region)',
    year: 2024,
  },
};

// US national average — used as fallback for non-profiled states.
const US_AVERAGE = {
  grid_mix: { gas: 0.40, coal: 0.16, nuclear: 0.19, solar: 0.04, wind: 0.11, hydro: 0.06, other: 0.04 },
  grid_water_intensity_l_per_kwh: 4.54,
  primary_utilities: [],
  source: 'EIA + EESI 2023 national average',
  year: 2023,
};

/**
 * Get grid mix data for a US state.
 * @param {string} stateCode — 2-letter state abbreviation
 * @returns {{ state_code, grid_mix, grid_water_intensity_l_per_kwh, primary_utilities, source, year, is_estimated }}
 */
export function getStateGridMix(stateCode) {
  const code = (stateCode || '').toUpperCase();
  const real = REAL_STATES[code];
  if (real) {
    return { ...real, is_estimated: false };
  }
  return {
    state_code: code,
    ...US_AVERAGE,
    is_estimated: true,
  };
}

/**
 * Format grid mix as a human-readable string.
 * Only includes components ≥ 3%.
 */
export function formatGridMix(gridMix) {
  const labels = { gas: 'gas', coal: 'coal', nuclear: 'nuclear', solar: 'solar', wind: 'wind', hydro: 'hydro', other: 'other' };
  return Object.entries(gridMix)
    .filter(([, v]) => v >= 0.03)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${Math.round(v * 100)}% ${labels[k]}`)
    .join(' · ');
}

export default getStateGridMix;

import referenceData from './water_cost_reference_data.json';

// Device energy lookup (kWh per hour)
export const DEVICES = {
  phone: { label: 'Phone', kwh: referenceData.device_energy.smartphone_active_use_per_hour.kwh },
  tablet: { label: 'Tablet', kwh: 0.008 }, // between phone and laptop
  laptop: { label: 'Laptop', kwh: referenceData.device_energy.laptop_active_per_hour.kwh },
  desktop: { label: 'Desktop PC', kwh: referenceData.device_energy.desktop_pc_per_hour.kwh },
  tv_55_led: { label: '55" LED TV', kwh: referenceData.device_energy.tv_55_inch_led_per_hour.kwh },
  tv_65_oled: { label: '65" OLED TV', kwh: referenceData.device_energy.tv_65_inch_oled_per_hour.kwh },
  projector: { label: 'Projector', kwh: 0.20 }, // typical home projector ~200W
  console: { label: 'Gaming Console', kwh: referenceData.device_energy.gaming_console_active_per_hour.kwh },
  smart_speaker: { label: 'Smart Speaker', kwh: referenceData.device_energy.smart_speaker_per_hour.kwh },
  none: { label: 'No device (server only)', kwh: 0 },
  custom: { label: 'Other (enter watts)', kwh: 0 }, // placeholder, overridden by user input
};

// Regions — organized by continent/area with clean labels
// Includes both data-backed regions (from reference JSON) and estimated regions
//
// wue = site WUE (direct cooling water at the data center, L/kWh)
// gridWaterIntensity = indirect water consumed by electricity generation (L/kWh)
//   - US national default: 4.54 L/kWh (= 1.2 gal/kWh, per EESI 2023 / LBNL / EIA)
//   - Texas: 3.63 L/kWh (UT COMPASS 2025, Table 5)
//   - Other US states: scaled from 4.54 by (1 − renewable fraction)
//   - Non-US: estimated from grid mix; 4.54 used where uncertain
// gridEstimated = true if gridWaterIntensity uses national default or rough estimate
export const REGIONS = {
  // Global default
  industry_average: {
    label: 'Global Average',
    wue: 1.8,
    multiplier: 1.0,
    water_stress: 'varies',
    estimated: false,
    gridWaterIntensity: 4.54,  // US national default (EESI 2023 analysis of LBNL/EIA data)
    gridEstimated: false,
    gridSource: 'eesi_2023',
  },

  // North America
  us_southwest_arizona: {
    label: 'US — Southwest (Arizona)',
    wue: 1.52,
    multiplier: 0.84,
    water_stress: 'critical',
    estimated: false,
    gridWaterIntensity: 3.86,  // ~15% solar; rest nuclear/gas/coal (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_virginia: {
    label: 'US — East Coast (Virginia)',
    wue: 1.40,
    multiplier: 0.78,
    water_stress: 'moderate',
    estimated: false,
    gridWaterIntensity: 4.31,  // ~5% renewable; heavy nuclear + gas (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_iowa: {
    label: 'US — Midwest (Iowa)',
    wue: 1.00,
    multiplier: 0.56,
    water_stress: 'low_to_moderate',
    estimated: false,
    gridWaterIntensity: 2.04,  // ~55% wind; 4.54 × 0.45 (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_texas_san_antonio: {
    label: 'US — Texas (San Antonio)',
    wue: 1.30,
    multiplier: 0.72,
    water_stress: 'moderate_to_high',
    estimated: false,
    gridWaterIntensity: 3.63,  // UT COMPASS 2025, Table 5 (0.96 gal/kWh)
    gridEstimated: false,
    gridSource: 'ut_compass_2025',
  },
  us_oregon: {
    label: 'US — Pacific Northwest (Oregon)',
    wue: 0.80,
    multiplier: 0.44,
    water_stress: 'low',
    estimated: false,
    gridWaterIntensity: 1.36,  // ~70% hydro + wind; 4.54 × 0.30 (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_california: {
    label: 'US — California',
    wue: 1.45,
    multiplier: 0.81,
    water_stress: 'high',
    estimated: true,
    gridWaterIntensity: 2.27,  // ~50% solar + wind; 4.54 × 0.50 (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_northeast: {
    label: 'US — Northeast (NYC/NJ)',
    wue: 1.20,
    multiplier: 0.67,
    water_stress: 'low_to_moderate',
    estimated: true,
    gridWaterIntensity: 3.86,  // ~15% renewable; nuclear + gas dominant (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_chicago: {
    label: 'US — Chicago Metro',
    wue: 1.10,
    multiplier: 0.61,
    water_stress: 'low_to_moderate',
    estimated: true,
    gridWaterIntensity: 3.63,  // ~20% wind + nuclear heavy; 4.54 × 0.80 (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  us_southeast: {
    label: 'US — Southeast (Atlanta)',
    wue: 1.35,
    multiplier: 0.75,
    water_stress: 'moderate',
    estimated: true,
    gridWaterIntensity: 4.31,  // ~5% renewable; coal + gas + nuclear (EIA thermoelectric)
    gridEstimated: true,
    gridSource: 'eia_thermoelectric',
  },
  canada: {
    label: 'Canada',
    wue: 0.70,
    multiplier: 0.39,
    water_stress: 'low',
    estimated: true,
    gridWaterIntensity: 1.36,  // ~65% hydro + 5% wind; 4.54 × 0.30
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  mexico: {
    label: 'Mexico',
    wue: 1.90,
    multiplier: 1.06,
    water_stress: 'moderate_to_high',
    estimated: true,
    gridWaterIntensity: 3.63,  // ~20% renewable; gas + some coal
    gridEstimated: true,
    gridSource: 'eesi_default',
  },

  // South America
  brazil: {
    label: 'Brazil',
    wue: 1.50,
    multiplier: 0.83,
    water_stress: 'moderate',
    estimated: true,
    gridWaterIntensity: 1.36,  // ~65% hydro; minimal thermal
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  chile: {
    label: 'Chile',
    wue: 1.60,
    multiplier: 0.89,
    water_stress: 'moderate_to_high',
    estimated: true,
    gridWaterIntensity: 2.27,  // ~50% solar + hydro
    gridEstimated: true,
    gridSource: 'eesi_default',
  },

  // Europe
  nordics: {
    label: 'Northern Europe (Nordics)',
    wue: 0.30,
    multiplier: 0.17,
    water_stress: 'minimal',
    estimated: false,
    gridWaterIntensity: 0.45,  // ~90% hydro + wind + nuclear; 4.54 × 0.10
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  ireland: {
    label: 'Western Europe (Ireland)',
    wue: 0.60,
    multiplier: 0.33,
    water_stress: 'low',
    estimated: false,
    gridWaterIntensity: 2.72,  // ~40% wind; rest gas (lower thermal water than coal)
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  netherlands: {
    label: 'Western Europe (Netherlands)',
    wue: 0.50,
    multiplier: 0.28,
    water_stress: 'low',
    estimated: false,
    gridWaterIntensity: 2.72,  // ~40% renewable; rest gas
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  germany: {
    label: 'Central Europe (Germany)',
    wue: 0.55,
    multiplier: 0.31,
    water_stress: 'low',
    estimated: true,
    gridWaterIntensity: 2.27,  // ~50% renewable; coal + gas remainder
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  uk: {
    label: 'United Kingdom',
    wue: 0.55,
    multiplier: 0.31,
    water_stress: 'low',
    estimated: true,
    gridWaterIntensity: 2.27,  // ~50% renewable + nuclear; gas remainder
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  southern_europe: {
    label: 'Southern Europe (Spain, Italy)',
    wue: 1.20,
    multiplier: 0.67,
    water_stress: 'moderate',
    estimated: true,
    gridWaterIntensity: 3.18,  // ~30% renewable; gas + some coal
    gridEstimated: true,
    gridSource: 'eesi_default',
  },

  // Middle East & Africa
  middle_east_uae: {
    label: 'Middle East (UAE, Saudi Arabia)',
    wue: 2.40,
    multiplier: 1.33,
    water_stress: 'extreme',
    estimated: false,
    gridWaterIntensity: 4.54,  // gas-dominant but uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  israel: {
    label: 'Middle East (Israel)',
    wue: 1.80,
    multiplier: 1.0,
    water_stress: 'high',
    estimated: true,
    gridWaterIntensity: 4.54,  // gas + solar; uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  south_africa: {
    label: 'Southern Africa',
    wue: 1.70,
    multiplier: 0.94,
    water_stress: 'high',
    estimated: true,
    gridWaterIntensity: 4.54,  // ~80% coal; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  north_africa: {
    label: 'North Africa (Egypt, Morocco)',
    wue: 2.20,
    multiplier: 1.22,
    water_stress: 'high',
    estimated: true,
    gridWaterIntensity: 4.54,  // gas-dominant; uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  west_africa: {
    label: 'West Africa (Nigeria, Ghana)',
    wue: 2.00,
    multiplier: 1.11,
    water_stress: 'moderate_to_high',
    estimated: true,
    gridWaterIntensity: 4.54,  // mixed; uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },

  // Asia
  india_mumbai: {
    label: 'South Asia (India)',
    wue: 2.00,
    multiplier: 1.11,
    water_stress: 'high',
    estimated: false,
    gridWaterIntensity: 4.54,  // ~70% coal; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  singapore: {
    label: 'Southeast Asia (Singapore)',
    wue: 0.20,
    multiplier: 0.11,
    water_stress: 'managed',
    estimated: false,
    gridWaterIntensity: 4.54,  // ~95% gas; uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  southeast_asia: {
    label: 'Southeast Asia (Indonesia, Thailand)',
    wue: 1.80,
    multiplier: 1.0,
    water_stress: 'moderate',
    estimated: true,
    gridWaterIntensity: 4.54,  // coal + gas mix; uncertain; national default applied
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  china_east: {
    label: 'East Asia (China — coastal)',
    wue: 1.40,
    multiplier: 0.78,
    water_stress: 'moderate',
    estimated: true,
    gridWaterIntensity: 3.18,  // ~30% renewable (hydro + wind + solar); rest coal
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  china_west: {
    label: 'East Asia (China — inland)',
    wue: 2.10,
    multiplier: 1.17,
    water_stress: 'high',
    estimated: true,
    gridWaterIntensity: 4.09,  // ~10% renewable; coal-dominant
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  japan: {
    label: 'East Asia (Japan)',
    wue: 0.90,
    multiplier: 0.50,
    water_stress: 'low',
    estimated: true,
    gridWaterIntensity: 3.63,  // ~20% renewable; nuclear + gas + coal
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  south_korea: {
    label: 'East Asia (South Korea)',
    wue: 1.00,
    multiplier: 0.56,
    water_stress: 'low_to_moderate',
    estimated: true,
    gridWaterIntensity: 4.09,  // ~10% renewable; nuclear + coal + gas
    gridEstimated: true,
    gridSource: 'eesi_default',
  },

  // Oceania
  australia: {
    label: 'Australia',
    wue: 1.50,
    multiplier: 0.83,
    water_stress: 'moderate_to_high',
    estimated: true,
    gridWaterIntensity: 3.18,  // ~30% renewable (solar + wind); coal + gas
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
  new_zealand: {
    label: 'New Zealand',
    wue: 0.60,
    multiplier: 0.33,
    water_stress: 'low',
    estimated: true,
    gridWaterIntensity: 0.91,  // ~80% hydro + geothermal + wind
    gridEstimated: true,
    gridSource: 'eesi_default',
  },
};

const DEFAULT_WUE = 1.8;
const DEFAULT_GRID_WATER_INTENSITY = 4.54; // L/kWh, US national default (EESI 2023)

// Operator class site WUE values (L/kWh, direct cooling water)
export const OPERATOR_CLASSES = {
  industry_typical: { label: 'Industry Average', siteWUE: 1.8, source: 'Meta / Green Grid' },
  hyperscaler_aws:  { label: 'AWS (Amazon)',     siteWUE: 0.15, source: 'Amazon 2024 Sustainability Report' },
  hyperscaler_msft: { label: 'Microsoft Azure',  siteWUE: 0.30, source: 'Microsoft FY2024 global avg' },
  hyperscaler_gcp:  { label: 'Google Cloud',     siteWUE: 1.10, source: 'Google 2024 env report (est.)' },
  hyperscaler_meta: { label: 'Meta',             siteWUE: 0.20, source: 'Meta recent-build reports' },
  enterprise_on_prem: { label: 'Enterprise / On-Prem', siteWUE: 2.40, source: 'LBNL 2024' },
  crypto_mining_facility: { label: 'Crypto Mining', siteWUE: 0.0, source: 'EIA 2024 — ASIC air-cooled' },
};

// Cooling technology site WUE overrides (L/kWh)
// When set to anything other than 'auto', overrides the operator class WUE.
export const COOLING_TECH = {
  auto:                       { label: 'Auto (operator default)', siteWUE: null },
  air_cooling:                { label: 'Air Cooling (fans only)', siteWUE: 0.04, source: 'BEG 2025 Table 2' },
  heat_pump:                  { label: 'Heat Pump / Mechanical',  siteWUE: 0.40, source: 'Industry estimates' },
  hybrid:                     { label: 'Hybrid (air + evap)',     siteWUE: 1.00, source: 'Industry estimates' },
  indirect_evap_cooling_tower:{ label: 'Evaporative Cooling Tower', siteWUE: 2.10, source: 'BEG 2025 Table 2' },
  direct_evap_adiabatic:      { label: 'Direct Evaporative',     siteWUE: 1.50, source: 'Industry estimates' },
  liquid_immersion:           { label: 'Liquid Immersion',        siteWUE: 0.0,  source: 'Industry estimates' },
};

// Comparisons library
const COMPARISONS = [
  { max: 5, text: 'About a teaspoon', icon: 'teaspoon' },
  { max: 15, text: 'About a tablespoon', icon: 'teaspoon' },
  { max: 25, text: 'A sip of water', icon: 'drop' },
  { max: 100, text: 'Less than half a glass', icon: 'glass' },
  { max: 250, text: 'About a glass of water', icon: 'glass' },
  { max: 500, text: 'About a water bottle', icon: 'bottle' },
  { max: 1000, text: 'About 2 water bottles', icon: 'bottle' },
  { max: 5000, text: (ml) => `About ${Math.round(ml / 500)} water bottles`, icon: 'bottle' },
  { max: 74999, text: (ml) => `About ${Math.round(ml / 500)} water bottles`, icon: 'bottle' },
  { max: 750000, text: (ml) => `About ${Math.round(ml / 150000)} bathtub${Math.round(ml / 150000) === 1 ? '' : 's'}`, icon: 'bathtub' },
  { max: Infinity, text: (ml) => `${(ml / 1000).toFixed(0)} liters`, icon: 'bathtub' },
];

export function getComparison(ml) {
  for (const c of COMPARISONS) {
    if (ml <= c.max) {
      const text = typeof c.text === 'function' ? c.text(ml) : c.text;
      return { text, icon: c.icon };
    }
  }
  return { text: `${(ml / 1000).toFixed(1)} liters`, icon: 'bathtub' };
}

export function formatWater(ml) {
  if (ml < 1) return `~${ml.toFixed(2)} mL`;
  if (ml < 1000) return `~${Math.round(ml)} mL`;
  return `~${(ml / 1000).toFixed(1)} liters`;
}

/**
 * Look up a regional WUE override from reference data, if one exists for the
 * given region key. Returns null if no match. Only entries with visibility
 * 'cited' or 'attributed' reach this function — draft filtering happens on
 * the server side of /api/referenceData.
 */
function findRegionalWueOverride(regionKey, referenceData) {
  if (!referenceData || !Array.isArray(referenceData.regional_wue)) return null;
  const match = referenceData.regional_wue.find(ds =>
    ds.slug === regionKey || ds.id === `regional_wue/${regionKey}`
  );
  if (!match || !Array.isArray(match.data) || match.data.length === 0) return null;
  const row = match.data[0];
  const candidates = [row.wue, row.wue_liters_per_kwh, row.water_per_kwh_liters, row.value];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return { value: n, dataset: match };
  }
  return null;
}

/**
 * Recalculate water cost from editable parameters.
 *
 * Optional `reference_data` parameter: the payload from /api/referenceData.
 * When provided and a matching regional_wue entry exists for the selected
 * region, that published value is preferred over the hardcoded REGIONS table.
 * If reference_data is missing or has no match, falls back to hardcoded
 * defaults silently — the calculator must never break because reference data
 * is unavailable.
 *
 * Optional `water_per_kwh_override`: force a specific grid water intensity
 * value (used by calculatePowerSourceVariants to run the same activity
 * against every power source in the reference data). Overrides only the
 * grid portion — site WUE stays constant.
 */
export function recalculate({
  activity_kwh,
  duration = 1,
  device_key = 'none',
  region_key = 'industry_average',
  duration_hours = 1,
  custom_device_watts = 0,
  reference_data = null,
  water_per_kwh_override = null,
  operator_class = null,
  cooling_tech = null,
}) {
  let device = DEVICES[device_key] || DEVICES.none;
  // Handle custom device wattage
  if (device_key === 'custom' && custom_device_watts > 0) {
    device = { label: `Custom (${custom_device_watts}W)`, kwh: custom_device_watts / 1000 };
  }
  const region = REGIONS[region_key] || REGIONS.industry_average;

  const base_kwh = activity_kwh * duration;
  const device_kwh = device.kwh * duration_hours;
  const total_kwh = base_kwh + device_kwh;

  // --- Site water (direct cooling at the data center) ---
  // Resolution priority:
  //   1. Explicit cooling_tech (not 'auto') → cooling tech WUE
  //   2. Explicit operator_class (not null, not 'industry_typical') → operator WUE
  //   3. Reference data regional override → published WUE
  //   4. Regional default from REGIONS table → hardcoded WUE
  let siteWue = region.wue;
  let wue_source = 'hardcoded';

  if (reference_data) {
    const override = findRegionalWueOverride(region_key, reference_data);
    if (override) {
      siteWue = override.value;
      wue_source = 'reference_data';
    }
  }

  // Operator class override (when not industry_typical)
  const resolvedOperator = operator_class || 'industry_typical';
  const operatorObj = OPERATOR_CLASSES[resolvedOperator];
  if (resolvedOperator !== 'industry_typical' && operatorObj) {
    siteWue = operatorObj.siteWUE;
    wue_source = `operator:${resolvedOperator}`;
  }

  // Cooling tech override (when not auto)
  const resolvedCooling = cooling_tech || 'auto';
  const coolingObj = COOLING_TECH[resolvedCooling];
  if (resolvedCooling !== 'auto' && coolingObj && coolingObj.siteWUE != null) {
    siteWue = coolingObj.siteWUE;
    wue_source = `cooling:${resolvedCooling}`;
  }

  // --- Grid water (indirect, from electricity generation) ---
  let gridWaterIntensity = region.gridWaterIntensity ?? DEFAULT_GRID_WATER_INTENSITY;
  let gridSource = region.gridSource || 'eesi_default';
  if (water_per_kwh_override != null && Number.isFinite(Number(water_per_kwh_override))) {
    gridWaterIntensity = Number(water_per_kwh_override);
    gridSource = 'override';
  }

  // --- Combined water calculation ---
  const siteWater_liters = total_kwh * siteWue;
  const gridWater_liters = total_kwh * gridWaterIntensity;
  const totalWater_liters = siteWater_liters + gridWater_liters;
  const water_ml = totalWater_liters * 1000;
  const siteWater_mL = siteWater_liters * 1000;
  const gridWater_mL = gridWater_liters * 1000;

  const comp = getComparison(water_ml);

  return {
    water_ml,           // total (site + grid) — headline number
    siteWater_mL,       // site cooling water only
    gridWater_mL,       // grid (power generation) water only
    totalWater_mL: water_ml,  // alias for clarity
    water_display: formatWater(water_ml),
    comparison: comp.text,
    comparison_icon: comp.icon,
    total_kwh,
    base_kwh,
    device_kwh,
    wue: siteWue,       // site WUE (L/kWh) — kept as 'wue' for backward compat
    gridWaterIntensity, // grid water intensity (L/kWh)
    gridSource,
    gridEstimated: water_per_kwh_override != null ? false : (region.gridEstimated ?? true),
    wue_source,
    operator_class: resolvedOperator,
    operator_label: operatorObj?.label || 'Industry Average',
    cooling_tech: resolvedCooling,
    cooling_label: coolingObj?.label || 'Auto',
    region_label: region.label,
    water_stress: region.water_stress,
    region_estimated: region.estimated || false,
  };
}

/**
 * Run the same calculation against every power source in the reference data.
 *
 * Returns one variant per dataset with a parseable water-per-kWh value, sorted
 * ascending by water_ml. Each variant is tagged with `is_baseline: true` if
 * its slug matches `baseline_slug` (default: `us_average_grid_mix`), so the UI
 * can highlight where the user's current estimate falls in the range.
 *
 * Draft entries are never included — the filtering already happens server-side
 * in /api/referenceData, but we double-check here as belt-and-suspenders.
 *
 * Returns an empty array if no reference data is available.
 */
export function calculatePowerSourceVariants({
  params,
  reference_data,
  baseline_slug = 'us_average_grid_mix',
}) {
  if (!reference_data || !Array.isArray(reference_data.power_sources)) return [];
  const sources = reference_data.power_sources.filter(ds =>
    ds && ds.visibility !== 'draft' && Array.isArray(ds.data) && ds.data.length > 0
  );
  if (sources.length === 0) return [];

  const variants = [];
  for (const ds of sources) {
    const row = ds.data[0];
    const candidates = [
      row.total_water_per_kwh_liters,
      row.water_per_kwh_liters,
      row.liters_per_kwh,
      row.value,
    ];
    let waterPerKwh = null;
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n >= 0) { waterPerKwh = n; break; }
    }
    if (waterPerKwh == null) continue;

    const result = recalculate({
      ...params,
      water_per_kwh_override: waterPerKwh,
    });

    variants.push({
      id: ds.id,
      slug: ds.slug,
      name: ds.name,
      label: row.label || ds.name,
      water_per_kwh: waterPerKwh,
      water_ml: result.water_ml,
      water_display: result.water_display,
      total_kwh: result.total_kwh,
      is_baseline: ds.slug === baseline_slug,
      source_citation: ds.source_citation || '',
      source_url: ds.source_url || '',
    });
  }

  variants.sort((a, b) => a.water_ml - b.water_ml);
  return variants;
}

/**
 * Recalculate confidence score based on which factors are now met.
 */
export function recalculateConfidence(originalFactors, overrides = {}) {
  const factors = {};
  let total = 0;

  const maxPoints = {
    energy_source_published: 25,
    wue_provider_specific: 20,
    multi_source_verified: 15,
    direct_not_extrapolated: 15,
    regional_specific: 10,
    data_under_2_years: 10,
    device_energy_measured: 5,
  };

  for (const [key, original] of Object.entries(originalFactors)) {
    const override = overrides[key];
    if (override !== undefined) {
      const met = override === 'partial' ? true : override;
      // 'partial' gives half credit (e.g. site-specific WUE but estimated grid water)
      const points = override === 'partial'
        ? Math.round(maxPoints[key] / 2)
        : (met ? maxPoints[key] : 0);
      const detail = override === 'partial'
        ? (original.detail || '') + ' (grid water uses national default — partial credit)'
        : original.detail;
      factors[key] = { ...original, met, points, detail };
    } else {
      factors[key] = { ...original };
    }
    total += factors[key].points;
  }

  return { confidence_factors: factors, confidence_score: total };
}

// --- General-energy tier guardrails ---
// AI-supplied wattage is clamped to this range to prevent hallucinated outliers.
// 0.1 W = tiny IoT sensor. 50000 W = industrial equipment / EV fast charging.
export const GENERAL_WATTS_MIN = 0.1;
export const GENERAL_WATTS_MAX = 50000;
// Confidence tier caps:
//   Quick estimate (general_energy, AI wattage only): 15%
//   Researched (Sonnet + sources, draft in Redis):    50%
//   Verified (admin promoted to attributed/cited):    60%+
export const GENERAL_CONFIDENCE_CAP = 15;
export const RESEARCHED_CONFIDENCE_CAP = 50;
export const VERIFIED_CONFIDENCE_FLOOR = 60;

/**
 * Clamp an AI-supplied wattage value to a realistic range.
 * Returns the clamped number (in watts) and a flag indicating whether clamping occurred.
 */
export function clampGeneralWatts(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return { value: GENERAL_WATTS_MIN, clamped: true, reason: 'invalid' };
  }
  if (n < GENERAL_WATTS_MIN) return { value: GENERAL_WATTS_MIN, clamped: true, reason: 'below_min' };
  if (n > GENERAL_WATTS_MAX) return { value: GENERAL_WATTS_MAX, clamped: true, reason: 'above_max' };
  return { value: n, clamped: false, reason: null };
}

/**
 * Build confidence factors for a general_energy result. All published-source
 * credit is withheld, total is capped at GENERAL_CONFIDENCE_CAP.
 */
export function buildGeneralEnergyConfidence({ energySource, deviceMeasured = false }) {
  const factors = {
    energy_source_published: {
      met: false,
      detail: 'No published source — AI-estimated wattage from typical device ratings',
      points: 0,
    },
    wue_provider_specific: {
      met: false,
      detail: 'Using industry average WUE (1.8 L/kWh)',
      points: 0,
    },
    multi_source_verified: {
      met: false,
      detail: 'Single AI estimate, not multi-source verified',
      points: 0,
    },
    direct_not_extrapolated: {
      met: false,
      detail: energySource ? `Extrapolated from ${energySource}` : 'Extrapolated from typical device wattage',
      points: 0,
    },
    regional_specific: {
      met: false,
      detail: 'No region specified, using industry average',
      points: 0,
    },
    data_under_2_years: {
      met: true,
      detail: 'Estimate generated now from current AI knowledge',
      points: 10,
    },
    device_energy_measured: {
      met: deviceMeasured,
      detail: deviceMeasured ? 'Device energy from measured wattage data' : 'Estimated wattage, not measured',
      points: deviceMeasured ? 5 : 0,
    },
  };

  let total = Object.values(factors).reduce((sum, f) => sum + f.points, 0);
  if (total > GENERAL_CONFIDENCE_CAP) total = GENERAL_CONFIDENCE_CAP;
  return { factors, score: total };
}

// --- Estimated-tier guardrails ---
// AI-supplied kWh values are clamped to this range to prevent hallucinated outliers.
export const ESTIMATED_KWH_MIN = 0.001;
export const ESTIMATED_KWH_MAX = 50;
// AI-supplied estimates are capped at this overall confidence score.
export const ESTIMATED_CONFIDENCE_CAP = 50;

/**
 * Clamp an AI-supplied kWh/unit value to a realistic range.
 * Returns the clamped number and a flag indicating whether clamping occurred.
 */
export function clampEstimatedKwh(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return { value: ESTIMATED_KWH_MIN, clamped: true, reason: 'invalid' };
  }
  if (n < ESTIMATED_KWH_MIN) return { value: ESTIMATED_KWH_MIN, clamped: true, reason: 'below_min' };
  if (n > ESTIMATED_KWH_MAX) return { value: ESTIMATED_KWH_MAX, clamped: true, reason: 'above_max' };
  return { value: n, clamped: false, reason: null };
}

/**
 * Build the confidence factor set for an AI-estimated entry.
 * All published-source and multi-source factors are forced to false, and the
 * total is capped at ESTIMATED_CONFIDENCE_CAP regardless of what is met.
 */
export function buildEstimatedConfidence({ similarTo, deviceMeasured = false }) {
  const factors = {
    energy_source_published: {
      met: false,
      detail: 'No published source — AI-estimated from similar activities',
      points: 0,
    },
    wue_provider_specific: {
      met: false,
      detail: 'Using industry average WUE (1.8 L/kWh)',
      points: 0,
    },
    multi_source_verified: {
      met: false,
      detail: 'Single AI estimate, not multi-source verified',
      points: 0,
    },
    direct_not_extrapolated: {
      met: false,
      detail: `Extrapolated from ${similarTo || 'a similar activity'}`,
      points: 0,
    },
    regional_specific: {
      met: false,
      detail: 'No region specified, using industry average',
      points: 0,
    },
    data_under_2_years: {
      met: true,
      detail: 'Estimate generated now from current AI knowledge',
      points: 10,
    },
    device_energy_measured: {
      met: deviceMeasured,
      detail: deviceMeasured ? 'Device energy from measured wattage data' : 'No device energy (server only)',
      points: deviceMeasured ? 5 : 0,
    },
  };

  let total = Object.values(factors).reduce((sum, f) => sum + f.points, 0);
  if (total > ESTIMATED_CONFIDENCE_CAP) total = ESTIMATED_CONFIDENCE_CAP;
  return { factors, score: total };
}

/**
 * Calculate meta water cost from token count.
 *
 * DESIGN DECISION: Meta-cost stays site-only (WUE × energy). The daily
 * water bottle tracks direct cooling water, not grid-generation water.
 * This keeps the bottle metric comparable across sessions and avoids
 * inflating the "cost of using this tool" with upstream grid water that
 * the user has no control over.
 */
export function calculateMetaWater(totalTokens, wue = DEFAULT_WUE) {
  const wh = totalTokens * 0.14 / 1000;
  const waterMl = wh * wue;
  return waterMl;
}

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
export const REGIONS = {
  // Global default
  industry_average: {
    label: 'Global Average',
    wue: 1.8,
    multiplier: 1.0,
    water_stress: 'varies',
    estimated: false,
  },

  // North America
  us_southwest_arizona: {
    label: 'US — Southwest (Arizona)',
    wue: 1.52,
    multiplier: 0.84,
    water_stress: 'critical',
    estimated: false,
  },
  us_virginia: {
    label: 'US — East Coast (Virginia)',
    wue: 1.40,
    multiplier: 0.78,
    water_stress: 'moderate',
    estimated: false,
  },
  us_iowa: {
    label: 'US — Midwest (Iowa)',
    wue: 1.00,
    multiplier: 0.56,
    water_stress: 'low_to_moderate',
    estimated: false,
  },
  us_texas_san_antonio: {
    label: 'US — Texas (San Antonio)',
    wue: 1.30,
    multiplier: 0.72,
    water_stress: 'moderate_to_high',
    estimated: false,
  },
  us_oregon: {
    label: 'US — Pacific Northwest (Oregon)',
    wue: 0.80,
    multiplier: 0.44,
    water_stress: 'low',
    estimated: false,
  },
  us_california: {
    label: 'US — California',
    wue: 1.45,
    multiplier: 0.81,
    water_stress: 'high',
    estimated: true,
  },
  us_northeast: {
    label: 'US — Northeast (NYC/NJ)',
    wue: 1.20,
    multiplier: 0.67,
    water_stress: 'low_to_moderate',
    estimated: true,
  },
  us_chicago: {
    label: 'US — Chicago Metro',
    wue: 1.10,
    multiplier: 0.61,
    water_stress: 'low_to_moderate',
    estimated: true,
  },
  us_southeast: {
    label: 'US — Southeast (Atlanta)',
    wue: 1.35,
    multiplier: 0.75,
    water_stress: 'moderate',
    estimated: true,
  },
  canada: {
    label: 'Canada',
    wue: 0.70,
    multiplier: 0.39,
    water_stress: 'low',
    estimated: true,
  },
  mexico: {
    label: 'Mexico',
    wue: 1.90,
    multiplier: 1.06,
    water_stress: 'moderate_to_high',
    estimated: true,
  },

  // South America
  brazil: {
    label: 'Brazil',
    wue: 1.50,
    multiplier: 0.83,
    water_stress: 'moderate',
    estimated: true,
  },
  chile: {
    label: 'Chile',
    wue: 1.60,
    multiplier: 0.89,
    water_stress: 'moderate_to_high',
    estimated: true,
  },

  // Europe
  nordics: {
    label: 'Northern Europe (Nordics)',
    wue: 0.30,
    multiplier: 0.17,
    water_stress: 'minimal',
    estimated: false,
  },
  ireland: {
    label: 'Western Europe (Ireland)',
    wue: 0.60,
    multiplier: 0.33,
    water_stress: 'low',
    estimated: false,
  },
  netherlands: {
    label: 'Western Europe (Netherlands)',
    wue: 0.50,
    multiplier: 0.28,
    water_stress: 'low',
    estimated: false,
  },
  germany: {
    label: 'Central Europe (Germany)',
    wue: 0.55,
    multiplier: 0.31,
    water_stress: 'low',
    estimated: true,
  },
  uk: {
    label: 'United Kingdom',
    wue: 0.55,
    multiplier: 0.31,
    water_stress: 'low',
    estimated: true,
  },
  southern_europe: {
    label: 'Southern Europe (Spain, Italy)',
    wue: 1.20,
    multiplier: 0.67,
    water_stress: 'moderate',
    estimated: true,
  },

  // Middle East & Africa
  middle_east_uae: {
    label: 'Middle East (UAE, Saudi Arabia)',
    wue: 2.40,
    multiplier: 1.33,
    water_stress: 'extreme',
    estimated: false,
  },
  israel: {
    label: 'Middle East (Israel)',
    wue: 1.80,
    multiplier: 1.0,
    water_stress: 'high',
    estimated: true,
  },
  south_africa: {
    label: 'Southern Africa',
    wue: 1.70,
    multiplier: 0.94,
    water_stress: 'high',
    estimated: true,
  },
  north_africa: {
    label: 'North Africa (Egypt, Morocco)',
    wue: 2.20,
    multiplier: 1.22,
    water_stress: 'high',
    estimated: true,
  },
  west_africa: {
    label: 'West Africa (Nigeria, Ghana)',
    wue: 2.00,
    multiplier: 1.11,
    water_stress: 'moderate_to_high',
    estimated: true,
  },

  // Asia
  india_mumbai: {
    label: 'South Asia (India)',
    wue: 2.00,
    multiplier: 1.11,
    water_stress: 'high',
    estimated: false,
  },
  singapore: {
    label: 'Southeast Asia (Singapore)',
    wue: 0.20,
    multiplier: 0.11,
    water_stress: 'managed',
    estimated: false,
  },
  southeast_asia: {
    label: 'Southeast Asia (Indonesia, Thailand)',
    wue: 1.80,
    multiplier: 1.0,
    water_stress: 'moderate',
    estimated: true,
  },
  china_east: {
    label: 'East Asia (China — coastal)',
    wue: 1.40,
    multiplier: 0.78,
    water_stress: 'moderate',
    estimated: true,
  },
  china_west: {
    label: 'East Asia (China — inland)',
    wue: 2.10,
    multiplier: 1.17,
    water_stress: 'high',
    estimated: true,
  },
  japan: {
    label: 'East Asia (Japan)',
    wue: 0.90,
    multiplier: 0.50,
    water_stress: 'low',
    estimated: true,
  },
  south_korea: {
    label: 'East Asia (South Korea)',
    wue: 1.00,
    multiplier: 0.56,
    water_stress: 'low_to_moderate',
    estimated: true,
  },

  // Oceania
  australia: {
    label: 'Australia',
    wue: 1.50,
    multiplier: 0.83,
    water_stress: 'moderate_to_high',
    estimated: true,
  },
  new_zealand: {
    label: 'New Zealand',
    wue: 0.60,
    multiplier: 0.33,
    water_stress: 'low',
    estimated: true,
  },
};

const DEFAULT_WUE = 1.8;

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
  { max: 150000, text: (ml) => `About ${Math.round(ml / 150)} bathtubs`, icon: 'bathtub' },
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
 * Recalculate water cost from editable parameters.
 */
export function recalculate({ activity_kwh, duration = 1, device_key = 'none', region_key = 'industry_average', duration_hours = 1, custom_device_watts = 0 }) {
  let device = DEVICES[device_key] || DEVICES.none;
  // Handle custom device wattage
  if (device_key === 'custom' && custom_device_watts > 0) {
    device = { label: `Custom (${custom_device_watts}W)`, kwh: custom_device_watts / 1000 };
  }
  const region = REGIONS[region_key] || REGIONS.industry_average;

  const base_kwh = activity_kwh * duration;
  const device_kwh = device.kwh * duration_hours;
  const total_kwh = base_kwh + device_kwh;
  const wue = region.wue;
  const water_liters = total_kwh * wue;
  const water_ml = water_liters * 1000;

  const comp = getComparison(water_ml);

  return {
    water_ml,
    water_display: formatWater(water_ml),
    comparison: comp.text,
    comparison_icon: comp.icon,
    total_kwh,
    base_kwh,
    device_kwh,
    wue,
    region_label: region.label,
    water_stress: region.water_stress,
    region_estimated: region.estimated || false,
  };
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
      const met = override;
      const points = met ? maxPoints[key] : 0;
      factors[key] = { ...original, met, points, detail: original.detail };
    } else {
      factors[key] = { ...original };
    }
    total += factors[key].points;
  }

  return { confidence_factors: factors, confidence_score: total };
}

/**
 * Calculate meta water cost from token count.
 */
export function calculateMetaWater(totalTokens, wue = DEFAULT_WUE) {
  const wh = totalTokens * 0.14 / 1000;
  const waterMl = wh * wue;
  return waterMl;
}

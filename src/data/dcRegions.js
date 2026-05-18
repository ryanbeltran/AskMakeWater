/**
 * dcRegions — Major US cloud data center regions with physical locations.
 *
 * Used by Phase 2A-3 to route user queries to the nearest data center
 * for their service's operator class, and to display real location data
 * in the Journey View.
 *
 * Drought/stress data comes from droughtStatus.json and waterStress.json
 * at the county level (keyed by county_key).
 */

export const DC_REGIONS = [
  // ─── AWS ─────────────────────────────────────────────────
  {
    region_id: 'us-east-1',
    operator: 'hyperscaler_aws',
    operator_label: 'AWS',
    city: 'Ashburn',
    county: 'Loudoun County',
    county_key: 'loudoun_va',
    state: 'VA',
    lat: 39.0438,
    lng: -77.4874,
    water_utility: 'Loudoun Water',
    watershed_name: 'Potomac River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.15,
  },
  {
    region_id: 'us-east-2',
    operator: 'hyperscaler_aws',
    operator_label: 'AWS',
    city: 'Columbus',
    county: 'Franklin County',
    county_key: 'franklin_oh',
    state: 'OH',
    lat: 39.9612,
    lng: -82.9988,
    water_utility: 'Columbus Water',
    watershed_name: 'Scioto River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.15,
  },
  {
    region_id: 'us-west-1',
    operator: 'hyperscaler_aws',
    operator_label: 'AWS',
    city: 'San Francisco',
    county: 'Santa Clara County',
    county_key: 'santa_clara_ca',
    state: 'CA',
    lat: 37.7749,
    lng: -122.4194,
    water_utility: 'SFPUC',
    watershed_name: 'San Francisco Bay',
    typical_cooling: 'air-cooled',
    wue_l_per_kwh: 0.10,
  },
  {
    region_id: 'us-west-2',
    operator: 'hyperscaler_aws',
    operator_label: 'AWS',
    city: 'Hermiston',
    county: 'Umatilla County',
    county_key: 'umatilla_or',
    state: 'OR',
    lat: 45.8399,
    lng: -119.2895,
    water_utility: 'Hermiston Water',
    watershed_name: 'Columbia River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.15,
  },

  // ─── Microsoft Azure ─────────────────────────────────────
  {
    region_id: 'east-us',
    operator: 'hyperscaler_msft',
    operator_label: 'Azure',
    city: 'Boydton',
    county: 'Mecklenburg County',
    county_key: 'mecklenburg_va',
    state: 'VA',
    lat: 36.6676,
    lng: -78.3895,
    water_utility: 'Lake Gaston Water',
    watershed_name: 'Roanoke River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
  {
    region_id: 'east-us-2',
    operator: 'hyperscaler_msft',
    operator_label: 'Azure',
    city: 'Boydton',
    county: 'Mecklenburg County',
    county_key: 'mecklenburg_va',
    state: 'VA',
    lat: 36.6676,
    lng: -78.3895,
    water_utility: 'Lake Gaston Water',
    watershed_name: 'Roanoke River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
  {
    region_id: 'west-us-2',
    operator: 'hyperscaler_msft',
    operator_label: 'Azure',
    city: 'Quincy',
    county: 'Grant County',
    county_key: 'grant_wa',
    state: 'WA',
    lat: 47.2343,
    lng: -119.8526,
    water_utility: 'Quincy Water',
    watershed_name: 'Columbia River',
    typical_cooling: 'air-cooled',
    wue_l_per_kwh: 0.10,
  },
  {
    region_id: 'central-us',
    operator: 'hyperscaler_msft',
    operator_label: 'Azure',
    city: 'Des Moines',
    county: 'Polk County',
    county_key: 'polk_ia',
    state: 'IA',
    lat: 41.5868,
    lng: -93.6250,
    water_utility: 'Des Moines Water Works',
    watershed_name: 'Des Moines River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
  {
    region_id: 'south-central-us',
    operator: 'hyperscaler_msft',
    operator_label: 'Azure',
    city: 'San Antonio',
    county: 'Bexar County',
    county_key: 'bexar_tx',
    state: 'TX',
    lat: 29.4241,
    lng: -98.4936,
    water_utility: 'SAWS',
    watershed_name: 'Edwards Aquifer',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.25,
  },

  // ─── Google Cloud ────────────────────────────────────────
  {
    region_id: 'us-central1',
    operator: 'hyperscaler_gcp',
    operator_label: 'Google Cloud',
    city: 'Council Bluffs',
    county: 'Pottawattamie County',
    county_key: 'pottawattamie_ia',
    state: 'IA',
    lat: 41.2619,
    lng: -95.8608,
    water_utility: 'Council Bluffs Water Works',
    watershed_name: 'Missouri River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.10,
  },
  {
    region_id: 'us-east1',
    operator: 'hyperscaler_gcp',
    operator_label: 'Google Cloud',
    city: 'Moncks Corner',
    county: 'Berkeley County',
    county_key: 'berkeley_sc',
    state: 'SC',
    lat: 33.1960,
    lng: -80.0148,
    water_utility: 'Berkeley County Water',
    watershed_name: 'Cooper River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.10,
  },
  {
    region_id: 'us-east4',
    operator: 'hyperscaler_gcp',
    operator_label: 'Google Cloud',
    city: 'Ashburn',
    county: 'Loudoun County',
    county_key: 'loudoun_va',
    state: 'VA',
    lat: 39.0438,
    lng: -77.4874,
    water_utility: 'Loudoun Water',
    watershed_name: 'Potomac River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.10,
  },
  {
    region_id: 'us-west1',
    operator: 'hyperscaler_gcp',
    operator_label: 'Google Cloud',
    city: 'The Dalles',
    county: 'Wasco County',
    county_key: 'wasco_or',
    state: 'OR',
    lat: 45.5946,
    lng: -121.1787,
    water_utility: 'The Dalles Water',
    watershed_name: 'Columbia River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.10,
  },

  // ─── Meta ────────────────────────────────────────────────
  {
    region_id: 'meta-altoona',
    operator: 'hyperscaler_meta',
    operator_label: 'Meta',
    city: 'Altoona',
    county: 'Polk County',
    county_key: 'polk_ia',
    state: 'IA',
    lat: 41.6444,
    lng: -93.4685,
    water_utility: 'Altoona Water',
    watershed_name: 'Des Moines River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
  {
    region_id: 'meta-prineville',
    operator: 'hyperscaler_meta',
    operator_label: 'Meta',
    city: 'Prineville',
    county: 'Crook County',
    county_key: 'crook_or',
    state: 'OR',
    lat: 44.3008,
    lng: -120.7345,
    water_utility: 'City of Prineville',
    watershed_name: 'Crooked River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
  {
    region_id: 'meta-forest-city',
    operator: 'hyperscaler_meta',
    operator_label: 'Meta',
    city: 'Forest City',
    county: 'Rutherford County',
    county_key: 'rutherford_nc',
    state: 'NC',
    lat: 35.3340,
    lng: -81.8651,
    water_utility: 'Forest City Water',
    watershed_name: 'Broad River',
    typical_cooling: 'indirect evaporative',
    wue_l_per_kwh: 0.20,
  },
];

/**
 * Haversine distance between two lat/lng points in miles.
 */
export function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get the nearest DC region for a given operator class and user location.
 *
 * @param {string} operatorClass — e.g. 'hyperscaler_aws', 'hyperscaler_msft'
 * @param {number} userLat
 * @param {number} userLng
 * @returns {object} — DC region entry + distance_mi
 */
export function getNearestRegion(operatorClass, userLat, userLng) {
  // Map operator class to the operator field in DC_REGIONS
  const candidates = DC_REGIONS.filter(r => r.operator === operatorClass);

  // Fallback: if no regions for this operator, use all AWS regions
  const pool = candidates.length > 0 ? candidates : DC_REGIONS.filter(r => r.operator === 'hyperscaler_aws');

  let best = pool[0];
  let bestDist = Infinity;

  for (const region of pool) {
    const d = haversineMiles(userLat, userLng, region.lat, region.lng);
    if (d < bestDist) {
      best = region;
      bestDist = d;
    }
  }

  return {
    ...best,
    distance_mi: Math.round(bestDist),
  };
}

export default DC_REGIONS;

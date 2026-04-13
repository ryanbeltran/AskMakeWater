/**
 * US zip code → data center region mapping.
 *
 * Maps every 3-digit zip prefix to the nearest major data center cluster.
 * This is an approximation — the actual facility serving a request depends
 * on the service, CDN topology, and load balancing, not just user location.
 *
 * Major US data center clusters:
 *   Northern Virginia (Ashburn) — world's largest DC concentration
 *   Pacific Northwest (Oregon/Washington) — Google, Facebook, Apple
 *   Iowa (Altoona/Des Moines) — Facebook, Google, Microsoft
 *   Arizona (Phoenix/Mesa) — Apple, CyrusOne, large solar DC builds
 *   Texas (Dallas/San Antonio) — Microsoft, Rackspace, CyrusOne
 *   Chicago (Aurora/Elk Grove Village) — major interconnection hub
 *   Southeast (Atlanta) — growing DC market, Equinix, QTS
 *   Northeast (NYC/NJ) — financial DCs, Equinix, major peering
 *   California (Santa Clara, LA) — Silicon Valley legacy, cloud HQs
 */

// Each entry: [startPrefix, endPrefix, regionKey]
// Ranges are inclusive on both ends. Prefix is the first 3 digits of a zip code.
const ZIP_RANGES = [
  // === Northeast ===
  // New England
  [10, 27, 'us_northeast'],    // MA
  [28, 29, 'us_northeast'],    // RI
  [30, 38, 'us_northeast'],    // NH
  [39, 49, 'us_northeast'],    // ME, VT
  [50, 59, 'us_northeast'],    // VT
  [60, 69, 'us_northeast'],    // CT
  // New Jersey
  [70, 89, 'us_northeast'],    // NJ
  // New York
  [100, 149, 'us_northeast'],  // NY

  // Pennsylvania — between Northeast and Virginia clusters
  [150, 196, 'us_northeast'],  // PA

  // === Virginia / Mid-Atlantic (Data Center Alley) ===
  [200, 205, 'us_virginia'],   // DC
  [206, 219, 'us_virginia'],   // MD
  [220, 246, 'us_virginia'],   // VA
  [247, 268, 'us_virginia'],   // WV

  // === Southeast ===
  // North Carolina — growing DC market (Charlotte, Durham)
  [270, 289, 'us_southeast'],  // NC
  // South Carolina
  [290, 299, 'us_southeast'],  // SC
  // Georgia — Atlanta is a major DC hub
  [300, 319, 'us_southeast'],  // GA
  // Florida
  [320, 349, 'us_southeast'],  // FL
  // Alabama
  [350, 369, 'us_southeast'],  // AL
  // Tennessee
  [370, 385, 'us_southeast'],  // TN
  // Mississippi
  [386, 397, 'us_southeast'],  // MS

  // === Chicago / Midwest East ===
  // Kentucky
  [400, 427, 'us_chicago'],    // KY
  // Ohio
  [430, 458, 'us_chicago'],    // OH
  // Indiana
  [460, 479, 'us_chicago'],    // IN
  // Michigan
  [480, 499, 'us_chicago'],    // MI

  // === Iowa / Upper Midwest ===
  // Iowa — major Facebook, Google, Microsoft DCs
  [500, 528, 'us_iowa'],       // IA
  // Wisconsin
  [530, 549, 'us_iowa'],       // WI
  // Minnesota
  [550, 567, 'us_iowa'],       // MN
  // South Dakota
  [570, 577, 'us_iowa'],       // SD
  // North Dakota
  [580, 588, 'us_iowa'],       // ND

  // === Illinois / Missouri → Chicago hub ===
  [600, 629, 'us_chicago'],    // IL
  [630, 658, 'us_chicago'],    // MO

  // === Kansas / Nebraska → Iowa cluster (nearest) ===
  [660, 679, 'us_iowa'],       // KS
  [680, 693, 'us_iowa'],       // NE

  // === South Central → Texas ===
  // Louisiana
  [700, 714, 'us_texas_san_antonio'], // LA
  // Arkansas
  [716, 729, 'us_texas_san_antonio'], // AR
  // Oklahoma
  [730, 749, 'us_texas_san_antonio'], // OK
  // Texas
  [750, 799, 'us_texas_san_antonio'], // TX

  // === Mountain West ===
  // Colorado — some DC presence but closest major cluster varies
  [800, 816, 'us_iowa'],              // CO → Iowa (Microsoft cluster)
  // Wyoming
  [820, 831, 'us_iowa'],              // WY
  // Idaho → Pacific Northwest
  [832, 838, 'us_oregon'],            // ID
  // Utah → closest to Arizona cluster
  [840, 847, 'us_southwest_arizona'], // UT
  // Arizona — Apple, CyrusOne, major solar DC builds
  [850, 865, 'us_southwest_arizona'], // AZ
  // New Mexico
  [870, 884, 'us_southwest_arizona'], // NM
  // Nevada → California cluster
  [889, 898, 'us_california'],        // NV

  // === West Coast ===
  // California
  [900, 961, 'us_california'],        // CA
  // Hawaii → nearest is California
  [967, 968, 'us_california'],        // HI
  // Oregon — major Google, Facebook, Apple DCs
  [970, 979, 'us_oregon'],            // OR
  // Washington
  [980, 994, 'us_oregon'],            // WA
  // Alaska → nearest is Oregon/Washington
  [995, 999, 'us_oregon'],            // AK
];

// Region metadata with brief explanations of why WUE differs
const REGION_CONTEXT = {
  us_northeast: {
    label: 'Northeast (NYC/NJ)',
    reason: 'Cold winters enable free cooling for much of the year, but hot humid summers require mechanical cooling.',
  },
  us_virginia: {
    label: 'Northern Virginia (Data Center Alley)',
    reason: 'The world\'s largest data center concentration. Humid subtropical climate means significant cooling demand in summer.',
  },
  us_southeast: {
    label: 'Southeast (Atlanta)',
    reason: 'Hot, humid climate increases cooling water demand. Growing data center market with expanding capacity.',
  },
  us_chicago: {
    label: 'Chicago Metro',
    reason: 'Cold winters help with free cooling, but hot summers still require evaporative cooling. Major interconnection hub.',
  },
  us_iowa: {
    label: 'Iowa / Upper Midwest',
    reason: 'Cold climate with long free-cooling seasons. Wind energy is abundant, reducing grid water intensity.',
  },
  us_texas_san_antonio: {
    label: 'Central Texas',
    reason: 'Hot climate drives higher cooling loads. Water stress is moderate to high in much of the region.',
  },
  us_southwest_arizona: {
    label: 'Southwest (Arizona)',
    reason: 'Extreme heat requires heavy cooling. Despite low humidity (good for evaporative cooling), water stress is critical.',
  },
  us_california: {
    label: 'California',
    reason: 'Mediterranean climate varies by location. Water stress is high statewide. Major cloud provider presence in Silicon Valley and LA.',
  },
  us_oregon: {
    label: 'Pacific Northwest (Oregon/Washington)',
    reason: 'Cool, mild climate means minimal cooling needed. Abundant hydroelectric power has low water intensity. Lowest WUE in the US.',
  },
};

/**
 * Look up the data center region for a US zip code.
 * @param {string} zip - 5-digit US zip code
 * @returns {{ region_key: string, context: object } | null}
 */
export function lookupZipRegion(zip) {
  if (!zip || typeof zip !== 'string') return null;

  // Extract 3-digit prefix
  const cleaned = zip.replace(/\D/g, '');
  if (cleaned.length < 3) return null;

  const prefix = parseInt(cleaned.substring(0, 3), 10);
  if (isNaN(prefix)) return null;

  for (const [start, end, regionKey] of ZIP_RANGES) {
    if (prefix >= start && prefix <= end) {
      return {
        region_key: regionKey,
        context: REGION_CONTEXT[regionKey] || null,
      };
    }
  }

  return null;
}

/**
 * Check if a string looks like a valid US zip code (5 digits or 5+4).
 */
export function isValidUSZip(zip) {
  return /^\d{5}(-\d{4})?$/.test(zip?.trim());
}

export { REGION_CONTEXT };

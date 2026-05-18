/**
 * zipToLocation — Given a 5-digit US ZIP, return location metadata.
 *
 * Uses a compact 3-digit prefix lookup (~34 KB) instead of the full
 * zipcodes package (~4.7 MB) to keep the client bundle small.
 * Each prefix maps to the most common city, state, and average lat/lng.
 *
 * Phase 2A-3: utility and watershed are state-level rollups.
 * County-level granularity comes later.
 */
import prefixes from './zipPrefixes.json';

// State-level utility and watershed hints.
const STATE_ENRICHMENT = {
  AL: { utility: 'Alabama Power', watershed: 'Mobile River' },
  AK: { utility: 'Golden Valley Electric', watershed: 'Yukon River' },
  AZ: { utility: 'Arizona Public Service', watershed: 'Colorado River' },
  AR: { utility: 'Entergy Arkansas', watershed: 'Arkansas River' },
  CA: { utility: 'Pacific Gas & Electric', watershed: 'Sacramento River' },
  CO: { utility: 'Xcel Energy', watershed: 'South Platte River' },
  CT: { utility: 'Eversource Energy', watershed: 'Connecticut River' },
  DE: { utility: 'Delmarva Power', watershed: 'Delaware River' },
  DC: { utility: 'Pepco', watershed: 'Potomac River' },
  FL: { utility: 'Florida Power & Light', watershed: 'Everglades' },
  GA: { utility: 'Georgia Power', watershed: 'Chattahoochee River' },
  HI: { utility: 'Hawaiian Electric', watershed: 'Pacific Islands' },
  ID: { utility: 'Idaho Power', watershed: 'Snake River' },
  IL: { utility: 'ComEd', watershed: 'Illinois River' },
  IN: { utility: 'Indiana Michigan Power', watershed: 'Wabash River' },
  IA: { utility: 'MidAmerican Energy', watershed: 'Des Moines River' },
  KS: { utility: 'Evergy', watershed: 'Kansas River' },
  KY: { utility: 'Kentucky Utilities', watershed: 'Ohio River' },
  LA: { utility: 'Entergy Louisiana', watershed: 'Mississippi River' },
  ME: { utility: 'Central Maine Power', watershed: 'Penobscot River' },
  MD: { utility: 'Baltimore Gas & Electric', watershed: 'Chesapeake Bay' },
  MA: { utility: 'National Grid', watershed: 'Connecticut River' },
  MI: { utility: 'DTE Energy', watershed: 'Great Lakes' },
  MN: { utility: 'Xcel Energy', watershed: 'Mississippi River' },
  MS: { utility: 'Entergy Mississippi', watershed: 'Mississippi River' },
  MO: { utility: 'Ameren Missouri', watershed: 'Missouri River' },
  MT: { utility: 'NorthWestern Energy', watershed: 'Missouri River' },
  NE: { utility: 'Omaha Public Power', watershed: 'Platte River' },
  NV: { utility: 'NV Energy', watershed: 'Colorado River' },
  NH: { utility: 'Eversource Energy', watershed: 'Merrimack River' },
  NJ: { utility: 'PSE&G', watershed: 'Delaware River' },
  NM: { utility: 'PNM Resources', watershed: 'Rio Grande' },
  NY: { utility: 'Con Edison', watershed: 'Hudson River' },
  NC: { utility: 'Duke Energy Carolinas', watershed: 'Yadkin River' },
  ND: { utility: 'Xcel Energy', watershed: 'Missouri River' },
  OH: { utility: 'AEP Ohio', watershed: 'Ohio River' },
  OK: { utility: 'Oklahoma Gas & Electric', watershed: 'Arkansas River' },
  OR: { utility: 'Portland General Electric', watershed: 'Columbia River' },
  PA: { utility: 'PECO Energy', watershed: 'Susquehanna River' },
  RI: { utility: 'Rhode Island Energy', watershed: 'Narragansett Bay' },
  SC: { utility: 'Duke Energy Carolinas', watershed: 'Santee River' },
  SD: { utility: 'Xcel Energy', watershed: 'Missouri River' },
  TN: { utility: 'Tennessee Valley Authority', watershed: 'Tennessee River' },
  TX: { utility: 'CPS Energy', watershed: 'Edwards Aquifer' },
  UT: { utility: 'Rocky Mountain Power', watershed: 'Great Salt Lake' },
  VT: { utility: 'Green Mountain Power', watershed: 'Lake Champlain' },
  VA: { utility: 'Dominion Energy', watershed: 'Potomac River' },
  WA: { utility: 'Puget Sound Energy', watershed: 'Columbia River' },
  WV: { utility: 'Appalachian Power', watershed: 'Kanawha River' },
  WI: { utility: 'WEC Energy Group', watershed: 'Wisconsin River' },
  WY: { utility: 'Rocky Mountain Power', watershed: 'North Platte River' },
};

/**
 * Look up a US ZIP code using 3-digit prefix.
 * @param {string} zip — 5-digit ZIP
 * @returns {{ city, state, lat, lng, primary_utility, watershed_hint } | null}
 */
export function lookupZip(zip) {
  if (!zip || !/^\d{5}$/.test(zip)) return null;

  const prefix = zip.slice(0, 3);
  const entry = prefixes[prefix];
  if (!entry) return null;

  const [city, state, lat, lng] = entry;
  const enrichment = STATE_ENRICHMENT[state] || {};

  return {
    city,
    state,
    lat,
    lng,
    primary_utility: enrichment.utility || 'Unknown utility',
    watershed_hint: enrichment.watershed || 'Unknown watershed',
  };
}

export default lookupZip;

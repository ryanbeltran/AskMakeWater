/**
 * WaterTrace — Water & Energy Journey View detail content.
 *
 * v1.13.0: Now detail-only. The JourneyMap and ZIP context line live in
 * ResultCard (always visible). This component renders the data path,
 * resource breakdown, total summary, and disclosure — consuming journey
 * data from the shared useJourneyContext hook via props.
 *
 * Props:
 *   journey       — computed journey object from useJourneyContext
 *   effectiveZip  — the ZIP being used (user-set or default)
 *   formatGridMix — formatter from the hook (re-exported from stateGridMix)
 *   activityName  — human-readable activity name
 */
import { useState } from 'react';
import TraceStage from './TraceStage';
import InputSubEntry from './InputSubEntry';
import WaterSourceBadges from './WaterSourceBadges';
import { buildBadgeProps } from '../hooks/useJourneyContext';

const UNMODELED_FACTORS = [
  'Time of day (grid mix shifts hourly)',
  'Seasonal variation (summer peak adds load + cooling demand)',
  'Embodied water in hardware (TV, servers, network gear)',
  'Renewable PPA claims vs delivered grid power',
  'Watershed return flows',
];

export default function WaterTrace({
  journey,
  effectiveZip = '',
  formatGridMix,
  activityName = 'digital activity',
}) {
  const [showDisclosure, setShowDisclosure] = useState(false);

  const fmt = (ml) => {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
    return `${Math.round(ml)} mL`;
  };
  const fmtKwh = (kwh) => {
    if (kwh < 0.01) return `${(kwh * 1000).toFixed(1)} Wh`;
    return `${kwh.toFixed(2)} kWh`;
  };

  if (!journey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm text-amber-800">
          Journey data unavailable. Try a different ZIP code.
        </p>
      </div>
    );
  }

  const isLocal = journey.mode === 'local';

  return (
    <div className="space-y-4">
      {/* ─── Section 1: THE DATA PATH (digital only) ─── */}
      {!isLocal && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
            The data path
          </p>

          <TraceStage
            emoji={journey.emoji}
            title="Your location"
            subtitle={`${journey.loc.city}, ${journey.loc.state} ${effectiveZip}`}
            facts={[
              `${journey.loc.primary_utility} local utility`,
              `Local grid: ${formatGridMix(journey.userGrid.grid_mix)}`,
              `Water context: ${journey.loc.watershed_hint}${journey.userDrought ? `, ${journey.userDrought.label.toLowerCase()}` : ''}`,
            ]}
            confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
            source={{ label: journey.userGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
          />

          {/* Round-trip distance indicator */}
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="text-gray-300 text-lg leading-none">↓</span>
            <span className="text-[11px] text-gray-400">
              data travels {journey.dcRegion.distance_mi.toLocaleString()} mi each way
            </span>
            <span className="text-gray-300 text-lg leading-none">↑</span>
          </div>

          <TraceStage
            emoji="🏢"
            title="Data center"
            subtitle={`${journey.dcRegion.operator_label} ${journey.dcRegion.region_id}, ${journey.dcRegion.city}, ${journey.dcRegion.state}`}
            facts={[
              `Cooling: ${journey.dcRegion.typical_cooling} · WUE ${journey.dcRegion.wue_l_per_kwh} L/kWh`,
              `${journey.dcRegion.county}, ${journey.dcRegion.state}`,
            ]}
            confidence="medium"
            source={{
              label: `${journey.dcRegion.operator_label} sustainability report`,
              url: journey.dcRegion.operator === 'hyperscaler_aws'
                ? 'https://sustainability.aboutamazon.com/2024-amazon-sustainability-report.pdf'
                : journey.dcRegion.operator === 'hyperscaler_gcp'
                ? 'https://sustainability.google/reports/google-2024-environmental-report/'
                : journey.dcRegion.operator === 'hyperscaler_msft'
                ? 'https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RW1lMjE'
                : 'https://sustainability.fb.com/2024-sustainability-report/',
            }}
          />
        </div>
      )}

      {/* ─── Section 2: WHAT IT TAKES TO RUN ─── */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
          What it takes to run
        </p>

        {/* Side-by-side grid — collapses to stacked at ≤500px */}
        <div className="grid grid-cols-1 min-[501px]:grid-cols-2 gap-2">

          {/* ── Power card (⚡ only) ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              <span className="mr-1">🔌</span> Power
            </p>

            <InputSubEntry
              side="your"
              utility={journey.userGrid.primary_utilities[0] || journey.loc.primary_utility}
              location={`${journey.loc.city}, ${journey.loc.state}`}
              confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
              metricType="energy"
              value={fmtKwh(journey.userEnergyKwh)}
              source={{ label: journey.userGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
            >
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {formatGridMix(journey.userGrid.grid_mix)}
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Water intensity: {journey.userGrid.grid_water_intensity_l_per_kwh} L/kWh
                {journey.userGrid.is_estimated && <span className="text-amber-600"> (estimated)</span>}
              </p>
            </InputSubEntry>

            {!isLocal && (
              <>
                <div className="border-t border-gray-200/60" />

                <InputSubEntry
                  side="datacenter"
                  utility={journey.dcGrid.primary_utilities[0] || 'Grid operator'}
                  location={`${journey.dcRegion.city}, ${journey.dcRegion.state}`}
                  confidence={journey.dcGrid.is_estimated ? 'medium' : 'high'}
                  metricType="energy"
                  value={fmtKwh(journey.dcEnergyKwh)}
                  source={{ label: journey.dcGrid.source, url: 'https://www.eia.gov/electricity/data/eia923/' }}
                >
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {formatGridMix(journey.dcGrid.grid_mix)}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Water intensity: {journey.dcGrid.grid_water_intensity_l_per_kwh} L/kWh
                    {journey.dcGrid.is_estimated && <span className="text-amber-600"> (estimated)</span>}
                  </p>
                </InputSubEntry>
              </>
            )}
          </div>

          {/* ── Water card (💧 only) ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              <span className="mr-1">💧</span> Water
            </p>

            <InputSubEntry
              side="your"
              utility={journey.loc.watershed_hint}
              location={`${journey.loc.primary_utility} · ${journey.loc.city}`}
              confidence={journey.userGrid.is_estimated ? 'medium' : 'high'}
              metricType="water"
              value={fmt(journey.userWaterMl)}
              breakdown="indirect, from your local grid"
              source={{ label: 'US Drought Monitor + local utility', url: 'https://droughtmonitor.unl.edu' }}
            >
              <WaterSourceBadges {...buildBadgeProps(journey.userDrought, journey.userStress)} />
            </InputSubEntry>

            {!isLocal && (
              <>
                <div className="border-t border-gray-200/60" />

                <InputSubEntry
                  side="datacenter"
                  utility={journey.dcRegion.watershed_name}
                  location={`${journey.dcRegion.water_utility} · ${journey.dcRegion.state}`}
                  confidence="medium"
                  metricType="water"
                  value={fmt(journey.dcWaterMl)}
                  breakdown={`${fmt(journey.dcGridWaterMl)} grid + ${fmt(journey.dcCoolingWaterMl)} cooling`}
                  source={{ label: `US Drought Monitor + ${journey.dcRegion.water_utility}`, url: 'https://droughtmonitor.unl.edu' }}
                >
                  <WaterSourceBadges {...buildBadgeProps(journey.dcDrought, journey.dcStress)} />
                </InputSubEntry>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Total water summary */}
      <div className="bg-mw-water-light/40 border border-mw-water/15 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-semibold text-gray-800">
          Total water for this query: ~{fmt(journey.totalWaterMl)}
        </p>
        <p className="text-xs text-gray-500">
          {isLocal
            ? '100% from power generation'
            : `${journey.pctGeneration}% from power generation, ${journey.pctCooling}% from cooling`
          }
        </p>
      </div>

      {/* What this journey doesn't yet model */}
      <div>
        <button
          onClick={() => setShowDisclosure(!showDisclosure)}
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${showDisclosure ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          What this journey doesn&apos;t yet model
        </button>

        {showDisclosure && (
          <ul className="mt-2 space-y-1 pl-4">
            {UNMODELED_FACTORS.map((factor, i) => (
              <li key={i} className="text-[11px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                <span className="mt-0.5 flex-shrink-0">&#8226;</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

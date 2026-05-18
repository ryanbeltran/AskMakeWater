/**
 * WaterTrace — Water & Energy Journey View content.
 *
 * Phase 2A-2: Two-section layout with two-sided sub-entries.
 *   Section 1 "The data path" — You ↔ Data center (pure context, no resource numbers)
 *   Section 2 "What it takes to run" — Power (⚡ only) | Water (💧 only)
 *     Each Section 2 card has "your side" and "data center side" sub-entries.
 *
 * Hardcoded San Antonio → Netflix example. Phase 2A-3 wires real per-ZIP data.
 */
import { useState } from 'react';
import TraceStage from './TraceStage';
import InputSubEntry from './InputSubEntry';
import WaterSourceBadges from './WaterSourceBadges';

// ─── Section heading ─────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
      {children}
    </p>
  );
}

// ─── Section 1 card data ─────────────────────────────────────────
// San Antonio 78228 → Netflix HD streaming (1 hr, 65" OLED TV)

// "You" card — pure path context, no resource numbers
// CPS Energy: municipal utility for San Antonio, TX.
// Edwards Aquifer: primary water source for San Antonio.
// Grid mix: EIA Form 861 for CPS Energy service territory (2023).
const YOU_CARD = {
  emoji: '📺',
  title: 'You',
  subtitle: 'San Antonio 78228',
  facts: [
    'CPS Energy local utility',
    '65" OLED TV uses ~0.12 kWh/hr',
    'Local grid: 47% gas, 22% coal, 28% renewable',
    'Water context: Edwards Aquifer, drought stage 2',
  ],
  confidence: 'high',
  source: { label: 'CPS Energy 2024', url: 'https://www.cpsenergy.com' },
};

// "Data center" card — pure path context
// Netflix uses AWS (us-east-1, Ashburn VA) for backend/encoding.
// AWS WUE: 0.15 L/kWh (Amazon 2024 Sustainability Report).
// "Data Center Alley" in Loudoun County handles ~70% of global
// internet traffic (Loudoun County Economic Development).
const DC_CARD = {
  emoji: '🏢',
  title: 'Data center',
  subtitle: 'AWS us-east-1, Ashburn, VA',
  facts: [
    'Cooling: indirect evaporative · WUE 0.15 L/kWh',
    'Data Center Alley — ~70% of global internet traffic',
  ],
  confidence: 'medium',
  source: {
    label: 'Amazon 2024 Sustainability Report',
    url: 'https://sustainability.aboutamazon.com/2024-amazon-sustainability-report.pdf',
  },
};

// Hardcoded distance San Antonio → Ashburn. Phase 2A-3 calculates real.
const DISTANCE_MI = '1,510';

const UNMODELED_FACTORS = [
  'Time of day (grid mix shifts hourly)',
  'Seasonal variation (summer peak adds load + cooling demand)',
  'Embodied water in hardware (TV, servers, network gear)',
  'Renewable PPA claims vs delivered grid power',
  'Watershed return flows',
];

export default function WaterTrace() {
  const [zip, setZip] = useState(() => {
    try { return localStorage.getItem('mw_user_zip') || ''; }
    catch { return ''; }
  });
  const [zipInput, setZipInput] = useState('');
  const [showDisclosure, setShowDisclosure] = useState(false);

  function handleSubmitZip(e) {
    e.preventDefault();
    const val = zipInput.trim();
    if (!val) return;
    try { localStorage.setItem('mw_user_zip', val); }
    catch { /* ignore */ }
    setZip(val);
  }

  function handleClearZip() {
    try { localStorage.removeItem('mw_user_zip'); }
    catch { /* ignore */ }
    setZip('');
    setZipInput('');
  }

  return (
    <div className="space-y-4">
      {/* ZIP input row */}
      {!zip ? (
        <form onSubmit={handleSubmitZip} className="flex items-center gap-2">
          <label className="text-xs text-gray-500 flex-shrink-0">Your ZIP code</label>
          <input
            type="text"
            value={zipInput}
            onChange={e => setZipInput(e.target.value)}
            placeholder="Enter your ZIP code"
            maxLength={10}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water min-w-0"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-sm font-medium text-white bg-mw-water rounded-lg hover:bg-mw-water-dark transition-colors cursor-pointer flex-shrink-0"
          >
            See the journey
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Showing journey for ZIP <strong className="text-gray-700">{zip}</strong></span>
          <button
            onClick={handleClearZip}
            className="text-mw-water hover:underline cursor-pointer"
          >
            (change)
          </button>
        </div>
      )}

      {/* Journey content — only shown after ZIP entry */}
      {zip && (
        <>
          {/* ─── Section 1: THE DATA PATH ─── */}
          <div className="space-y-3">
            <SectionHeading>The data path</SectionHeading>

            <TraceStage {...YOU_CARD} />

            {/* Round-trip distance indicator */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-gray-300 text-lg leading-none">↓</span>
              <span className="text-[11px] text-gray-400">
                data travels {DISTANCE_MI} mi each way
              </span>
              <span className="text-gray-300 text-lg leading-none">↑</span>
            </div>

            <TraceStage {...DC_CARD} />
          </div>

          {/* ─── Section 2: WHAT IT TAKES TO RUN ─── */}
          <div className="space-y-3">
            <SectionHeading>What it takes to run</SectionHeading>

            {/* Side-by-side grid — collapses to stacked at ≤500px */}
            <div className="grid grid-cols-1 min-[501px]:grid-cols-2 gap-2">

              {/* ── Power card (⚡ only — no water numbers here) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 mb-0.5">
                  <span className="mr-1">🔌</span> Power
                </p>
                <p className="text-[10px] text-gray-400 mb-2">
                  Renewable PPA claims ≠ delivered grid power
                </p>

                {/* Your side — CPS Energy, San Antonio */}
                {/* CPS Energy grid mix: EIA Form 861 (2023) */}
                <InputSubEntry
                  side="your"
                  utility="CPS Energy"
                  location="San Antonio, TX"
                  confidence="high"
                  metricType="energy"
                  value="0.12 kWh"
                >
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    47% gas · 22% coal · 28% renewable
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Water intensity: 4.2 L/kWh
                  </p>
                </InputSubEntry>

                <div className="border-t border-gray-200/60" />

                {/* Data center side — Dominion Energy, Virginia */}
                {/* Dominion fuel mix: EIA Form 923 (2024) */}
                {/* Grid water intensity ~4.2 L/kWh: EESI 2023 / LBNL/EIA for PJM */}
                <InputSubEntry
                  side="datacenter"
                  utility="Dominion Energy"
                  location="Ashburn, VA"
                  confidence="high"
                  metricType="energy"
                  value="0.09 kWh"
                >
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    33% gas · 31% nuclear · 12% coal · 6% solar · 18% other
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Water intensity: 4.2 L/kWh
                  </p>
                </InputSubEntry>

                {/* Source */}
                <a
                  href="https://www.eia.gov/electricity/data/eia923/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-mw-water transition-colors no-underline mt-1"
                >
                  Source: EIA Form 923 (2024)
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* ── Water card (💧 only — no energy numbers here) ── */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-800 mb-0.5">
                  <span className="mr-1">💧</span> Water
                </p>
                <p className="text-[10px] text-gray-400 mb-2">
                  Data center water demand projected to triple by 2030
                </p>

                {/* Your side — Edwards Aquifer, San Antonio */}
                {/* Drought: US Drought Monitor (D2, Stage 2 for Texas) */}
                {/* Stress: WRI Aqueduct 4.0 baseline */}
                <InputSubEntry
                  side="your"
                  utility="Edwards Aquifer"
                  location="SAWS · San Antonio"
                  confidence="high"
                  metricType="water"
                  value="504 mL"
                  breakdown="indirect, from your local grid"
                >
                  <WaterSourceBadges
                    drought={{
                      code: 'D2',
                      label: 'Severe drought',
                      color_key: 'orange',
                      regional_addendum: 'Stage 2',
                      source: 'US Drought Monitor',
                      as_of: '2026-05-13',
                    }}
                    stress={{
                      code: 'Medium-high',
                      label: 'Moderate stress',
                      color_key: 'light-orange',
                      source: 'WRI Aqueduct',
                    }}
                  />
                </InputSubEntry>

                <div className="border-t border-gray-200/60" />

                {/* Data center side — Potomac watershed, Loudoun Water */}
                {/* Drought: US Drought Monitor (D0) */}
                {/* Stress: WRI Aqueduct 4.0 baseline */}
                <InputSubEntry
                  side="datacenter"
                  utility="Potomac watershed"
                  location="Loudoun Water · VA"
                  confidence="high"
                  metricType="water"
                  value="405 mL"
                  breakdown="391 mL grid + 14 mL cooling"
                >
                  <WaterSourceBadges
                    drought={{
                      code: 'D0',
                      label: 'Abnormally dry',
                      color_key: 'yellow',
                      regional_addendum: null,
                      source: 'US Drought Monitor',
                      as_of: '2026-05-13',
                    }}
                    stress={{
                      code: 'Medium-high',
                      label: 'Moderate stress',
                      color_key: 'light-orange',
                      source: 'WRI Aqueduct',
                    }}
                  />
                </InputSubEntry>

                {/* Source */}
                <a
                  href="https://droughtmonitor.unl.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-mw-water transition-colors no-underline mt-1"
                >
                  Source: US Drought Monitor
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Total water summary */}
          <div className="bg-mw-water-light/40 border border-mw-water/15 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-gray-800">
              Total water for this 1-hour stream: ~1.8 L
            </p>
            <p className="text-xs text-gray-500">
              73% from power generation, 27% from cooling
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
        </>
      )}
    </div>
  );
}

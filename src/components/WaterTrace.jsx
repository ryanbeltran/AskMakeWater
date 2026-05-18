/**
 * WaterTrace — Water & Energy Journey View content.
 *
 * Preview release: hardcoded San Antonio → Netflix journey data.
 * Next release will wire to real per-ZIP lookups.
 */
import { useState } from 'react';
import TraceStage from './TraceStage';

// ─── Hardcoded preview journey data ───────────────────────────────
// San Antonio 78201 → Netflix HD streaming (1 hr, 65" OLED TV)
// Each stage cites its source in comments.

const TRACE_STAGES = [
  {
    // Stage 1: Viewer location
    // CPS Energy is the municipal utility for San Antonio, TX.
    // Edwards Aquifer is the primary water source for San Antonio.
    // Grid mix: EIA Form 861 for CPS Energy service territory (2023).
    stageNumber: 1,
    title: 'You',
    subtitle: 'San Antonio 78201',
    facts: [
      'CPS Energy local utility',
      '65" OLED TV uses ~0.12 kWh/hr',
      'Local grid: 47% gas, 22% coal, 28% renewable',
      'Water context: Edwards Aquifer, drought stage 2',
    ],
    confidence: 'high',
    source: { label: 'CPS Energy 2024', url: 'https://www.cpsenergy.com' },
  },
  {
    // Stage 2: Network
    // Netflix Open Connect: Netflix deploys ISP-embedded caches.
    // Network energy estimate from IEA 2020: ~0.001–0.007 kWh/hr for
    // streaming after Open Connect caching. We use 0.03 as conservative
    // upper bound including last-mile.
    stageNumber: 2,
    title: 'Network',
    subtitle: 'Likely Netflix Open Connect cache',
    facts: [
      'Routed through AT&T Texas peering (best guess)',
      'Edge distance ~5–25 mi',
      'Network energy ~0.03 kWh/hr',
    ],
    confidence: 'low',
    source: {
      label: 'IEA 2020 — Data centres and networks',
      url: 'https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines',
    },
  },
  {
    // Stage 3: Data center
    // Netflix uses AWS (us-east-1, Ashburn VA) for backend/encoding.
    // AWS WUE: 0.15 L/kWh (Amazon 2024 Sustainability Report).
    // "Data Center Alley" in Loudoun County handles ~70% of global
    // internet traffic (Loudoun County Economic Development).
    stageNumber: 3,
    title: 'Data center',
    subtitle: 'AWS us-east-1, Ashburn, VA',
    facts: [
      '1,510 mi from viewer',
      'Cooling: indirect evaporative · WUE 0.15 L/kWh',
      'Data Center Alley — ~70% of global internet traffic',
    ],
    confidence: 'medium',
    source: {
      label: 'Amazon 2024 Sustainability Report',
      url: 'https://sustainability.aboutamazon.com/2024-amazon-sustainability-report.pdf',
    },
  },
  {
    // Stage 4: Power source
    // Dominion Energy Virginia fuel mix from EIA Form 923 (2024).
    // Grid water intensity ~4.2 L/kWh estimated from EESI 2023 analysis
    // of LBNL/EIA data for the PJM Interconnect region.
    stageNumber: 4,
    title: 'Power source',
    subtitle: 'Dominion Energy Virginia',
    facts: [
      '33% gas, 31% nuclear, 12% coal, 6% solar, 18% other',
      'Grid water intensity ~4.2 L/kWh',
      'Renewable PPA claims ≠ delivered grid power',
    ],
    confidence: 'high',
    source: {
      label: 'EIA Form 923 (2024)',
      url: 'https://www.eia.gov/electricity/data/eia923/',
    },
  },
  {
    // Stage 5: Water source
    // Loudoun Water serves Loudoun County VA (data center corridor).
    // Source: Potomac River watershed.
    // Drought status from US Drought Monitor.
    // Projection: Loudoun County Comprehensive Plan projects data
    // center water demand tripling by 2030.
    stageNumber: 5,
    title: 'Water source',
    subtitle: 'Loudoun Water · Potomac watershed',
    facts: [
      'Drought status: D0 abnormally dry',
      'Data center water demand projected to triple by 2030',
      'Returns to Potomac — different watershed than viewer\'s',
      'Your water comes from Edwards Aquifer; data center pulls from Potomac',
    ],
    confidence: 'high',
    source: {
      label: 'US Drought Monitor',
      url: 'https://droughtmonitor.unl.edu',
    },
  },
];

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

      {/* Trace stages — only shown after ZIP entry */}
      {zip && (
        <>
          {/* Preview notice */}
          <p className="text-[10px] text-gray-400 italic leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
            Preview: currently shows a San Antonio → Netflix example for every ZIP.
            Real per-location routing is coming soon.
          </p>

          {/* 5-stage trace */}
          <div>
            {TRACE_STAGES.map((stage, i) => (
              <TraceStage
                key={stage.stageNumber}
                {...stage}
                isLast={i === TRACE_STAGES.length - 1}
              />
            ))}
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

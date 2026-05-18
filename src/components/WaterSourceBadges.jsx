/**
 * WaterSourceBadges — Standardized two-row badge display for water sources.
 *
 * Row 1: Short-term drought (US Drought Monitor, weekly)
 * Row 2: Long-term stress (WRI Aqueduct baseline)
 *
 * Each row: [Colored badge: "Code — Label"]  Term descriptor  [?]
 * Tap "?" to see the full scale for that indicator.
 */
import { useState } from 'react';

// ─── Color mapping ───────────────────────────────────────────────
const BADGE_COLORS = {
  'green':        { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200' },
  'yellow':       { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'light-orange': { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
  'orange':       { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'red':          { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' },
  'dark-red':     { bg: 'bg-red-200',    text: 'text-red-900',    border: 'border-red-300' },
};

// ─── Full scales for tooltip display ─────────────────────────────
const DROUGHT_SCALE = [
  { code: 'None', label: 'Normal conditions',   color_key: 'green' },
  { code: 'D0',   label: 'Abnormally dry',      color_key: 'yellow' },
  { code: 'D1',   label: 'Moderate drought',    color_key: 'light-orange' },
  { code: 'D2',   label: 'Severe drought',      color_key: 'orange' },
  { code: 'D3',   label: 'Extreme drought',     color_key: 'red' },
  { code: 'D4',   label: 'Exceptional drought', color_key: 'dark-red' },
];

const STRESS_SCALE = [
  { code: 'Low',         label: 'Low stress',            color_key: 'green' },
  { code: 'Low-medium',  label: 'Low-med stress',        color_key: 'yellow' },
  { code: 'Medium-high', label: 'Moderate stress',       color_key: 'light-orange' },
  { code: 'High',        label: 'High stress',           color_key: 'orange' },
  { code: 'Extreme',     label: 'Extreme stress',        color_key: 'red' },
  { code: 'Arid',        label: 'Arid / very low water', color_key: 'dark-red' },
];

function BadgeRow({ code, label, colorKey, termLabel, regionalAddendum, scale, activeCode }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = BADGE_COLORS[colorKey] || BADGE_COLORS.green;

  // Build display code — for Texas, prepend the aquifer stage
  const displayCode = regionalAddendum ? `${regionalAddendum} · ${code}` : code;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Colored badge */}
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} whitespace-nowrap`}>
          {displayCode} — {label}
        </span>

        {/* Term descriptor */}
        <span className="text-[10px] text-gray-400 whitespace-nowrap">{termLabel}</span>

        {/* ? button */}
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0 text-[10px] font-bold leading-none"
          aria-label={`Show ${termLabel} scale`}
        >
          ?
        </button>
      </div>

      {/* Tooltip: full scale */}
      {showTooltip && (
        <div className="absolute z-10 left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[200px] max-w-[260px]">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {termLabel === 'Short term' ? 'US Drought Monitor Scale' : 'WRI Aqueduct Stress Scale'}
          </p>
          <div className="space-y-1">
            {scale.map((item) => {
              const c = BADGE_COLORS[item.color_key] || BADGE_COLORS.green;
              const isActive = item.code === activeCode;
              return (
                <div
                  key={item.code}
                  className={`flex items-center gap-2 px-1.5 py-0.5 rounded ${isActive ? 'bg-gray-50 ring-1 ring-gray-300' : ''}`}
                >
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.bg} border ${c.border} flex-shrink-0`} />
                  <span className={`text-[10px] ${isActive ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                    {item.code} — {item.label}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Props:
 *   drought: { code, label, color_key, regional_addendum?, source, as_of }
 *   stress:  { code, label, color_key, source }
 */
export default function WaterSourceBadges({ drought, stress }) {
  if (!drought && !stress) return null;

  return (
    <div className="space-y-1.5">
      {/* Row 1: Short-term drought */}
      {drought && (
        <BadgeRow
          code={drought.code}
          label={drought.label}
          colorKey={drought.color_key}
          termLabel="Short term"
          regionalAddendum={drought.regional_addendum}
          scale={DROUGHT_SCALE}
          activeCode={drought.code}
        />
      )}

      {/* Row 2: Long-term stress */}
      {stress && (
        <BadgeRow
          code={stress.code}
          label={stress.label}
          colorKey={stress.color_key}
          termLabel="Long term"
          regionalAddendum={null}
          scale={STRESS_SCALE}
          activeCode={stress.code}
        />
      )}

      {/* Footnote */}
      <p className="text-[9px] text-gray-300 leading-relaxed mt-1">
        Short term updates weekly · Long term reflects structural water availability
      </p>
    </div>
  );
}

// Export scales for use by other components (e.g. map popups)
export { DROUGHT_SCALE, STRESS_SCALE, BADGE_COLORS };

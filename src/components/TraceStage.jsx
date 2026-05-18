/**
 * TraceStage — single card in the Water & Energy Journey View.
 *
 * Used in both vertical (data path) and side-by-side (power + water) layouts.
 * No numbered circles or connecting lines — parent handles layout.
 */
import { useState } from 'react';

const CONFIDENCE_STYLES = {
  high:         { bg: 'bg-green-100', text: 'text-green-800', label: 'High confidence' },
  medium:       { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium confidence' },
  low:          { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Low confidence' },
  'best-guess': { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Best guess' },
};

function MetricTooltip({ text, onClose }) {
  return (
    <div className="absolute z-10 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px] max-w-[240px]">
      <p className="text-[10px] text-gray-600 leading-relaxed">{text}</p>
      <button onClick={onClose} className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer">
        Close
      </button>
    </div>
  );
}

function MiniMetric({ emoji, value, tooltip }) {
  const [showTip, setShowTip] = useState(false);
  const isMuted = value === '—' || value === '?';

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <span className="text-[14px] leading-none">{emoji}</span>
      {isMuted ? (
        <button
          onClick={() => setShowTip(!showTip)}
          className="text-[11px] font-medium text-gray-300 cursor-help hover:text-gray-400 transition-colors"
        >
          {value}
        </button>
      ) : (
        <span className="text-[11px] font-medium text-gray-700">{value}</span>
      )}
      {showTip && tooltip && (
        <MetricTooltip text={tooltip} onClose={() => setShowTip(false)} />
      )}
    </div>
  );
}

/**
 * Props:
 *   emoji       — prepended to title (e.g. "📺")
 *   title       — card title (e.g. "You")
 *   subtitle    — secondary text
 *   facts       — array of bullet strings
 *   confidence  — 'high' | 'medium' | 'low' | 'best-guess'
 *   source      — { label, url }
 *   waterValue  — e.g. "504 mL", "—", "?"
 *   energyValue — e.g. "0.12 kWh", "—"
 *   waterTooltip  — tooltip text for "—" or "?" water values
 *   energyTooltip — tooltip text for "—" or "?" energy values
 *   children    — custom content slot (badges, charts, etc.)
 */
export default function TraceStage({
  emoji, title, subtitle, facts, confidence, source, children,
  waterValue, energyValue, waterTooltip, energyTooltip,
}) {
  const pill = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES['best-guess'];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
      {/* Header row: title+subtitle on left, confidence pill + mini-table on right */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">
            {emoji && <span className="mr-1">{emoji}</span>}
            {title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Right column: pill on top, mini-table below */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>

          {/* Mini-table: 💧 + value | ⚡ + value */}
          {(waterValue || energyValue) && (
            <div className="flex items-start gap-2.5">
              {waterValue && (
                <MiniMetric emoji="💧" value={waterValue} tooltip={waterTooltip} />
              )}
              {energyValue && (
                <MiniMetric emoji="⚡" value={energyValue} tooltip={energyTooltip} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Facts */}
      {facts && facts.length > 0 && (
        <ul className="space-y-1 mb-2">
          {facts.map((fact, i) => (
            <li key={i} className="text-xs text-gray-600 leading-relaxed flex items-start gap-1.5">
              <span className="text-mw-water mt-0.5 flex-shrink-0">&#8226;</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Custom content slot (badges, charts, etc.) */}
      {children && <div className="mb-2">{children}</div>}

      {/* Source link */}
      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-mw-water transition-colors no-underline"
        >
          Source: {source.label}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

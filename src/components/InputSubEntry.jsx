/**
 * InputSubEntry — "Your side" / "Data center side" sub-entry inside
 * the Power and Water parent cards in Section 2 of the Journey View.
 *
 * Each Power/Water card contains two of these, stacked vertically
 * with a separator between them.
 */
import { useState } from 'react';

const CONFIDENCE_STYLES = {
  high:         { bg: 'bg-green-100', text: 'text-green-800', label: 'High confidence' },
  medium:       { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium confidence' },
  low:          { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Low confidence' },
  'best-guess': { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Best guess' },
};

const SIDE_LABELS = {
  your: 'YOUR SIDE',
  datacenter: 'DATA CENTER SIDE',
};

const METRIC_EMOJI = {
  energy: '⚡',
  water: '💧',
};

function MetricTooltip({ text, onClose }) {
  return (
    <div className="absolute z-10 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[170px] max-w-[230px]">
      <p className="text-[10px] text-gray-600 leading-relaxed">{text}</p>
      <button onClick={onClose} className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer">
        Close
      </button>
    </div>
  );
}

/**
 * Props:
 *   side         — 'your' | 'datacenter'
 *   utility      — e.g. "CPS Energy" / "Edwards Aquifer"
 *   location     — e.g. "San Antonio, TX"
 *   confidence   — 'high' | 'medium' | 'low' | 'best-guess'
 *   metricType   — 'energy' | 'water'
 *   value        — e.g. "0.12 kWh" / "504 mL" / "—" / "?"
 *   valueTooltip — tooltip for "—" or "?" values
 *   breakdown    — optional sub-line e.g. "391 mL grid + 14 mL cooling"
 *   source       — optional { label, url } shown below facts
 *   children     — facts content (grid mix text, WaterSourceBadges, etc.)
 */
export default function InputSubEntry({
  side, utility, location, confidence, metricType, value,
  valueTooltip, breakdown, source, children,
}) {
  const [showTip, setShowTip] = useState(false);
  const pill = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES['best-guess'];
  const emoji = METRIC_EMOJI[metricType] || '⚡';
  const isMuted = value === '—' || value === '?';

  return (
    <div className="py-2.5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        {/* Left: side label + utility + location */}
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5"
            style={{ letterSpacing: '0.3px' }}
          >
            {SIDE_LABELS[side] || side}
          </p>
          <p className="text-[13px] font-medium text-gray-800 leading-snug">{utility}</p>
          <p className="text-[11px] text-gray-500">{location}</p>
        </div>

        {/* Right: confidence pill on top, single-metric mini-table below */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1.5 relative">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>

          {/* Single-metric mini-table */}
          <div className="flex flex-col items-center gap-0.5">
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
            {breakdown && (
              <span className="text-[10px] text-gray-400">{breakdown}</span>
            )}
          </div>

          {showTip && valueTooltip && (
            <MetricTooltip text={valueTooltip} onClose={() => setShowTip(false)} />
          )}
        </div>
      </div>

      {/* Facts content (grid mix, badges, etc.) */}
      {children && <div className="mt-2">{children}</div>}

      {/* Source link */}
      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-mw-water transition-colors no-underline mt-1.5"
        >
          Source: {source.label}
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}

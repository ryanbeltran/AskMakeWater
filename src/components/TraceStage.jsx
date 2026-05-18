/**
 * TraceStage — single stage card in the Water & Energy Journey View.
 *
 * Vertically stacked with a connecting line between cards.
 * Blue droplet accent for stage number, confidence pill in top-right.
 */

const CONFIDENCE_STYLES = {
  high:        { bg: 'bg-green-100', text: 'text-green-800', label: 'High confidence' },
  medium:      { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Medium confidence' },
  low:         { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Low confidence' },
  'best-guess': { bg: 'bg-gray-100', text: 'text-gray-600',  label: 'Best guess' },
};

export default function TraceStage({ stageNumber, title, subtitle, facts, confidence, source, isLast, children }) {
  const pill = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES['best-guess'];

  return (
    <div className="relative flex gap-3">
      {/* Left rail: stage circle + connecting line */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Droplet-accent circle */}
        <div className="w-8 h-8 rounded-full bg-mw-water-light border-2 border-mw-water flex items-center justify-center text-xs font-bold text-mw-water">
          {stageNumber}
        </div>
        {/* Connecting line to next stage */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-mw-water/20 mt-1" />
        )}
      </div>

      {/* Card content */}
      <div className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 ${isLast ? '' : 'mb-3'}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
            {pill.label}
          </span>
        </div>

        {/* Facts */}
        <ul className="space-y-1 mb-2">
          {facts.map((fact, i) => (
            <li key={i} className="text-xs text-gray-600 leading-relaxed flex items-start gap-1.5">
              <span className="text-mw-water mt-0.5 flex-shrink-0">&#8226;</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>

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
    </div>
  );
}

import { useState } from 'react';
import { formatWater } from '../data/recalculate';

const BOTTLE_ML = 500;

function bottleLabel(ml) {
  if (ml < 50) return null;
  const bottles = ml / BOTTLE_ML;
  if (bottles < 0.1) return null;
  if (bottles < 10) return `${bottles.toFixed(1)} bottles`;
  return `${Math.round(bottles)} bottles`;
}

/**
 * Horizontal bar chart: same activity, different power source.
 *
 * Sorted lowest → highest water cost. The baseline (US grid mix) is outlined
 * in mw-water so the user can see where the default falls in the range.
 * Collapsible to stay out of the way until the user opts in.
 */
export default function PowerSourceChart({ variants }) {
  const [open, setOpen] = useState(false);

  if (!variants || variants.length === 0) return null;

  const maxMl = Math.max(...variants.map(v => v.water_ml), 1);

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 text-left text-sm font-medium text-mw-water hover:bg-mw-water-light/50 transition-colors flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Same activity, different power source
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5">
          <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
            The electricity powering data centers comes from different sources, each with different water costs.
            This chart re-runs the same calculation against every published power source — the outlined bar is the US average grid mix baseline.
          </p>
          <div className="space-y-2">
            {variants.map(v => {
              const pct = Math.max((v.water_ml / maxMl) * 100, 1);
              const bottles = bottleLabel(v.water_ml);
              return (
                <div key={v.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-medium ${v.is_baseline ? 'text-mw-water' : 'text-gray-700'}`}>
                      {v.label}
                      {v.is_baseline && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-mw-water font-bold">baseline</span>}
                    </span>
                    <span className="tabular-nums text-gray-500">
                      {formatWater(v.water_ml)}
                      {bottles && <span className="text-gray-400"> · {bottles}</span>}
                    </span>
                  </div>
                  <div className={`h-4 rounded bg-gray-100 overflow-hidden ${v.is_baseline ? 'ring-2 ring-mw-water ring-offset-1' : ''}`}>
                    <div
                      className={`h-full rounded transition-all duration-500 ${
                        v.is_baseline
                          ? 'bg-mw-water'
                          : v.water_per_kwh < 0.5
                          ? 'bg-mw-forest'
                          : v.water_per_kwh < 2
                          ? 'bg-mw-solar'
                          : 'bg-mw-human'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {v.water_per_kwh} L/kWh
                    {v.source_citation && <span className="italic"> · {v.source_citation.slice(0, 80)}{v.source_citation.length > 80 ? '…' : ''}</span>}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 italic">
            Values reflect the published reference data for each source type, excluding draft entries.
          </p>
        </div>
      )}
    </div>
  );
}

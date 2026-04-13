import { useMemo } from 'react';
import { calculateModelComparison, getComparisonData } from '../data/aiModelComparison';
import { REGIONS, formatWater } from '../data/recalculate';

function ConfidenceDot({ level }) {
  const color = level === 'medium' ? 'bg-mw-solar' : 'bg-gray-300';
  const label = level === 'medium' ? 'Published data' : 'Estimate';
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[10px] text-gray-400">{label}</span>
    </span>
  );
}

export default function AIModelComparison({ comparisonType, regionKey = 'industry_average', count = 1, primaryActivityId }) {
  const region = REGIONS[regionKey] || REGIONS.industry_average;
  const wue = region.wue;

  const comparisonData = getComparisonData(comparisonType);
  const models = useMemo(
    () => calculateModelComparison(comparisonType, wue, count),
    [comparisonType, wue, count]
  );

  if (!comparisonData || models.length === 0) return null;

  const maxWaterMl = Math.max(...models.map(m => m.water_ml));

  // Find biggest difference for the highlight text
  const cheapest = models[0];
  const priciest = models[models.length - 1];
  const ratio = priciest.water_ml > 0 && cheapest.water_ml > 0
    ? Math.round(priciest.water_ml / cheapest.water_ml)
    : null;

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        How other models compare
      </h4>

      {/* Bar chart */}
      <div className="space-y-2">
        {models.map(model => {
          const barPct = maxWaterMl > 0 ? (model.water_ml / maxWaterMl) * 100 : 0;
          return (
            <div key={model.key} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-700 min-w-[120px]">
                  {model.label}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatWater(model.water_ml)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(barPct, 2)}%`,
                      backgroundColor: model.confidence === 'medium' ? '#2c6bdb' : '#94a3b8',
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 truncate">{model.provider}</span>
                <ConfidenceDot level={model.confidence} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlight comparison */}
      {ratio && ratio > 1 && (
        <div className="bg-mw-water-light/30 rounded-lg px-3 py-2 text-xs text-gray-600 leading-relaxed">
          <span className="font-medium text-gray-700">Key insight: </span>
          Asking {cheapest.label} uses roughly{' '}
          <span className="font-semibold text-mw-water">{ratio}x less water</span> than{' '}
          {priciest.label}
          {cheapest.confidence === 'medium'
            ? ', partly because their provider published energy figures and their typical data centers have low WUE.'
            : ', based on the best available estimates.'}
        </div>
      )}

      {/* Typical regions for each model */}
      <details className="group">
        <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-mw-water transition-colors">
          Where each model typically runs
        </summary>
        <div className="mt-1.5 space-y-1">
          {models.filter(m => m.typical_regions && m.typical_regions.length > 0).map(model => (
            <p key={model.key} className="text-[10px] text-gray-400">
              <span className="text-gray-500">{model.label}:</span>{' '}
              {model.typical_regions
                .map(rk => REGIONS[rk]?.label || rk)
                .join(', ')}
            </p>
          ))}
          {models.filter(m => m.note).map(model => (
            <p key={model.key + '-note'} className="text-[10px] text-gray-400 italic">
              {model.label}: {model.note}
            </p>
          ))}
        </div>
      </details>

      {/* Disclaimer */}
      <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-50 pt-2">
        Most AI companies don't publish per-query energy data. These estimates are based on the
        best available research and vary in confidence. Google's Gemini figure is self-reported.
        Most others are third-party estimates. Water cost calculated using{' '}
        {region.label} WUE ({wue} L/kWh).
      </p>
    </div>
  );
}

import { formatWater } from '../data/recalculate';

const BOTTLE_ML = 500;

function formatBottles(ml) {
  const bottles = ml / BOTTLE_ML;
  if (bottles < 0.01) return bottles.toFixed(3);
  if (bottles < 0.1) return bottles.toFixed(2);
  return bottles.toFixed(1);
}

function ConfidenceDot({ score }) {
  const color = score >= 60 ? 'bg-green-400' : score >= 35 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{score}%</span>
    </span>
  );
}

export default function ComparisonTable({ items, narrative }) {
  if (!items || items.length === 0) return null;

  // Find min and max water costs for highlighting
  const waterValues = items.map(i => i.water_ml);
  const maxWater = Math.max(...waterValues);
  const minWater = Math.min(...waterValues);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Narrative header */}
      {narrative && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Activity</th>
              <th className="px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Energy</th>
              <th className="px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Device</th>
              <th className="px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Water</th>
              <th className="px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Bottles</th>
              <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const isMax = items.length > 1 && item.water_ml === maxWater;
              const isMin = items.length > 1 && item.water_ml === minWater && minWater !== maxWater;

              return (
                <tr
                  key={i}
                  className={`border-b border-gray-50 last:border-b-0 ${
                    isMax ? 'bg-red-50/50' : isMin ? 'bg-green-50/50' : ''
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isMax && <span className="text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">MOST</span>}
                      {isMin && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">LEAST</span>}
                      <span className="font-medium text-gray-800">{item.activity}</span>
                    </div>
                    <span className="text-xs text-gray-400">{item.duration}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums">
                    {(item.editable_params.activity_kwh * (item.editable_params.duration || 1)).toFixed(4)} kWh
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums">
                    {item.calculated.device_kwh > 0
                      ? `${item.calculated.device_kwh.toFixed(4)} kWh`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-800 tabular-nums">
                    {item.water_display}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-500 tabular-nums text-xs">
                    {formatBottles(item.water_ml)}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-500">
                    <ConfidenceDot score={item.confidence_score} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {items.map((item, i) => {
          const isMax = items.length > 1 && item.water_ml === maxWater;
          const isMin = items.length > 1 && item.water_ml === minWater && minWater !== maxWater;

          return (
            <div
              key={i}
              className={`px-5 py-4 ${isMax ? 'bg-red-50/50' : isMin ? 'bg-green-50/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isMax && <span className="text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">MOST</span>}
                  {isMin && <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">LEAST</span>}
                  <span className="text-sm font-medium text-gray-800">{item.activity}</span>
                </div>
                <ConfidenceDot score={item.confidence_score} />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-400">{item.duration}</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-800">{item.water_display}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{formatBottles(item.water_ml)} bottles</span>
                </div>
              </div>
              {/* Mini breakdown */}
              <div className="flex gap-4 mt-1.5 text-[10px] text-gray-400">
                <span>Energy: {(item.editable_params.activity_kwh * (item.editable_params.duration || 1)).toFixed(4)} kWh</span>
                {item.calculated.device_kwh > 0 && (
                  <span>Device: {item.calculated.device_kwh.toFixed(4)} kWh</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      {items.length >= 2 && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {items.length} activities compared
            </span>
            <span>
              Spread: {formatWater(minWater)} — {formatWater(maxWater)}
              {maxWater > 0 && minWater > 0 && (
                <span className="ml-1.5 text-mw-water font-medium">
                  ({(maxWater / minWater).toFixed(1)}x difference)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

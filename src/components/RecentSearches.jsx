import { useState } from 'react';
import { getActivity } from '../data/activityLookup';
import { recalculate, DEVICES, REGIONS } from '../data/recalculate';

function ComparisonIcon({ type }) {
  const icons = {
    drop: '\uD83D\uDCA7',
    teaspoon: '\uD83E\uDD44',
    glass: '\uD83E\uDD5B',
    bottle: '\uD83C\uDF76',
    bathtub: '\uD83D\uDEC1',
  };
  return <span className="text-base">{icons[type] || icons.drop}</span>;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return 'today';
}

function ExpandedResult({ entry }) {
  const activity = getActivity(entry.activity_id);
  if (!activity) {
    return (
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-2">
        <p><span className="font-medium">Water cost:</span> {entry.water_display}</p>
        <p><span className="font-medium">Comparison:</span> {entry.comparison}</p>
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-2 space-y-1">
      <p><span className="font-medium text-gray-600">Activity:</span> {activity.label}</p>
      <p><span className="font-medium text-gray-600">Energy:</span> {activity.kwh} kWh/{activity.unit.replace(/s$/, '')}</p>
      <p><span className="font-medium text-gray-600">Water cost:</span> {entry.water_display}</p>
      <p><span className="font-medium text-gray-600">Comparison:</span> {entry.comparison}</p>
      {activity.source_title && (
        <p><span className="font-medium text-gray-600">Source:</span> {activity.source_title} ({activity.source_year})</p>
      )}
    </div>
  );
}

export default function RecentSearches({ queries, onQueryClick }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!queries || queries.length === 0) return null;

  return (
    <div className="w-full max-w-lg">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
        Recent searches (tap to see result)
      </h3>
      <div className="space-y-1.5">
        {queries.map((entry, i) => (
          <button
            key={entry.timestamp || i}
            onClick={() => {
              if (expandedIndex === i) {
                setExpandedIndex(null);
              } else {
                setExpandedIndex(i);
              }
            }}
            className="w-full text-left bg-white border border-gray-100 rounded-xl px-3.5 py-2.5 hover:border-mw-water/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ComparisonIcon type={entry.comparison_icon} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{entry.query}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-mw-water">{entry.water_display}</span>
                  <span className="text-[10px] text-gray-400">{entry.comparison}</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-300 flex-shrink-0">
                {timeAgo(entry.timestamp)}
              </span>
            </div>

            {expandedIndex === i && (
              <ExpandedResult entry={entry} />
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-300 text-center mt-2">
        Tap a result to see details — no water used
      </p>
    </div>
  );
}

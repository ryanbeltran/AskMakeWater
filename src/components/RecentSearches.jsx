function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return 'today';
}

export default function RecentSearches({ queries, onQueryClick }) {
  if (!queries || queries.length === 0) return null;

  return (
    <div className="w-full max-w-lg">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
        Recent searches (tap to explore)
      </h3>
      <div className="space-y-1.5">
        {queries.map((entry, i) => (
          <button
            key={entry.timestamp || i}
            onClick={() => onQueryClick?.(entry.query)}
            className="w-full text-left bg-white border border-gray-100 rounded-xl px-3.5 py-2.5 hover:border-mw-water/30 hover:bg-mw-water-light/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">💧</span>
              <p className="flex-1 min-w-0 text-sm text-gray-700 truncate">{entry.query}</p>
              <span className="text-[10px] text-gray-300 flex-shrink-0">
                {timeAgo(entry.timestamp)}
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-gray-300 text-center mt-2">
        Tap any search to run it yourself and tweak the details
      </p>
    </div>
  );
}

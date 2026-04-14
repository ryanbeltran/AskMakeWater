import { useState, useEffect, useCallback } from 'react';

const VISIBILITY_COLORS = {
  cited: 'bg-green-100 text-green-700',
  attributed: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function ReferenceDataPanel({ refreshKey = 0 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch('/api/reference', {
        headers: { 'X-Admin-Password': password },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDatasets(json.datasets || []);
      setCategories(json.categories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function handleDelete(dataset) {
    if (!confirm(`Delete "${dataset.name}"? This cannot be undone.`)) return;
    try {
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch(`/api/reference?id=${encodeURIComponent(dataset.id)}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': password },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(datasets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reference-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filterOptions = ['all', ...categories];
  const filtered = categoryFilter === 'all'
    ? datasets
    : datasets.filter(d => d.category === categoryFilter);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Reference Data</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {datasets.length} dataset{datasets.length === 1 ? '' : 's'} across {categories.length} categories.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={datasets.length === 0}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water disabled:opacity-40 cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">Error: {error}</p>}

      <div className="flex gap-1.5 flex-wrap mb-3">
        {filterOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              categoryFilter === cat
                ? 'border-mw-water bg-mw-water-light/30 text-mw-water'
                : 'border-gray-200 text-gray-500 hover:border-mw-water/50'
            }`}
          >
            {cat} {cat === 'all' ? `(${datasets.length})` : `(${datasets.filter(d => d.category === cat).length})`}
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && !error && (
        <p className="text-sm text-gray-400">No datasets in this category.</p>
      )}

      <div className="space-y-2">
        {filtered.map(ds => {
          const isOpen = !!expanded[ds.id];
          return (
            <div key={ds.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [ds.id]: !prev[ds.id] }))}
                className="w-full text-left px-4 py-3 flex items-center gap-3 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${VISIBILITY_COLORS[ds.visibility] || VISIBILITY_COLORS.draft}`}>
                  {ds.visibility || 'draft'}
                </span>
                <span className="text-sm text-gray-700 flex-1 truncate">{ds.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">{ds.category}</span>
                <span className={`text-lg flex-shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-gray-400">ID:</span> <code className="text-gray-700">{ds.id}</code></div>
                    <div><span className="text-gray-400">Source type:</span> <span className="text-gray-700">{ds.source_type || '—'}</span></div>
                    <div><span className="text-gray-400">Updated:</span> <span className="text-gray-700">{ds.updated_at ? new Date(ds.updated_at).toLocaleDateString() : '—'}</span></div>
                    <div><span className="text-gray-400">Added by:</span> <span className="text-gray-700">{ds.added_by || 'admin'}</span></div>
                  </div>

                  {ds.source_citation && (
                    <div>
                      <span className="text-gray-400">Citation:</span>
                      <p className="text-gray-700 italic mt-0.5">{ds.source_citation}</p>
                    </div>
                  )}

                  {ds.source_url && (
                    <div className="truncate">
                      <span className="text-gray-400">URL:</span>{' '}
                      <a href={ds.source_url} target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline break-all">
                        {ds.source_url}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-gray-400 mb-1">Data rows ({Array.isArray(ds.data) ? ds.data.length : 0})</p>
                    <pre className="text-[10px] text-gray-600 bg-white rounded-lg border border-gray-200 p-2 overflow-x-auto max-h-48 overflow-y-auto font-mono">
{JSON.stringify(ds.data, null, 2)}
                    </pre>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDelete(ds)}
                      className="text-[10px] px-2 py-1 border border-gray-200 rounded text-gray-500 hover:border-red-300 hover:text-red-500 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

const SOURCE_TYPES = [
  { value: '', label: '— none —' },
  { value: 'research_paper', label: 'Research paper' },
  { value: 'government_report', label: 'Government report' },
  { value: 'industry_whitepaper', label: 'Industry whitepaper' },
  { value: 'conference', label: 'Conference proceedings' },
  { value: 'personal_communication', label: 'Personal communication' },
  { value: 'proprietary', label: 'Proprietary / internal' },
  { value: 'website', label: 'Website' },
  { value: 'dataset', label: 'Dataset' },
];

const VISIBILITY_META = {
  cited: {
    badge: 'bg-green-500 text-white',
    banner: 'bg-green-50 border-green-300 text-green-800',
    label: 'CITED',
    message: 'Public link available — used in public calculations',
  },
  attributed: {
    badge: 'bg-yellow-500 text-white',
    banner: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    label: 'ATTRIBUTED',
    message: 'Private source — no public link',
  },
  draft: {
    badge: 'bg-red-600 text-white',
    banner: 'bg-red-50 border-red-400 text-red-800',
    label: 'DRAFT',
    message: 'Needs citation — not used in public calculations',
  },
};

function formatCitation(fields, sourceType) {
  const parts = [];
  if (fields.author) parts.push(fields.author);
  if (fields.year) parts.push(`(${fields.year})`);
  if (fields.title) parts.push(`"${fields.title}"`);
  if (fields.journal) parts.push(fields.journal);
  if (fields.organization && fields.organization !== fields.author) parts.push(fields.organization);
  if (fields.page) parts.push(fields.page);
  if (fields.doi) parts.push(`doi:${fields.doi}`);
  if (fields.url) parts.push(fields.url);
  const label = SOURCE_TYPES.find(t => t.value === sourceType)?.label;
  const base = parts.filter(Boolean).join('. ');
  return label && sourceType ? `[${label}] ${base}` : base;
}

function EditModal({ dataset, onClose, onSaved }) {
  const [sourceType, setSourceType] = useState(dataset.source_type || '');
  const [fields, setFields] = useState(() => ({
    author: '',
    title: '',
    organization: '',
    journal: '',
    year: '',
    url: '',
    doi: '',
    page: '',
    notes: '',
    ...(dataset.source_fields || {}),
  }));
  const [dataText, setDataText] = useState(() =>
    JSON.stringify(dataset.data || [], null, 2)
  );
  const [name, setName] = useState(dataset.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function updateField(key, value) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(dataText);
        if (!Array.isArray(parsedData)) throw new Error('data must be an array');
      } catch (err) {
        throw new Error(`Invalid data JSON: ${err.message}`);
      }
      const cleanedFields = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === '' || v == null) continue;
        cleanedFields[k] = k === 'year' ? Number(v) || v : v;
      }
      const body = {
        name,
        category: dataset.category,
        slug: dataset.slug,
        data: parsedData,
        source_type: sourceType || null,
        source_citation: formatCitation(cleanedFields, sourceType),
        source_fields: cleanedFields,
        source_url: cleanedFields.url || '',
      };
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch(`/api/reference?id=${encodeURIComponent(dataset.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Edit dataset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] text-gray-500">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-0.5 w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
            />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Citation</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-gray-500">
                Source type
                <select
                  value={sourceType}
                  onChange={e => setSourceType(e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                >
                  {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-gray-500">
                Year
                <input
                  type="number"
                  value={fields.year || ''}
                  onChange={e => updateField('year', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500 col-span-2">
                Title
                <input
                  type="text"
                  value={fields.title || ''}
                  onChange={e => updateField('title', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                Author
                <input
                  type="text"
                  value={fields.author || ''}
                  onChange={e => updateField('author', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                Organization
                <input
                  type="text"
                  value={fields.organization || ''}
                  onChange={e => updateField('organization', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                Journal
                <input
                  type="text"
                  value={fields.journal || ''}
                  onChange={e => updateField('journal', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                Page / Table
                <input
                  type="text"
                  value={fields.page || ''}
                  onChange={e => updateField('page', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500 col-span-2">
                URL
                <input
                  type="text"
                  value={fields.url || ''}
                  onChange={e => updateField('url', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500">
                DOI
                <input
                  type="text"
                  value={fields.doi || ''}
                  onChange={e => updateField('doi', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
              <label className="text-[11px] text-gray-500 col-span-2">
                Notes
                <input
                  type="text"
                  value={fields.notes || ''}
                  onChange={e => updateField('notes', e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Data (JSON)</h3>
            <textarea
              value={dataText}
              onChange={e => setDataText(e.target.value)}
              rows={10}
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px] font-mono focus:outline-none focus:border-mw-water"
            />
          </div>

          {error && <p className="text-xs text-red-500">Error: {error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-gray-400 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark disabled:opacity-40 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReferenceDataPanel({ refreshKey = 0 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editing, setEditing] = useState(null);

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

  const counts = datasets.reduce((acc, d) => {
    const v = d.visibility || 'draft';
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});

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

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-center">
          <p className="text-lg font-bold text-red-700">{counts.draft || 0}</p>
          <p className="text-[10px] text-red-700 font-semibold uppercase">Draft — needs citation</p>
        </div>
        <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
          <p className="text-lg font-bold text-yellow-700">{counts.attributed || 0}</p>
          <p className="text-[10px] text-yellow-700 font-semibold uppercase">Attributed — private</p>
        </div>
        <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-center">
          <p className="text-lg font-bold text-green-700">{counts.cited || 0}</p>
          <p className="text-[10px] text-green-700 font-semibold uppercase">Cited — public</p>
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
          const meta = VISIBILITY_META[ds.visibility] || VISIBILITY_META.draft;
          return (
            <div key={ds.id} className={`border-2 rounded-xl overflow-hidden ${
              ds.visibility === 'draft' ? 'border-red-300'
                : ds.visibility === 'attributed' ? 'border-yellow-300'
                : 'border-green-300'
            }`}>
              {/* Prominent visibility banner */}
              <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b ${meta.banner}`}>
                {meta.label} · {meta.message}
              </div>

              <button
                onClick={() => setExpanded(prev => ({ ...prev, [ds.id]: !prev[ds.id] }))}
                className="w-full text-left px-4 py-3 flex items-center gap-3 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${meta.badge}`}>
                  {meta.label}
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

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditing(ds)}
                      className="text-[10px] px-3 py-1 bg-mw-water text-white rounded font-medium hover:bg-mw-water-dark cursor-pointer"
                    >
                      Edit citation & data
                    </button>
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

      {editing && (
        <EditModal
          dataset={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

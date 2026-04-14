import { useState } from 'react';
import { normalize } from '../../data/unitNormalize';

const CATEGORIES = ['power_sources', 'cooling_methods', 'regional_wue', 'activity_energy', 'other'];
const SOURCE_TYPES = [
  { value: 'research_paper', label: 'Research paper' },
  { value: 'government_report', label: 'Government report' },
  { value: 'industry_whitepaper', label: 'Industry whitepaper' },
  { value: 'conference', label: 'Conference proceedings' },
  { value: 'personal_communication', label: 'Personal communication' },
  { value: 'proprietary', label: 'Proprietary / internal' },
  { value: 'website', label: 'Website' },
  { value: 'dataset', label: 'Dataset' },
];

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

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
  return label ? `[${label}] ${base}` : base;
}

export default function DataIngestionPanel({ onSaved }) {
  const [text, setText] = useState('');
  const [sourceHint, setSourceHint] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [citation, setCitation] = useState(null);
  const [sourceType, setSourceType] = useState('research_paper');
  const [dataPoints, setDataPoints] = useState([]);
  const [savingIdx, setSavingIdx] = useState(null);
  const [savedIds, setSavedIds] = useState({});

  async function handleExtract() {
    if (!text.trim()) return;
    setExtracting(true);
    setError(null);
    setCitation(null);
    setDataPoints([]);
    setSavedIds({});
    try {
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ text, source_hint: sourceHint || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (!json.parsed) throw new Error('Model did not return parseable JSON');
      const c = json.parsed.citation || {};
      setCitation(c);
      if (c.source_type && SOURCE_TYPES.some(t => t.value === c.source_type)) {
        setSourceType(c.source_type);
      }
      const dps = (json.parsed.data_points || []).map((dp, i) => ({
        ...dp,
        _id: i,
        _name: dp.measures || `Data point ${i + 1}`,
        _category: dp.suggested_category && CATEGORIES.includes(dp.suggested_category)
          ? dp.suggested_category
          : 'other',
      }));
      setDataPoints(dps);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  function updatePoint(idx, patch) {
    setDataPoints(prev => prev.map((dp, i) => (i === idx ? { ...dp, ...patch } : dp)));
  }

  function updateCitation(patch) {
    setCitation(prev => ({ ...(prev || {}), ...patch }));
  }

  async function handleSavePoint(idx) {
    const dp = dataPoints[idx];
    if (!dp._name || !dp._category) {
      alert('Name and category are required');
      return;
    }
    setSavingIdx(idx);
    try {
      const fields = citation || {};
      const source_fields = {
        author: fields.author || null,
        title: fields.title || null,
        organization: fields.organization || null,
        journal: fields.journal || null,
        year: fields.year || null,
        url: fields.url || null,
        doi: fields.doi || null,
        page: fields.page || null,
        notes: fields.notes || null,
      };
      const body = {
        name: dp._name,
        category: dp._category,
        slug: slugify(dp._name),
        data: [{
          value: dp.value,
          unit: dp.unit,
          measures: dp.measures,
          context: dp.context,
          normalized: normalize(dp.value, dp.unit),
        }],
        source_type: sourceType,
        source_citation: formatCitation(source_fields, sourceType),
        source_fields,
        source_url: source_fields.url || '',
      };
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch('/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setSavedIds(prev => ({ ...prev, [idx]: json.dataset?.visibility || 'saved' }));
      if (onSaved) onSaved();
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingIdx(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Data Ingestion</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Paste source content. Claude Sonnet extracts quantitative data + citation fields for review.
        </p>
      </div>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          value={sourceHint}
          onChange={e => setSourceHint(e.target.value)}
          placeholder="Optional source hint (e.g. 'NREL 2012 cooling tech report, Table 1')"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-mw-water"
        />
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste the raw content here — PDF text, webpage, email, dataset docs..."
          rows={10}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:border-mw-water"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{text.length} chars</span>
          <button
            onClick={handleExtract}
            disabled={extracting || !text.trim()}
            className="text-xs px-3 py-1.5 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark disabled:opacity-40 cursor-pointer"
          >
            {extracting ? 'Extracting...' : 'Extract with Sonnet'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">Error: {error}</p>}
      </div>

      {citation && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Citation</h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
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
                value={citation.year || ''}
                onChange={e => updateCitation({ year: e.target.value ? Number(e.target.value) : null })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500 col-span-2">
              Title
              <input
                type="text"
                value={citation.title || ''}
                onChange={e => updateCitation({ title: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              Author
              <input
                type="text"
                value={citation.author || ''}
                onChange={e => updateCitation({ author: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              Organization
              <input
                type="text"
                value={citation.organization || ''}
                onChange={e => updateCitation({ organization: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              Journal
              <input
                type="text"
                value={citation.journal || ''}
                onChange={e => updateCitation({ journal: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              Page / Table
              <input
                type="text"
                value={citation.page || ''}
                onChange={e => updateCitation({ page: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500 col-span-2">
              URL
              <input
                type="text"
                value={citation.url || ''}
                onChange={e => updateCitation({ url: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              DOI
              <input
                type="text"
                value={citation.doi || ''}
                onChange={e => updateCitation({ doi: e.target.value })}
                className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
              />
            </label>
          </div>
          <div className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2">
            <span className="text-gray-400">Preview:</span> {formatCitation(citation, sourceType) || '(no citation data yet)'}
          </div>
        </div>
      )}

      {dataPoints.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Data points ({dataPoints.length})
          </h3>
          <div className="space-y-2">
            {dataPoints.map((dp, idx) => {
              const saved = savedIds[idx];
              const norm = normalize(dp.value, dp.unit);
              return (
                <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-gray-500 col-span-2">
                      Name
                      <input
                        type="text"
                        value={dp._name}
                        onChange={e => updatePoint(idx, { _name: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500">
                      Value
                      <input
                        type="number"
                        step="any"
                        value={dp.value ?? ''}
                        onChange={e => updatePoint(idx, { value: e.target.value === '' ? null : Number(e.target.value) })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500">
                      Unit
                      <input
                        type="text"
                        value={dp.unit || ''}
                        onChange={e => updatePoint(idx, { unit: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500">
                      Category
                      <select
                        value={dp._category}
                        onChange={e => updatePoint(idx, { _category: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] text-gray-500">
                      Normalized
                      <input
                        type="text"
                        readOnly
                        value={norm ? `${norm.canonical_value.toPrecision(4)} ${norm.canonical_unit}` : '(no conversion)'}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-500"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500 col-span-2">
                      Measures
                      <input
                        type="text"
                        value={dp.measures || ''}
                        onChange={e => updatePoint(idx, { measures: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      />
                    </label>
                    <label className="text-[11px] text-gray-500 col-span-2">
                      Context
                      <input
                        type="text"
                        value={dp.context || ''}
                        onChange={e => updatePoint(idx, { context: e.target.value })}
                        className="mt-0.5 w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-mw-water"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    {saved ? (
                      <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                        Saved · visibility: {saved}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSavePoint(idx)}
                        disabled={savingIdx === idx}
                        className="text-[10px] px-3 py-1 bg-mw-water text-white rounded font-medium hover:bg-mw-water-dark disabled:opacity-40 cursor-pointer"
                      >
                        {savingIdx === idx ? 'Saving...' : 'Save as reference dataset'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

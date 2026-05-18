import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import evalTests from '../data/evalTests.json';
import ReferenceDataPanel from '../components/admin/ReferenceDataPanel';
import DataIngestionPanel from '../components/admin/DataIngestionPanel';
import { trackEvent } from '../lib/stats';

const CATEGORIES = ['all', 'streaming', 'ai', 'social', 'gaming', 'crypto', 'email', 'edge_case', 'greeting', 'off_catalog', 'off_catalog_digital', 'general_energy'];

// Haiku pricing: $0.25/M input, $1.25/M output (as of 2025)
const HAIKU_INPUT_COST_PER_TOKEN = 0.25 / 1_000_000;
const HAIKU_OUTPUT_COST_PER_TOKEN = 1.25 / 1_000_000;

function gradeTest(test, actual) {
  if (!actual || actual.error) return { grade: 'FAIL', details: ['API error or no response'] };

  const details = [];
  let passed = 0;
  let total = 0;

  // COMPARISON TEST: check if comparison mode was returned with expected items
  if (test.expected_comparison) {
    total++;
    if (actual.comparison === true && Array.isArray(actual.items) && actual.items.length >= 2) {
      passed++;
    } else {
      details.push(`comparison: expected comparison mode with items array, got ${actual.comparison ? 'comparison' : 'single'} mode`);
    }

    // Check expected comparison IDs if specified
    if (test.expected_comparison_ids && Array.isArray(actual.items)) {
      total++;
      const actualIds = actual.items.map(i => i.activity_id);
      const allFound = test.expected_comparison_ids.every(id => actualIds.includes(id));
      if (allFound) {
        passed++;
      } else {
        const missing = test.expected_comparison_ids.filter(id => !actualIds.includes(id));
        details.push(`comparison_ids: missing [${missing.join(', ')}], got [${actualIds.join(', ')}]`);
      }
    }

    // Check minimum item count if specified
    if (test.expected_comparison_count_min && Array.isArray(actual.items)) {
      total++;
      if (actual.items.length >= test.expected_comparison_count_min) {
        passed++;
      } else {
        details.push(`comparison_count: expected >= ${test.expected_comparison_count_min}, got ${actual.items.length}`);
      }
    }

    if (passed === total) return { grade: 'PASS', details };
    if (passed >= total * 0.5) return { grade: 'PARTIAL', details };
    return { grade: 'FAIL', details };
  }

  // SINGLE TEST: existing logic
  // activity_id (required)
  total++;
  if (test.expected_activity_id) {
    if (actual.activity_id === test.expected_activity_id) {
      passed++;
    } else {
      details.push(`activity_id: expected "${test.expected_activity_id}", got "${actual.activity_id}"`);
    }
  } else {
    passed++; // no expected activity_id (e.g., test 36)
  }

  // duration (within 20% tolerance)
  if (test.expected_duration !== undefined) {
    total++;
    const actualDur = actual.duration || 1;
    const tolerance = test.expected_duration * 0.2;
    if (Math.abs(actualDur - test.expected_duration) <= Math.max(tolerance, 0.1)) {
      passed++;
    } else {
      details.push(`duration: expected ${test.expected_duration}, got ${actualDur}`);
    }
  }

  // duration_unit
  if (test.expected_duration_unit) {
    total++;
    if (actual.duration_unit === test.expected_duration_unit) {
      passed++;
    } else {
      details.push(`duration_unit: expected "${test.expected_duration_unit}", got "${actual.duration_unit}"`);
    }
  }

  // device_hint (only if specified)
  if (test.expected_device_hint) {
    total++;
    if (actual.device_hint === test.expected_device_hint) {
      passed++;
    } else {
      details.push(`device_hint: expected "${test.expected_device_hint}", got "${actual.device_hint}"`);
    }
  }

  // show_model_comparison (only if specified)
  if (test.expected_show_model_comparison !== undefined) {
    total++;
    if (actual.show_model_comparison === test.expected_show_model_comparison) {
      passed++;
    } else {
      details.push(`show_model_comparison: expected ${test.expected_show_model_comparison}, got ${actual.show_model_comparison}`);
    }
  }

  // approximate flag (for off-catalog digital activities)
  if (test.expected_approximate !== undefined) {
    total++;
    if (actual.approximate === test.expected_approximate) {
      passed++;
    } else {
      details.push(`approximate: expected ${test.expected_approximate}, got ${actual.approximate || false}`);
    }
  }

  if (passed === total) return { grade: 'PASS', details };
  if (passed >= total * 0.5) return { grade: 'PARTIAL', details };
  return { grade: 'FAIL', details };
}

function parseClassifyJson(text) {
  const match = text.match(/<classify>\s*([\s\S]*?)\s*<\/classify>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Research Drafts panel — lists drafts from deep-research CTA.
 * Admin can view, promote to attributed/cited, or reject.
 */
function ResearchDraftsPanel() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    loadDrafts();
  }, []);

  async function loadDrafts() {
    setLoading(true);
    try {
      const password = sessionStorage.getItem('admin_password') || '';
      const res = await fetch('/api/research?action=list_drafts', {
        headers: { 'X-Admin-Password': password },
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(draftId, visibility) {
    const password = sessionStorage.getItem('admin_password') || '';
    try {
      const res = await fetch('/api/research', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ draft_id: draftId, action: 'promote', visibility }),
      });
      if (res.ok) {
        setActionMsg(`Promoted to ${visibility}`);
        setTimeout(() => setActionMsg(null), 3000);
        loadDrafts();
      }
    } catch { /* silent */ }
  }

  async function handleReject(draftId) {
    const password = sessionStorage.getItem('admin_password') || '';
    try {
      const res = await fetch('/api/research', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ draft_id: draftId, action: 'reject' }),
      });
      if (res.ok) {
        setActionMsg('Draft rejected');
        setTimeout(() => setActionMsg(null), 3000);
        loadDrafts();
      }
    } catch { /* silent */ }
  }

  if (loading) return <p className="text-sm text-gray-400">Loading research drafts...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
          Research Drafts ({drafts.length})
        </h2>
        <button
          onClick={loadDrafts}
          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          {actionMsg}
        </div>
      )}

      {drafts.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No research drafts pending review.</p>
          <p className="text-xs text-gray-400 mt-1">
            Drafts appear here when users run the "Improve this estimate" research flow on low-confidence results.
          </p>
        </div>
      )}

      {drafts.map(draft => (
        <div key={draft.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">{draft.activity_query}</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Pending Review
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400 font-medium">Original</p>
              <p className="text-gray-700 mt-1">{draft.current_watts || '?'}W × {formatDraftDuration(draft.current_duration_seconds)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5">
              <p className="text-blue-600 font-medium">Researched</p>
              <p className="text-gray-700 mt-1">{draft.proposed_watts}W × {formatDraftDuration(draft.proposed_duration_seconds)}</p>
            </div>
          </div>

          {draft.confidence_note && (
            <p className="text-xs text-gray-500 italic">{draft.confidence_note}</p>
          )}

          {draft.sources && draft.sources.length > 0 && (
            <div className="space-y-1">
              {draft.sources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-mw-water hover:underline truncate">
                  {src.title} ({src.publisher}, {src.year})
                </a>
              ))}
            </div>
          )}

          <p className="text-[10px] text-gray-400">
            Submitted {new Date(draft.submitted_at).toLocaleString()}
          </p>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => handlePromote(draft.id, 'attributed')}
              className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg hover:bg-yellow-200 cursor-pointer"
            >
              Promote → Attributed
            </button>
            <button
              onClick={() => handlePromote(draft.id, 'cited')}
              className="text-xs px-3 py-1.5 bg-green-100 text-green-800 border border-green-200 rounded-lg hover:bg-green-200 cursor-pointer"
            >
              Promote → Cited
            </button>
            <button
              onClick={() => handleReject(draft.id)}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer ml-auto"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDraftDuration(sec) {
  if (!sec) return '?';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  return `${(sec / 3600).toFixed(1)}h`;
}

/**
 * Inline SVG sparkline for a 30-day data series.
 */
function Sparkline({ data, width = 200, height = 32 }) {
  if (!data || data.length === 0) return <span className="text-[10px] text-gray-300">No data</span>;
  const max = Math.max(...data.map(d => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (d.count / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const counts = data.map(d => d.count);
  const sum = counts.reduce((a, b) => a + b, 0);
  const avg = (sum / counts.length).toFixed(1);
  const min = Math.min(...counts);
  const maxVal = Math.max(...counts);

  return (
    <div>
      <svg width={width} height={height} className="block">
        <polyline points={points} fill="none" stroke="#378ADD" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <div className="flex gap-3 text-[9px] text-gray-400 mt-0.5">
        <span>min {min}</span>
        <span>max {maxVal}</span>
        <span>avg {avg}</span>
      </div>
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch('/api/stat', {
        headers: { 'X-Admin-Password': password },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    refreshTimer.current = setInterval(load, 60000);
    return () => clearInterval(refreshTimer.current);
  }, [load]);

  if (loading && !stats) return <p className="text-sm text-gray-400">Loading stats...</p>;
  if (error && !stats) return <p className="text-sm text-red-500">Error: {error}</p>;

  const counters = stats?.counters || {};
  const daily = stats?.daily || {};

  // Sort counters: page_view variants first, then by count descending
  const sortedKeys = Object.keys(counters).sort((a, b) => {
    const aPage = a.startsWith('page_view');
    const bPage = b.startsWith('page_view');
    if (aPage && !bPage) return -1;
    if (!aPage && bPage) return 1;
    return (counters[b] || 0) - (counters[a] || 0);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Site Stats</h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water disabled:opacity-40 transition-colors cursor-pointer"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <p className="text-[10px] text-gray-400">Auto-refreshes every 60s. All counts are anonymous aggregates.</p>

      {/* Lifetime totals table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Lifetime Totals</h3>
        {sortedKeys.length === 0 ? (
          <p className="text-sm text-gray-400">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] text-gray-400 font-medium uppercase py-1.5 pr-4">Event</th>
                  <th className="text-right text-[10px] text-gray-400 font-medium uppercase py-1.5 w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(key => (
                  <tr key={key} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 text-xs text-gray-700 font-mono">{key}</td>
                    <td className="py-1.5 text-right text-xs text-gray-800 font-semibold tabular-nums">
                      {(counters[key] || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last 30 days sparklines */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Last 30 Days</h3>
        {sortedKeys.length === 0 ? (
          <p className="text-sm text-gray-400">No daily data yet.</p>
        ) : (
          <div className="space-y-4">
            {sortedKeys.map(key => (
              <div key={key} className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                <span className="text-[11px] text-gray-600 font-mono w-40 flex-shrink-0 pt-1 truncate">{key}</span>
                <Sparkline data={daily[key] || []} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordGate({ onAuth }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem('admin_auth', password);
        onAuth();
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-lg font-bold text-gray-800 mb-4">Admin Access</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water transition-colors"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-mw-water text-white rounded-xl text-sm font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GradeBadge({ grade }) {
  const colors = {
    PASS: 'bg-green-100 text-green-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    FAIL: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[grade] || 'bg-gray-100 text-gray-500'}`}>
      {grade}
    </span>
  );
}

function TestRow({ test, result }) {
  const [open, setOpen] = useState(false);
  const grading = result ? gradeTest(test, result.parsed) : null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="text-xs text-gray-400 w-6 flex-shrink-0">#{test.id}</span>
        {grading && <GradeBadge grade={grading.grade} />}
        <span className="text-sm text-gray-700 flex-1 truncate">{test.question}</span>
        <span className="text-[10px] text-gray-400 flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded-full">{test.category}</span>
        <span className={`text-lg flex-shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-4 pb-3 bg-gray-50 space-y-2 text-xs">
          <div>
            <span className="font-medium text-gray-500">Expected: </span>
            <span className="text-gray-700">
              {test.expected_activity_id || '(any)'}
              {test.expected_duration !== undefined && ` · ${test.expected_duration} ${test.expected_duration_unit || ''}`}
              {test.expected_device_hint && ` · device: ${test.expected_device_hint}`}
              {test.expected_show_model_comparison !== undefined && ` · comparison: ${test.expected_show_model_comparison}`}
            </span>
          </div>
          {result && (
            <>
              <div>
                <span className="font-medium text-gray-500">Actual: </span>
                <span className="text-gray-700">
                  {result.parsed?.activity_id || 'parse error'}
                  {result.parsed?.duration !== undefined && ` · ${result.parsed.duration} ${result.parsed.duration_unit || ''}`}
                  {result.parsed?.device_hint && ` · device: ${result.parsed.device_hint}`}
                  {result.parsed?.show_model_comparison !== undefined && ` · comparison: ${result.parsed.show_model_comparison}`}
                </span>
              </div>
              {grading && grading.details.length > 0 && (
                <div className="text-red-600">
                  {grading.details.map((d, i) => <p key={i}>{d}</p>)}
                </div>
              )}
              {result.parsed?.narrative && (
                <div>
                  <span className="font-medium text-gray-500">Narrative: </span>
                  <span className="text-gray-600">{result.parsed.narrative}</span>
                </div>
              )}
              <details className="mt-1">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Raw response</summary>
                <pre className="mt-1 p-2 bg-white rounded-lg border border-gray-200 text-[10px] text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.raw}
                </pre>
              </details>
              {result.usage && (
                <div className="text-gray-400">
                  Tokens: {result.usage.input_tokens} in / {result.usage.output_tokens} out
                  {result.usage.cache_read_input_tokens > 0 && ` (${result.usage.cache_read_input_tokens} cached)`}
                </div>
              )}
            </>
          )}
          {test.notes && (
            <div className="text-gray-400 italic">{test.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}

function buildCatalogSnippet(entry) {
  const slug = entry.slug || 'unknown';
  const label = (entry.name || slug).replace(/'/g, "\\'");
  const kwh = entry.last_kwh || (entry.last_watts ? entry.last_watts / 1000 : 0.05);
  const similar = entry.last_similar_to || entry.last_energy_source || '';
  const reasoning = (entry.last_reasoning || '').replace(/'/g, "\\'").slice(0, 160);
  const wattsNote = entry.last_watts ? ` (~${entry.last_watts}W)` : '';
  return `${slug}: {
  id: '${slug}',
  label: '${label}',
  category: 'other',
  unit: 'hours',
  kwh: ${kwh},
  default_device: 'none',
  suggested_refinements: ['device', 'region'],
  source_id: 'estimated_v1',
  source_title: 'Community-reviewed estimate${similar ? ` (${similar})` : ''}${wattsNote}',
  source_year: ${new Date().getFullYear()},
  confidence_base: {
    energy_published: false,
    multi_source: false,
    direct_data: false,
    data_recent: true,
  },
  // ${reasoning}
},`;
}

function SuggestionsPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [copiedSlug, setCopiedSlug] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const password = sessionStorage.getItem('admin_auth') || '';
      const res = await fetch('/api/suggest', {
        headers: { 'X-Admin-Password': password },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleCopy(entry) {
    const snippet = buildCatalogSnippet(entry);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedSlug(entry.slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  const suggestions = data?.suggestions || [];
  const corrections = data?.correctionsBySlug || {};

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Off-catalog Suggestions</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">AI-estimated queries logged for review. Sorted by frequency.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water disabled:opacity-40 transition-colors cursor-pointer"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">Error: {error}</p>}

      {!loading && suggestions.length === 0 && !error && (
        <p className="text-sm text-gray-400">No suggestions yet.</p>
      )}

      <div className="space-y-2">
        {suggestions.map(entry => {
          const slug = entry.slug;
          const isOpen = !!expanded[slug];
          const slugCorrections = corrections[slug] || [];
          return (
            <div key={slug} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [slug]: !prev[slug] }))}
                className="w-full text-left px-4 py-3 flex items-center gap-3 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex-shrink-0">
                  ×{entry.count || 1}
                </span>
                <span className="text-sm text-gray-700 flex-1 truncate">{entry.name || slug}</span>
                {slugCorrections.length > 0 && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    {slugCorrections.length} correction{slugCorrections.length === 1 ? '' : 's'}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">
                  {entry.last_kwh ? `${entry.last_kwh} kWh/h` : ''}
                </span>
                <span className={`text-lg flex-shrink-0 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-gray-400">Slug:</span> <code className="text-gray-700">{slug}</code></div>
                    <div><span className="text-gray-400">Similar to:</span> <code className="text-gray-700">{entry.last_similar_to || '—'}</code></div>
                    <div><span className="text-gray-400">First seen:</span> <span className="text-gray-700">{entry.first_seen ? new Date(entry.first_seen).toLocaleDateString() : '—'}</span></div>
                    <div><span className="text-gray-400">Last seen:</span> <span className="text-gray-700">{entry.last_seen ? new Date(entry.last_seen).toLocaleDateString() : '—'}</span></div>
                  </div>

                  {entry.last_query && (
                    <div>
                      <span className="text-gray-400">Last query:</span>{' '}
                      <span className="text-gray-700 italic">"{entry.last_query}"</span>
                    </div>
                  )}

                  {entry.last_reasoning && (
                    <div>
                      <span className="text-gray-400">AI reasoning:</span>{' '}
                      <span className="text-gray-700">{entry.last_reasoning}</span>
                    </div>
                  )}

                  {slugCorrections.length > 0 && (
                    <div className="border-t border-gray-200 pt-2">
                      <p className="font-semibold text-gray-500 mb-1.5">Corrections ({slugCorrections.length})</p>
                      <div className="space-y-1.5">
                        {slugCorrections.map((c, i) => (
                          <div key={i} className="bg-white border border-gray-200 rounded-lg p-2">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                              <span>{c.submitted_at ? new Date(c.submitted_at).toLocaleString() : ''}</span>
                              {c.suggested_kwh != null && <span className="tabular-nums">{c.suggested_kwh} kWh/h</span>}
                            </div>
                            {c.activity_name && <p className="text-gray-700">{c.activity_name}</p>}
                            {c.source_url && (
                              <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline break-all">
                                {c.source_url}
                              </a>
                            )}
                            {c.notes && <p className="text-gray-600 mt-1">{c.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-gray-500">Catalog snippet (copy into activityLookup.js)</p>
                      <button
                        onClick={() => handleCopy(entry)}
                        className="text-[10px] px-2 py-0.5 border border-gray-200 rounded text-gray-500 hover:border-mw-water hover:text-mw-water cursor-pointer"
                      >
                        {copiedSlug === slug ? 'Copied!' : 'Copy snippet'}
                      </button>
                    </div>
                    <pre className="text-[10px] text-gray-600 bg-white rounded-lg border border-gray-200 p-2 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre">
{buildCatalogSnippet(entry)}
                    </pre>
                    <p className="text-[10px] text-gray-400 mt-1">Auto-promote is disabled — review, edit, and paste into src/data/activityLookup.js manually.</p>
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

export default function AdminPage() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('admin_auth'));
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem('eval_results');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [lastRun, setLastRun] = useState(() => localStorage.getItem('eval_last_run') || null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('eval');
  const [referenceRefreshKey, setReferenceRefreshKey] = useState(0);

  // Save results to localStorage when they change
  useEffect(() => {
    if (Object.keys(results).length > 0) {
      localStorage.setItem('eval_results', JSON.stringify(results));
    }
  }, [results]);

  const filteredTests = categoryFilter === 'all'
    ? evalTests
    : evalTests.filter(t => t.category === categoryFilter);

  const runTests = useCallback(async (testsToRun) => {
    setRunning(true);
    setProgress({ done: 0, total: testsToRun.length });

    const newResults = { ...results };

    for (let i = 0; i < testsToRun.length; i++) {
      const test = testsToRun[i];
      setProgress({ done: i, total: testsToRun.length });

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: test.question }],
          }),
        });
        const data = await res.json();
        const parsed = parseClassifyJson(data.text);

        newResults[test.id] = {
          raw: data.text,
          parsed,
          usage: data.usage,
          model: data.model,
          timestamp: Date.now(),
        };
      } catch (err) {
        newResults[test.id] = {
          error: err.message,
          timestamp: Date.now(),
        };
      }

      setResults({ ...newResults });

      // Small delay to avoid rate limiting
      if (i < testsToRun.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    setProgress({ done: testsToRun.length, total: testsToRun.length });
    const ts = new Date().toISOString();
    setLastRun(ts);
    localStorage.setItem('eval_last_run', ts);
    setRunning(false);
  }, [results]);

  function runAll() {
    runTests(filteredTests);
  }

  function runFailed() {
    const failed = filteredTests.filter(t => {
      const r = results[t.id];
      if (!r) return true;
      const g = gradeTest(t, r.parsed);
      return g.grade !== 'PASS';
    });
    if (failed.length === 0) return;
    runTests(failed);
  }

  function clearResults() {
    setResults({});
    localStorage.removeItem('eval_results');
    localStorage.removeItem('eval_last_run');
    setLastRun(null);
  }

  // Compute scores
  const scores = { PASS: 0, PARTIAL: 0, FAIL: 0, untested: 0 };
  const categoryScores = {};
  filteredTests.forEach(t => {
    const r = results[t.id];
    if (!r) {
      scores.untested++;
    } else {
      const g = gradeTest(t, r.parsed);
      scores[g.grade] = (scores[g.grade] || 0) + 1;
    }
    // Category breakdown
    if (!categoryScores[t.category]) categoryScores[t.category] = { PASS: 0, PARTIAL: 0, FAIL: 0, total: 0 };
    categoryScores[t.category].total++;
    if (r) {
      const g = gradeTest(t, r.parsed);
      categoryScores[t.category][g.grade]++;
    }
  });

  const tested = scores.PASS + scores.PARTIAL + scores.FAIL;
  const accuracy = tested > 0 ? Math.round((scores.PASS / tested) * 100) : 0;

  // Estimate API cost
  const totalInputTokens = Object.values(results).reduce((sum, r) => sum + (r.usage?.input_tokens || 0), 0);
  const totalOutputTokens = Object.values(results).reduce((sum, r) => sum + (r.usage?.output_tokens || 0), 0);
  const estimatedCost = (totalInputTokens * HAIKU_INPUT_COST_PER_TOKEN) + (totalOutputTokens * HAIKU_OUTPUT_COST_PER_TOKEN);
  const estFullSuiteCost = evalTests.length * ((1500 * HAIKU_INPUT_COST_PER_TOKEN) + (300 * HAIKU_OUTPUT_COST_PER_TOKEN));

  if (!authed) {
    return <PasswordGate onAuth={() => setAuthed(true)} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="font-bold text-mw-base tracking-tight text-lg">
              ask <span className="text-mw-water">makewater</span>
            </span>
          </Link>
          <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">Admin Eval</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* Tabs */}
          <div className="flex gap-1.5 flex-wrap border-b border-gray-200 pb-0">
            {[
              { id: 'eval', label: 'Classifier Eval' },
              { id: 'suggestions', label: 'Suggestions' },
              { id: 'reference', label: 'Reference Data' },
              { id: 'ingest', label: 'Data Ingestion' },
              { id: 'research', label: 'Research Drafts' },
              { id: 'stats', label: 'Stats' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs px-3 py-2 rounded-t-lg border-b-2 cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'border-mw-water text-mw-water font-semibold'
                    : 'border-transparent text-gray-500 hover:text-mw-water'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'stats' && <StatsPanel />}
          {activeTab === 'suggestions' && <SuggestionsPanel />}
          {activeTab === 'reference' && <ReferenceDataPanel refreshKey={referenceRefreshKey} />}
          {activeTab === 'ingest' && (
            <DataIngestionPanel onSaved={() => setReferenceRefreshKey(k => k + 1)} />
          )}
          {activeTab === 'research' && <ResearchDraftsPanel />}

          {activeTab === 'eval' && <>



          {/* Score overview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Classifier Accuracy</h2>
              <div className="flex gap-2">
                <button
                  onClick={runAll}
                  disabled={running}
                  className="text-xs px-3 py-1.5 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {running ? `Running ${progress.done}/${progress.total}...` : 'Run Tests'}
                </button>
                <button
                  onClick={runFailed}
                  disabled={running || tested === 0}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Re-run Failed
                </button>
                <button
                  onClick={clearResults}
                  disabled={running}
                  className="text-xs px-3 py-1.5 border border-gray-200 text-gray-400 rounded-lg font-medium hover:border-red-300 hover:text-red-500 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {tested > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-mw-water">{accuracy}%</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Accuracy</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{scores.PASS}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Pass</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-600">{scores.PARTIAL}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Partial</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">{scores.FAIL}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Fail</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No tests run yet. Click "Run Tests" to evaluate the classifier.</p>
            )}

            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              {lastRun && <span>Last run: {new Date(lastRun).toLocaleString()}</span>}
              {tested > 0 && (
                <span>
                  Cost: ${estimatedCost.toFixed(4)} ({totalInputTokens.toLocaleString()} in / {totalOutputTokens.toLocaleString()} out)
                </span>
              )}
              <span>Est. full suite: ~${estFullSuiteCost.toFixed(3)}</span>
            </div>
          </div>

          {/* Category breakdown */}
          {tested > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">By Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {Object.entries(categoryScores).map(([cat, s]) => {
                  const catTested = s.PASS + s.PARTIAL + s.FAIL;
                  const catAcc = catTested > 0 ? Math.round((s.PASS / catTested) * 100) : 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                      className={`text-center p-2 rounded-xl border transition-colors cursor-pointer ${
                        cat === categoryFilter
                          ? 'border-mw-water bg-mw-water-light/30'
                          : 'border-gray-200 hover:border-mw-water/50'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-700">{cat}</p>
                      <p className="text-sm font-bold text-gray-800">{catTested > 0 ? `${catAcc}%` : '—'}</p>
                      <p className="text-[10px] text-gray-400">{s.PASS}/{s.total} pass</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                  categoryFilter === cat
                    ? 'border-mw-water bg-mw-water-light/30 text-mw-water'
                    : 'border-gray-200 text-gray-500 hover:border-mw-water/50'
                }`}
              >
                {cat === 'all' ? `All (${evalTests.length})` : `${cat} (${evalTests.filter(t => t.category === cat).length})`}
              </button>
            ))}
          </div>

          {/* Test list */}
          <div className="space-y-1.5">
            {filteredTests.map(test => (
              <TestRow key={test.id} test={test} result={results[test.id]} />
            ))}
          </div>

          </>}

        </div>
      </main>
    </div>
  );
}

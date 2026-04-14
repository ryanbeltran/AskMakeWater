import { useState, useEffect } from 'react';

/**
 * Modal form for submitting a correction on an AI-estimated result.
 * POSTs to /api/suggest with type=correction. Fire-and-forget — shows a
 * confirmation state on success, closes on backdrop click.
 */
export default function SuggestCorrectionForm({ target, onClose }) {
  const [activityName, setActivityName] = useState('');
  const [kwh, setKwh] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (target) {
      setActivityName(target.estimated_name || target.activity || '');
      setKwh(target.estimated_kwh_used ? String(target.estimated_kwh_used) : '');
      setSourceUrl('');
      setNotes('');
      setSubmitted(false);
      setError(null);
    }
  }, [target]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (target) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [target, onClose]);

  if (!target) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'correction',
          suggested_activity_name: target.estimated_name || target.activity || '',
          activity_name: activityName,
          suggested_kwh: kwh ? Number(kwh) : null,
          source_url: sourceUrl,
          notes,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Submit a correction</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Help us improve estimates for off-catalog activities.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-gray-700">Thanks — your correction was submitted for review.</p>
            <button
              onClick={onClose}
              className="text-xs px-4 py-2 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Activity name</label>
              <input
                type="text"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
                required
                maxLength={120}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Suggested kWh per hour</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                max="50"
                value={kwh}
                onChange={e => setKwh(e.target.value)}
                placeholder="e.g. 0.15"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:bg-white transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-1">Clamped to 0.001–50 kWh/hour.</p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Source URL (optional)</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Why this value? Any context we should know?"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:bg-white transition-colors resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-gray-300 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !activityName}
                className="text-xs px-4 py-2 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit correction'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

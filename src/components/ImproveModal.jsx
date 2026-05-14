import { useState, useEffect } from 'react';
import { recalculate, formatWater, REGIONS } from '../data/recalculate';

const PHASES = [
  'Searching for published sources...',
  'Validating wattage data...',
  'Cross-checking with reference databases...',
];

/**
 * Deep-research modal for low-confidence results.
 *
 * Flow:
 *   1. Explain what research does + water cost + budget remaining
 *   2. User confirms → loading with phased status text
 *   3. Show side-by-side comparison (original vs researched)
 *   4. User picks: "Looks right" / "Edit before saving" / "This is off"
 */
export default function ImproveModal({ open, onClose, data, onAccept }) {
  const [stage, setStage] = useState('confirm'); // confirm | loading | results | edit | feedback
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [budget, setBudget] = useState(null);

  // Editable fields for "Edit before saving"
  const [editWatts, setEditWatts] = useState(0);
  const [editDuration, setEditDuration] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Fetch budget on open
  useEffect(() => {
    if (!open) return;
    setStage('confirm');
    setResult(null);
    setError(null);
    setPhaseIdx(0);
    fetch('/api/research')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setBudget(d))
      .catch(() => setBudget(null));
  }, [open]);

  // Cycle through loading phases
  useEffect(() => {
    if (stage !== 'loading') return;
    const timer = setInterval(() => {
      setPhaseIdx(prev => Math.min(prev + 1, PHASES.length - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [stage]);

  if (!open) return null;

  const currentWatts = data?.general_energy_watts || (data?.editable_params?.activity_kwh * 1000) || 0;
  const currentDurationSec = data?.editable_params?.original_duration_unit === 'seconds'
    ? data.editable_params.original_duration
    : data?.editable_params?.original_duration_unit === 'minutes'
      ? (data.editable_params.original_duration || 1) * 60
      : (data?.editable_params?.duration_hours || 1) * 3600;

  async function runResearch() {
    setStage('loading');
    setPhaseIdx(0);
    setError(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: data?.activity || data?.general_energy_name || 'unknown activity',
          current_watts: currentWatts,
          current_duration_seconds: currentDurationSec,
        }),
      });

      let json;
      try {
        json = await res.json();
      } catch {
        setError(res.status === 504 ? 'Research timed out — try again' : `Server error (${res.status})`);
        setStage('confirm');
        return;
      }

      if (!res.ok || !json.success) {
        setError(json.message || json.error || 'Research failed');
        setStage('confirm');
        return;
      }

      setResult(json);
      setEditWatts(json.proposed_watts);
      setEditDuration(json.proposed_duration_seconds);
      setBudget(prev => prev ? {
        ...prev,
        ip_remaining: json.ip_remaining ?? prev.ip_remaining,
        site_remaining: json.site_remaining ?? prev.site_remaining,
      } : prev);
      setStage('results');
    } catch (err) {
      setError(err.message || 'Network error');
      setStage('confirm');
    }
  }

  function calculateWater(watts, durationSec) {
    const kwhPerHour = watts / 1000;
    const hours = durationSec / 3600;
    const calc = recalculate({
      activity_kwh: kwhPerHour,
      duration: hours,
      device_key: data?.editable_params?.device_key || 'none',
      region_key: data?.editable_params?.region_key || 'industry_average',
      duration_hours: hours,
    });
    return calc;
  }

  const originalCalc = calculateWater(currentWatts, currentDurationSec);
  const researchedCalc = result ? calculateWater(result.proposed_watts, result.proposed_duration_seconds) : null;

  function handleAccept(watts, duration) {
    const kwhPerHour = watts / 1000;
    const hours = duration / 3600;
    onAccept?.({
      watts,
      duration_seconds: duration,
      kwh_per_hour: kwhPerHour,
      duration_hours: hours,
      sources: result?.sources || [],
      draft_id: result?.draft_id,
      confidence_note: result?.confidence_note,
    });
    onClose();
  }

  const budgetExhausted = budget && (budget.site_remaining <= 0 || budget.ip_remaining <= 0);
  const budgetMessage = budget?.site_remaining <= 0
    ? 'Research budget resets tomorrow'
    : budget?.ip_remaining <= 0
      ? `You've used your ${budget.ip_cap} research runs today`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Improve this estimate</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* CONFIRM STAGE */}
          {stage === 'confirm' && (
            <>
              <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <p>
                  We'll use a more powerful AI model with web search to find published
                  energy data for this activity. This typically finds manufacturer specs,
                  research papers, or government reports.
                </p>
                <div className="bg-mw-water-light/50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-gray-500">
                    <strong className="text-gray-700">Water cost:</strong> ~30 mL (comes out of the daily site bottle)
                  </p>
                  {budget && (
                    <p className="text-xs text-gray-500">
                      <strong className="text-gray-700">Budget remaining:</strong>{' '}
                      {budget.site_remaining} of {budget.site_cap} site runs today
                      {budget.ip_remaining < budget.ip_cap && (
                        <span className="text-gray-400"> · {budget.ip_remaining} of {budget.ip_cap} personal runs</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={runResearch}
                  disabled={budgetExhausted}
                  className="px-4 py-2 text-sm font-medium text-white bg-mw-water rounded-lg hover:bg-mw-water-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {budgetExhausted ? budgetMessage : 'Run research'}
                </button>
              </div>
            </>
          )}

          {/* LOADING STAGE */}
          {stage === 'loading' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-8 h-8 mx-auto border-2 border-mw-water border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 animate-pulse">
                {PHASES[phaseIdx]}
              </p>
              <p className="text-xs text-gray-400">This usually takes 10-20 seconds</p>
            </div>
          )}

          {/* RESULTS STAGE */}
          {stage === 'results' && result && (
            <>
              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Original</p>
                  <p className="text-lg font-bold text-gray-600">{formatWater(originalCalc.water_ml)}</p>
                  <p className="text-xs text-gray-500">{currentWatts}W × {formatDuration(currentDurationSec)}</p>
                  <p className="text-[10px] text-gray-400">Confidence: {data?.confidence_score || 10}%</p>
                </div>
                <div className="bg-mw-water-light/50 border border-mw-water/20 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-mw-water uppercase tracking-wider">Researched</p>
                  <p className="text-lg font-bold text-mw-base">{formatWater(researchedCalc.water_ml)}</p>
                  <p className="text-xs text-gray-600">
                    {result.proposed_watts}W × {formatDuration(result.proposed_duration_seconds)}
                  </p>
                  <p className="text-[10px] text-mw-water">Confidence: capped 50%</p>
                </div>
              </div>

              {/* Confidence note */}
              {result.confidence_note && (
                <p className="text-xs text-gray-500 italic leading-relaxed">
                  {result.confidence_note}
                </p>
              )}

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sources found</p>
                  {result.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 rounded-lg p-2.5 hover:bg-gray-100 transition-colors no-underline group"
                    >
                      <p className="text-xs font-medium text-gray-700 group-hover:text-mw-water flex items-center gap-1">
                        {src.title}
                        <svg className="w-3 h-3 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {src.publisher}{src.year ? `, ${src.year}` : ''}
                      </p>
                      {src.snippet && (
                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{src.snippet}</p>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Water cost of this research */}
              {result.water_cost_ml > 0 && (
                <p className="text-[10px] text-gray-400 text-center">
                  This research used {result.water_cost_ml.toFixed(1)} mL of water
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleAccept(result.proposed_watts, result.proposed_duration_seconds)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-mw-water rounded-lg hover:bg-mw-water-dark cursor-pointer"
                >
                  Looks right
                </button>
                <button
                  onClick={() => setStage('edit')}
                  className="flex-1 px-4 py-2 text-sm font-medium text-mw-water border border-mw-water rounded-lg hover:bg-mw-water-light cursor-pointer"
                >
                  Edit before saving
                </button>
                <button
                  onClick={() => setStage('feedback')}
                  className="flex-1 px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  This is off
                </button>
              </div>
            </>
          )}

          {/* EDIT STAGE */}
          {stage === 'edit' && (
            <>
              <p className="text-sm text-gray-600">Adjust the values before saving:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 min-w-[80px]">Watts</label>
                  <input
                    type="number"
                    value={editWatts}
                    onChange={e => setEditWatts(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water"
                  />
                  <span className="text-xs text-gray-400">W</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 min-w-[80px]">Duration</label>
                  <input
                    type="number"
                    value={editDuration}
                    onChange={e => setEditDuration(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water"
                  />
                  <span className="text-xs text-gray-400">seconds</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                  Result: {formatWater(calculateWater(editWatts, editDuration).water_ml)}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setStage('results')} className="px-4 py-2 text-sm text-gray-600 cursor-pointer">
                  Back
                </button>
                <button
                  onClick={() => handleAccept(editWatts, editDuration)}
                  className="px-4 py-2 text-sm font-medium text-white bg-mw-water rounded-lg hover:bg-mw-water-dark cursor-pointer"
                >
                  Save edited values
                </button>
              </div>
            </>
          )}

          {/* FEEDBACK STAGE */}
          {stage === 'feedback' && (
            <>
              <p className="text-sm text-gray-600">
                Sorry about that! Optional: tell us what was wrong so we can improve.
              </p>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="e.g., 'The wattage seems way too high' or 'Elevator motors are typically 5-10 kW, not 50 kW'"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water resize-none h-20"
              />
              <p className="text-[10px] text-gray-400">No water charged for rejected research.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setStage('results')} className="px-4 py-2 text-sm text-gray-600 cursor-pointer">
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

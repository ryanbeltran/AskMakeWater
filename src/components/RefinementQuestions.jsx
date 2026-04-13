import { useState } from 'react';
import WaterDrop from './WaterDrop';

export default function RefinementQuestions({ questions, onSelect, onTier2Submit }) {
  const [tier2Input, setTier2Input] = useState('');
  const [tier2Loading, setTier2Loading] = useState(false);
  const [selections, setSelections] = useState({});

  if (!questions || questions.length === 0) return null;

  function handleSelect(questionId, value, affects) {
    const updated = { ...selections, [questionId]: value };
    setSelections(updated);
    onSelect(questionId, value, affects);
  }

  function handleTier2(e) {
    e.preventDefault();
    if (!tier2Input.trim() || tier2Loading) return;
    setTier2Loading(true);
    onTier2Submit(tier2Input.trim()).finally(() => setTier2Loading(false));
  }

  return (
    <div className="space-y-4">
      {/* Tier 1 header */}
      <div>
        <h4 className="text-sm font-semibold text-mw-base mb-1">
          Want a more accurate estimate?
        </h4>
        <p className="text-xs text-gray-400">
          Each refinement below updates your estimate instantly — no additional water used.
        </p>
      </div>

      {/* Tier 1 questions */}
      <div className="space-y-3">
        {questions.map(q => (
          <div key={q.id}>
            <p className="text-sm text-gray-600 mb-1.5">{q.question}</p>
            {q.type === 'select' ? (
              <div className="flex flex-wrap gap-1.5">
                {q.options.map(opt => {
                  const isSelected = selections[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt, q.affects)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-mw-water text-white border-mw-water'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-mw-water hover:text-mw-water'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : q.type === 'number' ? (
              <input
                type="number"
                placeholder={q.placeholder || 'Enter value'}
                onChange={e => handleSelect(q.id, parseFloat(e.target.value) || 0, q.affects)}
                className="w-32 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30"
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* Tier 2 */}
      <div className="border-t border-gray-100 pt-3">
        <form onSubmit={handleTier2} className="space-y-2">
          <label className="text-xs text-gray-500">
            Have a specific setup? Tell us more.
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tier2Input}
              onChange={e => setTier2Input(e.target.value)}
              placeholder='e.g., "I use a projector" or "I have solar panels"'
              disabled={tier2Loading}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={tier2Loading || !tier2Input.trim()}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
            >
              <WaterDrop size={10} />
              {tier2Loading ? 'Thinking...' : 'Refine'}
            </button>
          </div>
          <p className="text-[10px] text-gray-300">
            This follow-up will use ~0.5 mL of water.
          </p>
        </form>
      </div>
    </div>
  );
}

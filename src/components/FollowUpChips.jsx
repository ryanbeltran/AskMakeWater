/**
 * Follow-up suggestion chips shown below the latest result card.
 * Keeps the chat result-anchored by nudging users toward scoped refinements
 * rather than open-ended questions.
 *
 * Action types:
 *   - 'focus-device' / 'focus-region': expand the breakdown panel and scroll
 *     to the matching dropdown so the user can pick manually.
 *   - 'compose': fill the chat input so the user can type the rest (used for
 *     "compare with another activity", which needs a user-specified target).
 */
export default function FollowUpChips({ onAction, disabled = false }) {
  const chips = [
    { label: 'Try a different device', action: 'focus-device' },
    { label: 'Change region', action: 'focus-region' },
    { label: 'Compare with another activity', action: 'compose', prompt: 'Compare that to ' },
  ];

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onAction(chip)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

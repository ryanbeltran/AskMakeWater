import WaterDrop from './WaterDrop';

const MODEL_LABELS = {
  'claude-haiku-4-5-20251001': 'Haiku',
  'claude-sonnet-4-20250514': 'Sonnet',
};

export default function MetaCost({ inputTokens, outputTokens, model, cacheReadTokens = 0, isRepeatQuery = false }) {
  const totalTokens = inputTokens + outputTokens;
  // 0.14 Wh per 1000 tokens, WUE 1.8 L/kWh
  const wh = totalTokens * 0.14 / 1000;
  const waterMl = wh * 1.8;
  const display = waterMl < 0.01
    ? '<0.01 mL'
    : waterMl < 1
      ? `~${waterMl.toFixed(2)} mL`
      : `~${waterMl.toFixed(1)} mL`;

  const modelLabel = MODEL_LABELS[model] || 'Claude';
  const cached = cacheReadTokens > 0;

  if (isRepeatQuery) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <WaterDrop size={10} className="text-green-400" />
          <span>
            This query was already asked — not counted toward today's water usage.
          </span>
        </div>
        <p className="text-[10px] text-gray-400 ml-4">
          {modelLabel} · {totalTokens.toLocaleString()} tokens{cached ? ' · cached prompt' : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <WaterDrop size={10} className="text-mw-water/40" />
      <span>
        This answer cost approximately {display} of water
        <span className="text-gray-300 ml-1">
          ({modelLabel} · {totalTokens.toLocaleString()} tokens{cached ? ' · cached' : ''})
        </span>
      </span>
    </div>
  );
}

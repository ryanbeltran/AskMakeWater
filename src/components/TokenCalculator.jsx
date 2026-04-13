import { useState, useMemo } from 'react';
import { REGIONS } from '../data/recalculate';

/**
 * Per-token energy estimates in watt-hours per 1000 tokens.
 *
 * Sources & methodology:
 * - GPT-4: ~2.9 Wh per query, typical query ~800 tokens → ~3.6 Wh/1k tokens
 * - GPT-4o mini: ~0.5 Wh per query, ~800 tokens → ~0.63 Wh/1k tokens
 * - Claude Sonnet: ~1.5 Wh per query, ~800 tokens → ~1.88 Wh/1k tokens
 * - Claude Haiku: ~0.3 Wh per query, ~800 tokens → ~0.38 Wh/1k tokens
 * - Gemini: ~0.24 Wh per query (self-reported), ~800 tokens → ~0.30 Wh/1k tokens
 * - Grok: ~2.0 Wh per query, ~800 tokens → ~2.50 Wh/1k tokens
 * - Llama (local): ~3.0 Wh per query, ~800 tokens → ~3.75 Wh/1k tokens
 * - Claude Opus: estimated ~3x Sonnet → ~5.63 Wh/1k tokens
 * - GPT-4.5: estimated ~2x GPT-4 → ~7.25 Wh/1k tokens
 * - Gemini Ultra: estimated ~3x Gemini → ~0.90 Wh/1k tokens
 *
 * These are rough estimates. Real per-token costs vary by prompt length,
 * batch size, hardware utilization, and caching.
 */
const MODELS = [
  { id: 'gemini',        label: 'Google Gemini',      wh_per_1k: 0.30, confidence: 'medium', provider: 'Google' },
  { id: 'claude_haiku',  label: 'Claude Haiku',       wh_per_1k: 0.38, confidence: 'low',    provider: 'Anthropic' },
  { id: 'gpt4o_mini',    label: 'GPT-4o mini',        wh_per_1k: 0.63, confidence: 'low',    provider: 'OpenAI' },
  { id: 'gemini_ultra',  label: 'Gemini Ultra',       wh_per_1k: 0.90, confidence: 'low',    provider: 'Google' },
  { id: 'claude_sonnet', label: 'Claude Sonnet',      wh_per_1k: 1.88, confidence: 'low',    provider: 'Anthropic' },
  { id: 'grok',          label: 'Grok (xAI)',         wh_per_1k: 2.50, confidence: 'low',    provider: 'xAI' },
  { id: 'gpt4',          label: 'GPT-4 / GPT-4o',    wh_per_1k: 3.63, confidence: 'medium', provider: 'OpenAI' },
  { id: 'llama_local',   label: 'Llama (local)',      wh_per_1k: 3.75, confidence: 'low',    provider: 'Local GPU' },
  { id: 'claude_opus',   label: 'Claude Opus',        wh_per_1k: 5.63, confidence: 'low',    provider: 'Anthropic' },
  { id: 'gpt45',         label: 'GPT-4.5',            wh_per_1k: 7.25, confidence: 'low',    provider: 'OpenAI' },
];

const REGION_GROUPS = [
  { label: 'Americas', keys: ['us_oregon', 'us_virginia', 'us_iowa', 'us_northeast', 'us_southeast', 'us_chicago', 'us_southwest', 'us_texas', 'canada', 'brazil'] },
  { label: 'Europe', keys: ['uk', 'northern_europe', 'southern_europe', 'germany'] },
  { label: 'Asia-Pacific', keys: ['japan', 'south_korea', 'southeast_asia', 'singapore', 'china_coastal', 'india_mumbai', 'australia'] },
  { label: 'Other', keys: ['middle_east_uae', 'africa', 'industry_average'] },
];

export default function TokenCalculator({ onClose }) {
  const [tokens, setTokens] = useState(10000);
  const [regionKey, setRegionKey] = useState('industry_average');

  const region = REGIONS[regionKey] || REGIONS.industry_average;
  const wue = region.wue;

  const results = useMemo(() => {
    return MODELS.map(m => {
      const wh = (tokens / 1000) * m.wh_per_1k;
      const waterMl = wh * wue;
      return { ...m, wh, waterMl };
    });
  }, [tokens, wue]);

  const maxWater = Math.max(...results.map(r => r.waterMl), 0.01);

  const BOTTLE_ML = 500;

  function formatWater(ml) {
    if (ml < 0.01) return '<0.01 mL';
    if (ml < 1) return `${ml.toFixed(2)} mL`;
    if (ml < 100) return `${ml.toFixed(1)} mL`;
    if (ml < 1000) return `${Math.round(ml)} mL`;
    return `${(ml / 1000).toFixed(2)} L`;
  }

  function formatBottles(ml) {
    const bottles = ml / BOTTLE_ML;
    if (bottles < 0.01) return `${bottles.toFixed(3)}`;
    if (bottles < 0.1) return `${bottles.toFixed(2)}`;
    if (bottles < 1) return `${bottles.toFixed(1)}`;
    return `${bottles.toFixed(1)}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 w-full max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Token Water Calculator</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">x</button>
      </div>

      {/* Token input */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-gray-600 flex-shrink-0">Tokens:</label>
        <input
          type="number"
          value={tokens}
          onChange={e => setTokens(Math.max(0, parseInt(e.target.value) || 0))}
          min={0}
          step={1000}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:bg-white transition-colors"
        />
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[1000, 5000, 10000, 50000, 100000, 1000000].map(n => (
          <button
            key={n}
            onClick={() => setTokens(n)}
            className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              tokens === n
                ? 'border-mw-water bg-mw-water-light/30 text-mw-water'
                : 'border-gray-200 text-gray-500 hover:border-mw-water/50'
            }`}
          >
            {n >= 1000000 ? `${n/1000000}M` : `${n/1000}k`}
          </button>
        ))}
      </div>

      {/* Region selector */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 mb-1 block">Region (affects WUE):</label>
        <select
          value={regionKey}
          onChange={e => setRegionKey(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water transition-colors cursor-pointer"
        >
          {REGION_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.keys.filter(k => REGIONS[k]).map(k => (
                <option key={k} value={k}>
                  {REGIONS[k].label} (WUE: {REGIONS[k].wue})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="space-y-1.5">
        {results.map(r => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-28 flex-shrink-0 truncate" title={r.label}>
              {r.label}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max((r.waterMl / maxWater) * 100, 2)}%`,
                  backgroundColor: r.confidence === 'medium' ? '#2c6bdb' : '#94a3b8',
                }}
              />
            </div>
            <span className="text-xs font-mono text-gray-700 flex-shrink-0 text-right">
              {formatWater(r.waterMl)}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0 text-right ml-0.5">
              {formatBottles(r.waterMl) ? `${formatBottles(r.waterMl)} bottles` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2c6bdb]" /> Published data
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-[#94a3b8]" /> Estimate
        </span>
      </div>

      <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
        Per-token energy derived from per-query benchmarks assuming ~800 tokens per query. Real costs vary by prompt length, batching, caching, and hardware. Water = energy x WUE ({wue} L/kWh for {region.label}). 1 bottle = 500 mL.
      </p>
    </div>
  );
}

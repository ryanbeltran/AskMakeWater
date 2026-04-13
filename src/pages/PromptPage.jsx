import { Link } from 'react-router-dom';
import WaterDrop from '../components/WaterDrop';

const SYSTEM_PROMPT_DISPLAY = `You are an activity classifier for MakeWater's Digital Water Cost Calculator. Your ONLY job is to read a user's question and return a structured JSON classification. You do NO math.

HOW IT WORKS:
The AI acts as a classifier — it identifies the digital activity and extracts parameters (duration, device, region). ALL water calculations are performed deterministically on the client side using published reference data. This means:
- The AI never generates water numbers (no hallucinated math)
- Every calculation is reproducible and auditable
- The same inputs always produce the same output

MODELS USED:
- Classification: Claude Haiku (fast, lightweight)
- Tier 2 refinement: Claude Sonnet (for unusual setups requiring reasoning)

ACTIVITY CATALOG (24 activities):
AI: ChatGPT query, ChatGPT conversation, Google Gemini, AI image generation, AI video generation
Search: Google search, Google AI Overview search
Streaming: Netflix HD/4K, YouTube HD/SD, TikTok, Zoom
Social Media: Facebook, Instagram, X (Twitter), Snapchat
Email: Regular, With attachment
Gaming: Cloud, Console, Mobile
Crypto: Bitcoin, Ethereum

CALCULATION FORMULA (client-side):
water_liters = (activity_energy_kWh + device_energy_kWh) × WUE_L_per_kWh
Default WUE = 1.8 L/kWh (industry average)
30 regional WUE values available for location-specific estimates

CONFIDENCE SCORING (client-side, max 100%):
- Energy source published: +25%
- WUE provider-specific: +20%
- Multi-source verified: +15%
- Direct data (not extrapolated): +15%
- Regional specific: +10%
- Data under 2 years old: +10%
- Device energy measured: +5%

INTERACTIVE REFINEMENT:
Users can adjust duration, device, and region for instant client-side recalculation — zero additional API calls. Activity-specific refinement questions improve accuracy when answered.

All energy data is sourced from published research, corporate sustainability reports, and peer-reviewed studies. The complete dataset is available in the project's open source repository.`;

export default function PromptPage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <WaterDrop size={22} className="text-mw-water" />
            <span className="font-bold text-mw-base tracking-tight text-lg">
              ask <span className="text-mw-water">makewater</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-mw-water transition-colors no-underline"
          >
            &larr; back to calculator
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-mw-base tracking-tight mb-2">
            System Prompt
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            In the spirit of full transparency, this is the complete system prompt that governs
            the AI's behavior on this tool. There is nothing hidden about how we operate.
            This is part of MakeWater's{' '}
            <a
              href="https://github.com/makewater"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mw-water hover:underline"
            >
              open source commitment
            </a>
            .
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-mw-human/60" />
            <div className="w-3 h-3 rounded-full bg-mw-solar/60" />
            <div className="w-3 h-3 rounded-full bg-mw-forest/60" />
            <span className="ml-2 text-xs text-gray-400 font-mono">system_prompt.txt</span>
          </div>
          <pre className="p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
            {SYSTEM_PROMPT_DISPLAY}
          </pre>
        </div>

        <div className="mt-6 p-4 bg-mw-water-light/50 rounded-xl border border-mw-water/10">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Why publish this?</strong> Because the mission is
            water awareness, not competitive advantage. Open sourcing the prompt invites scrutiny
            (which improves accuracy), enables researchers and educators to build on our work, and
            demonstrates that MakeWater has nothing to hide about how estimates are generated.
          </p>
        </div>
      </main>
    </div>
  );
}

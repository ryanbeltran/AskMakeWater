import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import changelog from '../data/changelog.json';

const TABS = [
  { id: 'why', label: 'Why We Built This' },
  { id: 'methodology', label: 'Our Methodology' },
  { id: 'faq', label: 'FAQ' },
  { id: 'new', label: "What's New" },
  { id: 'prompt', label: 'System Prompt' },
];

const FAQ_ITEMS = [
  {
    q: 'How accurate are these estimates?',
    a: `Every estimate shows a confidence score based on how strong the underlying data is. Some activities like Netflix streaming have solid published data from the IEA and score higher. Others like TikTok's server costs are basically a black box and score lower. We show our work on every result — expand the breakdown to see exactly what data was used and where we had to make assumptions.`,
  },
  {
    q: 'Does my location affect the water cost?',
    a: `Yes, significantly. Data centers in hot, arid places like Arizona need heavy evaporative cooling and use much more water per kWh than facilities in cool climates like Scandinavia or the Pacific Northwest. Your location also affects which data center likely serves your request, though the exact routing depends on the service. Netflix uses CDN edge servers close to you, so your location matters a lot. ChatGPT runs on specialized GPU clusters in specific regions, so your location matters less. You can enter your US zip code for a more location-specific estimate.`,
  },
  {
    q: 'Which data center handles my request?',
    a: `It depends on the service. Streaming platforms like Netflix and YouTube heavily use CDN edge caching — your content is probably served from somewhere close to you, sometimes from a server physically inside your ISP's network. AI services like ChatGPT and Claude run on GPU clusters concentrated in specific regions — not every data center has the right hardware. Cloud apps depend entirely on which region the developer chose when deploying. Social media is a mix of all three. The tool explains the likely routing for each activity type in the calculation breakdown.`,
  },
  {
    q: 'Why does the same activity cost different amounts of water in different regions?',
    a: `Three main factors: climate (hot places need more cooling water), the local electricity grid (coal and nuclear power plants use lots of cooling water while wind and solar use almost none), and the cooling technology at the specific facility (evaporative cooling uses water directly, while newer liquid cooling and air cooling systems use much less or none).`,
  },
  {
    q: "Didn't you use AI to build this? Isn't that ironic?",
    a: `Yes, I built this in about 2 hours with Claude Code. I see the irony. But I've already learned real techniques to reduce the tool's own water and energy footprint — we use a small efficient model (Haiku) for most queries, the AI only classifies your question while the math happens in your browser with zero AI involvement, we cache results so repeat questions don't use any AI at all, and we show the water cost of every query on screen. The goal isn't zero water usage — it's making the usage visible and minimizing it where we can.`,
  },
  {
    q: 'What\'s the "one water bottle per day" thing?',
    a: `I want to cap each user's daily usage of this tool to 500 mL of water — one standard water bottle. That's a concept we're building toward. The tool shows your running water budget so you can see how much you've used. It's a way of practicing what we preach.`,
  },
  {
    q: 'Where does the data come from?',
    a: `Published research and corporate sustainability reports. Key sources include the UC Riverside "Making AI Less Thirsty" study (Ren et al., 2023), the IEA's streaming energy analysis, Microsoft, Google, AWS, and Meta's published WUE and PUE metrics, the Lawrence Berkeley National Lab 2024 Data Center Energy Report, and Greenspector's social media energy measurements. Every result cites its specific sources in the breakdown.`,
  },
  {
    q: 'Can the AI hallucinate or make up numbers?',
    a: `We designed the system specifically to minimize this. The AI never does any math or generates any energy or water figures. It only classifies your question — identifying which activity you're asking about and what parameters apply. Then your browser looks up the real data from our reference dataset and does the multiplication. If the AI classifies something that doesn't exist in our dataset, the system catches it and tells you honestly instead of making something up. That said, AI is AI — we can't guarantee it will always classify perfectly, and edge cases can still produce unexpected results. We're always working to reduce the likelihood of errors, but we'd rather be honest about the limitations than pretend they don't exist.`,
  },
  {
    q: 'How can I help improve this?',
    a: `Every result has a "suggest a correction" option. If you're a data center engineer, researcher, or just someone who spotted something off, we want to hear from you. The entire project is open source — the dataset, the system prompt, the calculation engine, everything. If you can build a better version, that's a win for the mission.`,
  },
  {
    q: 'What is MakeWater?',
    a: `MakeWater is a 501(c)(3) nonprofit focused on water and environmental STEM education. Our core program uses hands-on water purification kits in classrooms, and we've reached over 10,000 participants in underserved Texas communities. This calculator is our expansion into helping everyone understand water's hidden role in our digital lives. Learn more at makewater.org.`,
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-gray-800">{item.q}</span>
        <span className={`text-mw-water text-lg flex-shrink-0 transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4 bg-white">
          <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function AboutPage() {
  const [searchParams] = useSearchParams();
  const initialTab = TABS.some(t => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'why';
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="font-bold text-mw-base tracking-tight text-lg">
              ask <span className="text-mw-water">makewater</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-white text-mw-water shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Why We Built This */}
          {tab === 'why' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-mw-base tracking-tight">Why We Built This</h1>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
                <p>
                  I got frustrated trying to figure out exactly how much water AI and other
                  digital activities actually use. The research exists, but it's buried in
                  academic papers and corporate sustainability reports — the kind of detail
                  that makes the water cost easy to ignore instead of easy to see.
                </p>
                <p>
                  So I built a tool. You can ask it how much water something costs — streaming,
                  scrolling TikTok, a ChatGPT conversation, whatever — and it gives you a best
                  estimate with a confidence score. You can expand any answer to see exactly
                  how it was calculated, and you can add more details to get a more accurate
                  result.
                </p>
                <p>
                  I used AI to build this (I know). But I've already learned ways to reduce
                  the tool's own token, energy, and water usage, and I'll keep optimizing. The
                  goal is to cap the site to no more than one bottle of water per day — and
                  every query shows its own water cost on screen, so the tradeoff is always
                  visible.
                </p>
              </div>
              <div className="bg-mw-water-light/30 rounded-xl p-5 text-center">
                <p className="text-sm text-gray-600 leading-relaxed">
                  This is a project of <strong>MakeWater</strong>, a 501(c)(3) nonprofit focused on water and environmental STEM education. We use hands-on, DIY and codable water purification kits in classrooms and have reached over 10,000 participants in underserved communities around the globe.
                </p>
                <a
                  href="https://www.makewater.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-sm font-medium text-mw-water hover:underline"
                >
                  Learn more at makewater.org
                </a>
              </div>
            </div>
          )}

          {/* Our Methodology */}
          {tab === 'methodology' && <MethodologyContent />}

          {/* FAQ */}
          {tab === 'faq' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-mw-base tracking-tight">Frequently Asked Questions</h1>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <FAQItem key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* What's New */}
          {tab === 'new' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-mw-base tracking-tight">What's New</h1>
              <div className="space-y-4">
                {changelog.map((entry, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-mw-water bg-mw-water-light px-2.5 py-0.5 rounded-full">
                        {entry.version}
                      </span>
                      <span className="text-xs text-gray-400">{entry.date}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-2">{entry.summary}</p>
                    <ul className="space-y-1">
                      {entry.changes.map((change, j) => (
                        <li key={j} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-mw-water flex-shrink-0">-</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Prompt */}
          {tab === 'prompt' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-mw-base tracking-tight">System Prompt</h1>
              <PromptContent />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MethodologyContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-mw-base tracking-tight">Our Methodology</h1>

      {/* Section 1: How We Calculate */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 text-sm text-gray-700 leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-mw-base mb-2">How We Calculate</h2>
          <p>
            We built this tool so every estimate is transparent, auditable, and grounded in
            published research. Here's exactly how it works.
          </p>
        </div>

        {/* Step 1 */}
        <div className="border-l-2 border-mw-water pl-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-mw-water bg-mw-water-light px-2 py-0.5 rounded-full tracking-wider uppercase">Step 1</span>
            <h3 className="font-semibold text-gray-800">AI Classification (No Math)</h3>
          </div>
          <p>
            When you ask a question, a small AI model (Claude Haiku) reads your query and
            identifies four things: the <strong>activity</strong> (e.g. Netflix streaming), the
            <strong> duration</strong>, the <strong>device type</strong>, and the
            <strong> region</strong>. That's it. The AI never calculates anything — it only
            matches your question to an item in our reference dataset. This is intentional:
            if the AI can't invent a number, it can't hallucinate one.
          </p>
        </div>

        {/* Step 2 */}
        <div className="border-l-2 border-mw-water pl-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-mw-water bg-mw-water-light px-2 py-0.5 rounded-full tracking-wider uppercase">Step 2</span>
            <h3 className="font-semibold text-gray-800">Published Reference Data</h3>
          </div>
          <p>
            All energy and water data lives in a static reference dataset you can read in the
            open-source repo. It has three layers:
          </p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex gap-2">
              <span className="text-mw-water flex-shrink-0">•</span>
              <span>
                <a
                  href="https://github.com/ryanbeltran/AskMakeWater/blob/main/src/data/activityLookup.js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mw-water hover:underline font-semibold"
                >
                  24 digital activities
                </a>{' '}
                with energy-per-unit data (kWh) sourced from organizations like the IEA,
                peer-reviewed studies, and company sustainability reports. Each entry cites
                its own source, year, and confidence flags.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-mw-water flex-shrink-0">•</span>
              <span>
                <a
                  href="https://github.com/ryanbeltran/AskMakeWater/blob/main/src/data/recalculate.js#L20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mw-water hover:underline font-semibold"
                >
                  34 regions
                </a>{' '}
                with Water Use Efficiency (WUE) values from data center sustainability
                disclosures (Google, Microsoft, Meta, AWS, and others) plus estimated values
                for regions without published figures.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-mw-water flex-shrink-0">•</span>
              <span>
                <a
                  href="https://github.com/ryanbeltran/AskMakeWater/blob/main/src/data/recalculate.js#L4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mw-water hover:underline font-semibold"
                >
                  9 device types
                </a>{' '}
                with measured wattage data — phones, tablets, laptops, desktops, TVs, gaming
                consoles, smart speakers, and projectors.
              </span>
            </li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="border-l-2 border-mw-water pl-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-mw-water bg-mw-water-light px-2 py-0.5 rounded-full tracking-wider uppercase">Step 3</span>
            <h3 className="font-semibold text-gray-800">The Formula</h3>
          </div>
          <p>The actual math is a single multiplication:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-2 font-mono text-xs text-gray-700 leading-relaxed">
            (Activity energy × duration) + (Device energy × hours)
            <br />
            <span className="ml-4">× Regional WUE = Water (mL)</span>
          </div>
          <p>
            Every calculation runs on the client side in your browser. It's deterministic,
            auditable, and has zero AI involvement — you can open the breakdown on any result
            and see every input we plugged in.
          </p>
        </div>
      </div>

      {/* Section 2: Confidence Scoring */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-mw-base">Confidence Scoring</h2>
        <p>
          Every result includes a confidence score from 0 to 100%. It's built from six factors:
        </p>
        <ul className="space-y-1.5">
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>Whether the underlying data comes from a published source</li>
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>Whether multiple independent sources agree</li>
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>Whether the figure is based on direct measurement (not extrapolation)</li>
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>How region-specific the WUE data is</li>
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>How recent the data is (within the last 2 years scores higher)</li>
          <li className="flex gap-2"><span className="text-mw-water flex-shrink-0">•</span>Whether device-level energy data exists for your setup</li>
        </ul>
        <p className="bg-mw-water-light/40 rounded-lg p-3 text-xs">
          <strong>Important:</strong> a lower confidence score doesn't mean the estimate is
          wrong. It means there's less published data available to verify it. TikTok's server
          costs, for example, are essentially a black box — a 40% confidence score there
          reflects the state of public knowledge, not the quality of our math.
        </p>
      </div>

      {/* Section 3: We Track Our Own Water Cost */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-mw-base">We Track Our Own Water Cost</h2>
        <p>
          Every query this tool runs uses a small amount of energy and water of its own —
          we'd be hypocrites not to count it. We measure the cost of each AI call using:
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-gray-700">
          0.14 Wh per 1,000 tokens × regional WUE
        </div>
        <p>
          The shared water bottle on the home page shows the collective cost of every query
          the site has run today, capped at <strong>500 mL — one standard water bottle</strong>.
          It's a self-imposed ceiling that forces us to keep optimizing: cache repeated
          questions, use the smallest model that works, and never run the AI for math we can
          do in JavaScript.
        </p>
      </div>

      {/* Section 4: Our Sources */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
        <h2 className="text-lg font-semibold text-mw-base">Our Sources</h2>
        <p>
          Every individual result card links to the specific sources used for that calculation —
          expand the breakdown on any answer to see them. At a high level, our reference data
          comes from four source categories:
        </p>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-1">Activity energy data</h3>
            <p className="text-xs text-gray-600">
              IEA streaming energy analysis, The Shift Project, peer-reviewed studies on
              streaming, AI, and cryptocurrency energy consumption, Greenspector social media
              energy measurements, and the Lawrence Berkeley National Lab 2024 Data Center
              Energy Report.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-1">Water Use Efficiency (WUE) data</h3>
            <p className="text-xs text-gray-600">
              Google Environmental Reports, Microsoft Sustainability Reports, Meta
              Sustainability Reports, AWS sustainability disclosures, and the UC Riverside
              "Making AI Less Thirsty" study (Ren et al., 2023) for regional WUE estimates.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-1">Device wattage data</h3>
            <p className="text-xs text-gray-600">
              Published device wattage measurements from manufacturers, Energy Star certified
              product data, and independent power-draw testing for phones, laptops, TVs, and
              gaming consoles.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-1">AI model energy</h3>
            <p className="text-xs text-gray-600">
              Published estimates of energy per token and energy per query for major LLM
              providers, including figures disclosed by Anthropic, OpenAI, and Google, and
              independent academic analyses of transformer inference cost.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          The full reference dataset is open source and versioned in the repo — you can
          inspect every number, its source citation, and the calculation that uses it on{' '}
          <a href="https://github.com/ryanbeltran/AskMakeWater" className="text-mw-water hover:underline">GitHub</a>.
        </p>
      </div>
    </div>
  );
}

function PromptContent() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
      <p>
        <strong>ask makewater</strong> uses a two-tier AI architecture designed to minimize water and energy usage while maximizing transparency.
      </p>

      <h3 className="font-semibold text-gray-800 mt-4">How it works</h3>
      <ol className="list-decimal list-inside space-y-2">
        <li>
          <strong>Classifier (Haiku)</strong> — A small, efficient model reads your question and identifies the activity type plus parameters (duration, device, region). It does zero math. The system prompt lists 24 known activity IDs and the AI simply picks the best match.
        </li>
        <li>
          <strong>Client-side calculation</strong> — Your browser looks up real energy data from our reference dataset and applies the formula: <code className="bg-gray-100 px-1 rounded">water_ml = (activity_kwh + device_kwh) x duration x WUE x 1000</code>. No AI involved in any calculation.
        </li>
        <li>
          <strong>Tier 2 refinement (Sonnet)</strong> — Only triggered if you ask a follow-up question about an unusual setup. Uses a larger model for nuanced responses.
        </li>
      </ol>

      <h3 className="font-semibold text-gray-800 mt-4">Why this matters</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>The AI doesn't generate water numbers — it only classifies, the math is deterministic. Misclassifications can still happen, but we're always working to reduce them.</li>
        <li>Prompt caching means repeat-pattern queries use ~90% fewer input tokens</li>
        <li>Haiku uses ~10x less energy than larger models</li>
        <li>Every query shows its own water cost on screen</li>
      </ul>

      <h3 className="font-semibold text-gray-800 mt-4">Confidence scoring</h3>
      <p>Each result gets a confidence score (0-100%) based on 7 criteria:</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>Energy figure from published research (+25%)</li>
        <li>WUE from specific facility data (+20%)</li>
        <li>Multiple corroborating sources (+15%)</li>
        <li>Direct measurement data (+15%)</li>
        <li>Region-specific data available (+10%)</li>
        <li>Data from last 2 years (+10%)</li>
        <li>Device energy independently measured (+5%)</li>
      </ul>

      <p className="text-xs text-gray-400 mt-4">
        The full system prompt and calculation engine are open source. View the code on{' '}
        <a href="https://github.com/ryanbeltran/AskMakeWater" className="text-mw-water hover:underline">GitHub</a>.
      </p>
    </div>
  );
}

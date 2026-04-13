import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import WaterDrop from '../components/WaterDrop';
import WaterBottle from '../components/WaterBottle';
import RecentSearches from '../components/RecentSearches';
import { calculateMetaWater } from '../data/recalculate';
import TokenCalculator from '../components/TokenCalculator';

const EXAMPLE_QUESTIONS = [
  'How much water does it cost to stream Netflix for 2 hours?',
  'What is the water footprint of a ChatGPT conversation?',
  'How much water does one Bitcoin transaction use?',
  'What costs more water: an hour of TikTok or an hour of Zoom?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [usages, setUsages] = useState({});
  const [models, setModels] = useState({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [repeats, setRepeats] = useState({});
  const [showTokenCalc, setShowTokenCalc] = useState(false);

  // Global usage state
  const [bottleMl, setBottleMl] = useState(0);
  const [bottleMax, setBottleMax] = useState(500);
  const [recentQueries, setRecentQueries] = useState([]);

  // Fetch global usage on mount
  useEffect(() => {
    fetch('/api/usage')
      .then(r => r.json())
      .then(data => {
        setBottleMl(data.total_ml || 0);
        setBottleMax(data.max_ml || 500);
        setRecentQueries(data.recent || []);
      })
      .catch(() => {}); // silent fail — bottle just shows 0
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Report the water cost of the AI query itself (meta cost from tokens used)
  async function reportUsage(query, usage) {
    if (!usage) return;
    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    if (totalTokens === 0) return;

    const waterMl = calculateMetaWater(totalTokens);
    const waterDisplay = waterMl < 1
      ? `${waterMl.toFixed(2)} mL`
      : `${waterMl.toFixed(1)} mL`;

    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          water_ml: waterMl,
          tokens: totalTokens,
        }),
      });
      const data = await res.json();
      if (data.total_ml !== undefined) {
        setBottleMl(data.total_ml);
      }
      setRecentQueries(prev => [{
        query,
        timestamp: Date.now(),
      }, ...prev].slice(0, 10));
    } catch {
      // silent fail
    }
  }

  async function sendMessage(text, { isRepeat = false } = {}) {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const assistantMessage = { role: 'assistant', content: data.text };
      const msgIndex = newMessages.length;
      setMessages(prev => [...prev, assistantMessage]);
      setUsages(prev => ({ ...prev, [msgIndex]: data.usage }));
      setModels(prev => ({ ...prev, [msgIndex]: data.model }));
      if (isRepeat) {
        setRepeats(prev => ({ ...prev, [msgIndex]: true }));
      }

      // Only report usage for new queries, not repeat searches
      if (!isRepeat) {
        reportUsage(text.trim(), data.usage);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  // Tier 2: short follow-up API call for unusual setups
  const handleTier2Submit = useCallback(async (text, originalResult) => {
    try {
      const context = `The user previously asked about "${originalResult.activity}" and got a result of ${originalResult.water_display}. They want to refine with this additional detail: "${text}".

Provide a brief adjustment to the water estimate based on their specific setup. Be concise (2-3 sentences max). If you can provide an updated water figure, do so. If the detail doesn't materially change the estimate, say so.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: context }],
          max_tokens: 500,
          tier2: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      return data.text.replace(/<classify>[\s\S]*?<\/classify>/, '').replace(/<water-result>[\s\S]*?<\/water-result>/, '').trim();
    } catch (err) {
      return `Sorry, couldn't process that refinement: ${err.message}`;
    }
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setMessages([]); setUsages({}); setModels({}); setRepeats({}); }}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
          >
            <WaterDrop size={22} className="text-mw-water" />
            <span className="font-bold text-mw-base tracking-tight text-lg">
              ask <span className="text-mw-water">makewater</span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <Link
              to="/about"
              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:border-mw-water hover:text-mw-water transition-colors no-underline"
            >
              FAQ
            </Link>
            <a
              href="https://www.makewater.org/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark transition-colors no-underline"
            >
              Donate
            </a>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              {/* Hero: text left, bottle right */}
              <div className="flex items-center gap-8 mb-8 w-full max-w-lg">
                <div className="flex-1 text-left">
                  <h1 className="text-2xl font-bold text-mw-base tracking-tight mb-2">
                    What's the water cost of your digital life?
                  </h1>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Every digital action has a hidden water cost. Ask anything — streaming, AI, gaming,
                    crypto, social media — and we'll show you the water footprint with full transparency.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <WaterBottle currentMl={bottleMl} maxMl={bottleMax} />
                </div>
              </div>

              {/* Input area */}
              <div className="w-full max-w-lg mb-8 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="How much water does it cost to..."
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 focus:bg-white disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-2.5 bg-mw-water text-white rounded-xl text-sm font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <WaterDrop size={14} />
                    Ask
                  </button>
                </form>
                <p className="text-[11px] text-gray-400 mt-2 text-center leading-relaxed">
                  Every estimate is our best calculation based on published research. We show our work.
                  Think we got something wrong?{' '}
                  <a href="https://www.makewater.org/contact" target="_blank" rel="noopener noreferrer" className="text-mw-water hover:underline">
                    Tell us
                  </a>
                  .
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mb-8">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Token calculator */}
              <div className="w-full max-w-lg mb-8 flex flex-col items-center">
                {showTokenCalc ? (
                  <TokenCalculator onClose={() => setShowTokenCalc(false)} />
                ) : (
                  <button
                    onClick={() => setShowTokenCalc(true)}
                    className="text-sm text-gray-500 border border-gray-200 rounded-xl px-4 py-2.5 hover:border-mw-water hover:text-mw-water transition-colors cursor-pointer bg-white"
                  >
                    Token Water Calculator
                  </button>
                )}
              </div>

              {/* Recent searches */}
              {recentQueries.length > 0 && (
                <RecentSearches queries={recentQueries} onQueryClick={(q) => sendMessage(q, { isRepeat: true })} />
              )}

            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  message={msg}
                  query={msg.role === 'assistant' && i > 0 ? messages[i - 1]?.content : undefined}
                  usage={msg.role === 'assistant' ? usages[i] : undefined}
                  model={msg.role === 'assistant' ? models[i] : undefined}
                  onTier2Submit={handleTier2Submit}
                  isRepeatQuery={!!repeats[i]}
                />
              ))}
              {loading && <LoadingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Footer input — only shown in chat mode */}
      {!isEmpty && (
        <footer className="flex-shrink-0 border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="How much water does it cost to..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-mw-water text-white rounded-xl text-sm font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <WaterDrop size={14} />
                Ask
              </button>
            </form>
          </div>
        </footer>
      )}
    </div>
  );
}

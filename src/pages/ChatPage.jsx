import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage';
import LoadingIndicator from '../components/LoadingIndicator';
import WaterDrop from '../components/WaterDrop';
import WaterBottle from '../components/WaterBottle';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { calculateMetaWater } from '../data/recalculate';
import TokenCalculator from '../components/TokenCalculator';
import GeometricBackground from '../components/GeometricBackground';
import SuggestCorrectionForm from '../components/SuggestCorrectionForm';
import EmailSignup from '../components/EmailSignup';
import { computeChangelogTotals, getFoundingCost, formatWater, formatEnergy } from '../data/changelogCost';

const EXAMPLE_QUESTIONS = [
  'How much water does it cost to stream Netflix for 2 hours?',
  'What is the water footprint of a ChatGPT conversation?',
  'How much water does one Bitcoin transaction use?',
  'What costs more water: an hour of TikTok or an hour of Zoom?',
];

// Cap per session: 5 user messages total (initial question + 4 follow-ups).
// Keeps token costs bounded and prevents treating the tool like a general chatbot.
const MAX_USER_MESSAGES = 5;

// Fire-and-forget: if the classifier returned an estimated-tier result,
// log it to /api/suggest so admins can review what's missing from the catalog.
function logEstimatedSuggestion(responseText, query) {
  try {
    const m = responseText.match(/<classify>\s*([\s\S]*?)\s*<\/classify>/);
    if (!m) return;
    const c = JSON.parse(m[1]);
    const isGeneral = c.activity_id === 'general_energy';
    const isLegacyEstimated = c.estimated === true;
    if (!isGeneral && !isLegacyEstimated) return;

    const payload = isGeneral
      ? {
          type: 'suggestion',
          suggested_activity_name: c.suggested_activity_name,
          estimated_watts: c.estimated_watts,
          estimated_kwh_per_hour: (Number(c.estimated_watts) || 0) / 1000,
          energy_source: c.energy_source,
          reasoning: c.confidence_note,
          similar_to: null,
          query,
        }
      : {
          type: 'suggestion',
          suggested_activity_name: c.suggested_activity_name,
          estimated_kwh_per_hour: c.estimated_kwh_per_hour,
          reasoning: c.reasoning,
          similar_to: c.similar_to,
          query,
        };

    fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // silent fail
  }
}

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
  // Signal to the latest ResultCard to expand its breakdown and scroll
  // to a specific editable field (device or region).
  const [focusRequest, setFocusRequest] = useState(null);
  const [correctionTarget, setCorrectionTarget] = useState(null);

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

  // Count user messages (initial + follow-ups) for the session cap
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const atMessageLimit = userMessageCount >= MAX_USER_MESSAGES;

  function resetConversation() {
    setMessages([]);
    setUsages({});
    setModels({});
    setRepeats({});
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMessage(text, { isRepeat = false } = {}) {
    if (!text.trim() || loading) return;
    if (atMessageLimit) return;

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

      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          // Non-JSON error response (e.g. proxy failure)
          if (res.status === 502 || res.status === 504) {
            errorMsg = 'API server is not running. Start it with: npm run dev:full';
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();

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

      // Fire-and-forget: log estimated-tier classifications to /api/suggest
      // so we can review what people are asking about that isn't in the catalog.
      logEstimatedSuggestion(data.text, text.trim());
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

      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try { const e = await res.json(); msg = e.error || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();

      return data.text.replace(/<classify>[\s\S]*?<\/classify>/, '').replace(/<water-result>[\s\S]*?<\/water-result>/, '').trim();
    } catch (err) {
      return `Sorry, couldn't process that refinement: ${err.message}`;
    }
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  // Handle follow-up chip clicks. Two behaviors:
  //   - focus-device / focus-region: bump focusRequest so the latest
  //     ResultCard opens its breakdown and scrolls to the matching dropdown.
  //   - compose: fill the input so the user can type the rest (e.g. the
  //     comparison target).
  function handleFollowUpAction(chip) {
    if (loading) return;
    if (chip.action === 'focus-device') {
      setFocusRequest({ field: 'device', nonce: Date.now() });
    } else if (chip.action === 'focus-region') {
      setFocusRequest({ field: 'region', nonce: Date.now() });
    } else if (chip.action === 'compose') {
      if (atMessageLimit) return;
      setInput(chip.prompt);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  const isEmpty = messages.length === 0;

  // Index of the last assistant message — chips only render there
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  // Dynamic placeholder: initial vs follow-up mode
  const followUpPlaceholder = 'Adjust this estimate or ask about another activity...';
  const initialPlaceholder = 'How much water does it cost to...';

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] relative">
      <GeometricBackground />

      <SiteHeader onLogoClick={resetConversation} />

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              {/* Hero: text left, bottle right */}
              <div className="flex items-center gap-8 mb-8 w-full max-w-lg">
                <div className="flex-1 text-left">
                  <h1 className="text-2xl font-bold text-mw-base tracking-tight mb-2">
                    How much water do AI and data centers use?
                  </h1>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Map the water and energy behind any digital activity: the data centers serving you, the power that feeds them, and the watersheds they draw from.
                    We cap our queries to one bottle a day.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <WaterBottle currentMl={bottleMl} maxMl={bottleMax} />
                </div>
              </div>

              {/* Build-cost transparency widget */}
              {(() => {
                const totals = computeChangelogTotals();
                const founding = getFoundingCost();
                return (
                  <div className="w-full max-w-lg mb-6 text-left">
                    <div className="bg-white/80 border border-gray-100 rounded-xl px-4 py-3 text-[11px] text-gray-400 leading-relaxed space-y-0.5">
                      <p>
                        Launching v1.0.0 cost {formatWater(founding?.water_ml || 0)} of water and {formatEnergy(founding?.energy_wh || 0)}.
                      </p>
                      <p>
                        {totals.versions} updates later, cumulative build cost: {formatWater(totals.totalWaterMl)} water, {formatEnergy(totals.totalEnergyWh)}.
                      </p>
                      <p>
                        <a href="/about?tab=new" className="text-mw-water hover:underline">See per-version costs →</a>
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Input area */}
              <div className="w-full max-w-lg mb-8 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={initialPlaceholder}
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
                  Estimates based on published research.{' '}
                  <Link to="/sources" className="text-mw-water hover:underline">
                    See our sources
                  </Link>
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

              {/* Email signup */}
              <div className="w-full max-w-lg mb-8">
                <EmailSignup />
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

              {/* RecentSearches intentionally hidden from public view */}

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
                  showFollowUps={i === lastAssistantIdx && !loading}
                  onFollowUpAction={handleFollowUpAction}
                  followUpsDisabled={loading}
                  focusRequest={i === lastAssistantIdx ? focusRequest : null}
                  onSuggestCorrection={setCorrectionTarget}
                />
              ))}
              {loading && <LoadingIndicator />}

              {/* Message limit reached banner */}
              {atMessageLimit && !loading && (
                <div className="flex justify-center pt-2">
                  <div className="bg-mw-water-light border border-mw-water/30 rounded-2xl px-5 py-4 text-center max-w-md">
                    <p className="text-sm text-mw-water-dark font-medium mb-2">
                      Start a new question to keep exploring
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      Each session is limited to {MAX_USER_MESSAGES} messages to keep our water cost low.
                    </p>
                    <button
                      onClick={resetConversation}
                      className="text-xs px-4 py-2 bg-mw-water text-white rounded-lg font-medium hover:bg-mw-water-dark transition-colors cursor-pointer"
                    >
                      Start new question
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Chat input — only shown in chat mode */}
      {!isEmpty && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white relative z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={atMessageLimit ? 'Start a new question to keep exploring' : followUpPlaceholder}
                disabled={loading || atMessageLimit}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-mw-water focus:ring-1 focus:ring-mw-water/30 disabled:opacity-50 disabled:bg-gray-50 transition-colors"
              />
              <button
                type="submit"
                disabled={loading || atMessageLimit || !input.trim()}
                className="px-4 py-2.5 bg-mw-water text-white rounded-xl text-sm font-medium hover:bg-mw-water-dark disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <WaterDrop size={14} />
                Ask
              </button>
            </form>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              {userMessageCount} / {MAX_USER_MESSAGES} messages this session
            </p>
          </div>
        </div>
      )}

      {/* Correction modal */}
      <SuggestCorrectionForm target={correctionTarget} onClose={() => setCorrectionTarget(null)} />

      <SiteFooter />
    </div>
  );
}

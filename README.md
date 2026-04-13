# ask makewater

**The Digital Water Cost Calculator**

A project of [MakeWater](https://www.makewater.org) 501(c)(3)

<!-- TODO: Replace with actual screenshot -->
![ask makewater screenshot](screenshot-placeholder.png)

**[Try it live](https://ask-makewater.vercel.app)**

---

Every digital action has a hidden water cost. ask makewater lets anyone type a natural language question — about streaming, AI, gaming, crypto, social media, or email — and get a transparent, research-backed estimate of how much water that activity uses.

```
"How much water does it cost to stream Netflix for 2 hours?"
"What is the water footprint of a ChatGPT conversation?"
"How much water does one Bitcoin transaction use?"
```

The AI classifies your question. All the math happens client-side from published data. You can see exactly how every number was calculated.

---

## Features

- **30 digital activities** with published energy data across streaming, AI, social media, gaming, crypto, email, and search
- **40 global regions** with specific Water Use Efficiency (WUE) values
- **11 device types** with measured wattage data
- **Confidence scoring** — every estimate shows why it earned its score (published sources, multi-source verification, data recency, etc.)
- **Interactive editing** — adjust duration, device, and region to refine any estimate
- **Token Water Calculator** — compare water costs across 10 AI models (Gemini, Claude, GPT-4, Llama, Grok, and more)
- **Daily water bottle** — tracks the collective water cost of all queries site-wide, persisted across deploys
- **Recent searches** — clickable, community-visible query history (privacy-aware: only query text is public)
- **Open system prompt** — full transparency into how the AI classifies questions
- **Meta-cost tracking** — the app honestly shows the water cost of running itself

---

## Quick Start

```bash
git clone https://github.com/ryanbeltran/AskMakeWater.git
cd AskMakeWater/ask-makewater

npm install

# Set up environment
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

# Run everything
npm run dev:full
```

The frontend runs on `http://localhost:5173` and the API server on `http://localhost:3001`. Vite proxies `/api/*` automatically.

You can also run them separately:

```bash
npm run dev      # Frontend only
npm run dev:api  # API server only
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | [Anthropic API key](https://console.anthropic.com/) |
| `ADMIN_PASSWORD` | No | Protects the `/admin` eval dashboard |

Redis env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) are auto-set when you add the [Upstash integration on Vercel](https://vercel.com/integrations/upstash). Without Redis, usage data is stored in-memory (resets on restart).

---

## Architecture

### How a Query Works

```
User question
    |
    v
Claude Haiku classifies --> <classify> JSON
    |
    v
Frontend parses JSON --> looks up activity in local reference dataset
    |
    v
Client-side math: (activity kWh x duration + device kWh x hours) x regional WUE = water mL
    |
    v
Result card with water cost, confidence score, sources, and comparisons
```

**The AI never does math.** It only classifies. All water calculations are deterministic, auditable, and happen in the browser from published research data.

### Two-Tier Model

| Tier | Model | Role |
|------|-------|------|
| Tier 1 | Claude Haiku 4.5 | Fast classifier — identifies activity, duration, device, and region from natural language |
| Tier 2 | Claude Sonnet 4 | Optional follow-up for nuanced refinements |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Routing | React Router 7 |
| API | Vercel Serverless Functions |
| AI | Anthropic Claude API |
| Storage | Upstash Redis (free tier) |
| Hosting | Vercel |

---

## Project Structure

```
ask-makewater/
├── api/
│   ├── chat.js              # Classification endpoint (Haiku + Sonnet)
│   ├── admin-auth.js         # Admin password check
│   ├── systemPrompt.js       # Classifier prompt builder
│   └── usage.js              # Daily usage tracking (Redis)
├── src/
│   ├── components/
│   │   ├── ResultCard.jsx           # Interactive result display
│   │   ├── ChatMessage.jsx          # Message parsing + rendering
│   │   ├── TokenCalculator.jsx      # Multi-model token water calculator
│   │   ├── WaterBottle.jsx          # SVG canteen with fill animation
│   │   ├── AIModelComparison.jsx    # LLM comparison table
│   │   ├── InteractiveBreakdown.jsx # Expandable calculation details
│   │   ├── MetaCost.jsx             # Per-query meta water cost
│   │   ├── RecentSearches.jsx       # Community query history
│   │   └── ...
│   ├── data/
│   │   ├── water_cost_reference_data.json  # Energy + WUE reference dataset
│   │   ├── recalculate.js                  # Deterministic water math
│   │   ├── activityLookup.js               # Activity catalog
│   │   ├── aiModelComparison.js            # Model energy estimates
│   │   └── evalTests.json                  # 40 classifier test cases
│   └── pages/
│       ├── ChatPage.jsx    # Home + chat interface
│       ├── AboutPage.jsx   # FAQ / Why / System Prompt
│       └── AdminPage.jsx   # Classifier eval dashboard
├── server.js               # Local dev API server
├── vercel.json             # Deployment config
└── .env.example
```

---

## Eval Dashboard

The app includes a password-protected admin dashboard at `/admin` with 40 test cases covering every activity, edge cases, ambiguous phrasing, device/region detection, and off-catalog requests. Tests run through the real API and grade the classifier as PASS / PARTIAL / FAIL with detailed breakdowns.

---

## Design Principles

1. **AI classifies, math is deterministic.** No hallucinated numbers. Every calculation is auditable.
2. **Confidence is transparent.** Users see exactly which factors contributed to the score.
3. **Privacy by default.** Only query text is public. Analytics stay server-side.
4. **Meta-cost honesty.** The app tracks the water cost of running itself.
5. **Open system prompt.** The full AI instructions are viewable at `/about`.

---

## Deploying

Deployed on Vercel with automatic deploys from `main`.

```bash
npx vercel --prod
```

For persistent usage tracking, add the Upstash Redis integration:

```bash
npx vercel integration add upstash/upstash-kv
```

---

## Contributing

This project is in early development. If you'd like to help:

- **Data accuracy** — Know of better energy consumption sources? [Tell us](https://www.makewater.org/contact)
- **New activities** — Want to see a digital activity added? Open an issue
- **Bug reports** — Something look wrong? Let us know

---

## About MakeWater

[MakeWater](https://www.makewater.org) is a 501(c)(3) water education nonprofit. Our mission is to make the invisible water costs of modern life visible and understandable.

[Donate](https://www.makewater.org/donate) | [Contact](https://www.makewater.org/contact) | [Website](https://www.makewater.org)

---

*Built with transparency, powered by research, funded by donations.*

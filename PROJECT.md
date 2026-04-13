# ask makewater — Digital Water Cost Calculator

**A project of [MakeWater](https://www.makewater.org) 501(c)(3)**

ask makewater is an open-source, AI-powered tool that calculates the hidden water cost of everyday digital activities — streaming, social media, AI queries, gaming, crypto, and more. It uses a transparent, auditable classification system where AI identifies what you're asking about, and all math is done deterministically on the client side from published research data.

Live at: [ask-makewater.vercel.app](https://ask-makewater.vercel.app)

---

## What It Does

Users ask natural language questions like:

- "How much water does it cost to stream Netflix for 2 hours?"
- "What is the water footprint of a ChatGPT conversation?"
- "How much water does one Bitcoin transaction use?"

The app classifies the question, calculates the water cost using published energy and water-use-efficiency (WUE) data, and returns a detailed, interactive result card with confidence scoring, source citations, and contextual comparisons.

---

## Architecture

### Two-Tier AI Classification

| Tier | Model | Purpose |
|------|-------|---------|
| **Tier 1** | Claude Haiku 4.5 | Fast classifier — identifies activity, duration, device, region from natural language. Returns structured JSON. Does NO math. |
| **Tier 2** | Claude Sonnet 4 | Optional follow-up for nuanced refinements when users ask deeper questions. |

### How a Query Works

```
User question
    ↓
Claude Haiku classifies → <classify> JSON
    ↓
Frontend parses JSON → looks up activity in local reference dataset
    ↓
Client-side math: (activity kWh × duration + device kWh × hours) × regional WUE = water mL
    ↓
Result card with water cost, confidence score, sources, and comparisons
```

All water calculations are deterministic and auditable. The AI never does math — it only classifies.

### Meta-Cost Tracking

Every AI query itself uses water (to power the data centers running the LLM). The app tracks this "meta-cost" using the formula:

```
0.14 Wh per 1,000 tokens × regional WUE (1.8 L/kWh default) = water per query
```

A shared water bottle on the home page fills up throughout the day showing the collective water cost of all queries made by all users.

---

## Features

### Core Calculator
- **30 digital activities** with published energy data: streaming (Netflix, YouTube, TikTok), AI (ChatGPT, Gemini, image/video generation), social media (Instagram, Facebook, X, Snapchat), gaming (cloud, console, mobile), crypto (Bitcoin, Ethereum), email, video calls, and search
- **40 regions** with specific Water Use Efficiency (WUE) values — from US states to global regions
- **11 device types** with measured wattage data (phone, tablet, laptop, desktop, TVs, console, etc.)
- **Confidence scoring** (0-100%) based on: published sources, multi-source verification, direct measurement, regional specificity, data recency, and device measurement
- **Interactive parameter editing** — users can adjust duration, device, and region to see how the estimate changes
- **AI model comparison** — for AI-related queries, shows water cost across different LLM providers
- **Source citations** with year and publication details

### Token Water Calculator
A standalone, deterministic calculator (no AI needed) that compares the water cost of processing tokens across 10 AI models:

| Model | Wh per 1K tokens |
|-------|-------------------|
| Google Gemini | 0.30 |
| Claude Haiku | 0.38 |
| GPT-4o mini | 0.63 |
| Gemini Ultra | 0.90 |
| Claude Sonnet | 1.88 |
| Grok (xAI) | 2.50 |
| GPT-4 / GPT-4o | 3.63 |
| Llama (local) | 3.75 |
| Claude Opus | 5.63 |
| GPT-4.5 | 7.25 |

Includes token presets (1K–1M), regional WUE selection, horizontal bar chart with confidence coloring, and bottle count conversions (1 bottle = 500 mL).

### Daily Water Bottle
- Tracks collective water usage from all queries site-wide for the day
- Canteen-shaped SVG with wave animation, measurement notches, and light blue minimum fill
- Shows precise mL with decimals
- Persisted across deploys and cold starts via Upstash Redis (free tier)
- Turns green and says "Usage is done for today" when the 500 mL daily cap is reached

### Recent Searches
- Shows the last 10 queries made by all users (public: query text + timestamp only)
- Clickable to re-run any query
- Repeat queries are not counted toward the daily water bottle and don't create duplicates

### Privacy-Aware Analytics
- **Public data** (returned to clients): query text and timestamp only
- **Private data** (server-side only, never exposed): zip codes, regions, device types, token counts, activity IDs
- Stored in Upstash Redis with automatic daily expiry

### FAQ / About Page
Three-tab page at `/about`:
- **Why We Built This** — mission statement and methodology
- **FAQ** — 10 questions covering accuracy, data sources, AI hallucination disclaimers, and how to help
- **System Prompt** — full transparency into the AI classification architecture

### Donation Integration
Donorbox popup widget (sticky button) linked to the MakeWater campaign for accepting donations directly from the app.

### Admin Eval Dashboard
Password-protected at `/admin` for testing classifier accuracy:
- **40 test cases** across 8 categories: AI, streaming, social, gaming, crypto, email, edge cases, greetings, and off-catalog requests
- Tests cover: every activity ID, ambiguous phrasing, duration extraction, device/region detection, model comparison flags, and out-of-scope questions
- Fires each test through the real `/api/chat` endpoint
- Grades as **PASS** / **PARTIAL** / **FAIL** with detailed expected vs. actual breakdowns
- Category-level accuracy breakdown
- Re-run failed tests, results persisted to localStorage
- Displays estimated API cost (Haiku pricing: ~$0.03 for full suite)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Routing | React Router 7 |
| API | Vercel Serverless Functions (Node.js) |
| AI | Anthropic Claude API (Haiku + Sonnet) |
| Storage | Upstash Redis (free tier) via `@upstash/redis` |
| Hosting | Vercel |
| Repo | GitHub (private) |

---

## Project Structure

```
ask-makewater/
├── api/
│   ├── chat.js              # AI classification endpoint (Haiku + Sonnet)
│   ├── admin-auth.js         # Admin password verification
│   ├── systemPrompt.js       # Classifier prompt builder
│   └── usage.js              # Daily water usage tracking (Redis)
├── public/
│   ├── favicon.svg
│   └── makewater-logo.png
├── src/
│   ├── components/
│   │   ├── AIModelComparison.jsx    # LLM water cost comparison table
│   │   ├── ChatMessage.jsx          # Message bubble + result parsing
│   │   ├── DonateButton.jsx         # Donorbox integration
│   │   ├── InteractiveBreakdown.jsx # Expandable calculation details
│   │   ├── LoadingIndicator.jsx     # Water drop loading animation
│   │   ├── MetaCost.jsx             # Meta water cost display per query
│   │   ├── RecentSearches.jsx       # Clickable recent query list
│   │   ├── RefinementQuestions.jsx   # Follow-up question prompts
│   │   ├── ResultCard.jsx           # Main result display with editing
│   │   ├── TokenCalculator.jsx      # Standalone token water calculator
│   │   ├── WaterBottle.jsx          # SVG canteen with fill animation
│   │   ├── WaterDrop.jsx            # Water drop icon
│   │   └── WaterLogo.jsx            # Logo component
│   ├── data/
│   │   ├── activityLookup.js              # Activity reference data
│   │   ├── aiModelComparison.js           # Model energy estimates
│   │   ├── evalTests.json                 # 40 classifier test cases
│   │   ├── recalculate.js                 # Deterministic water math engine
│   │   ├── serviceRouting.js              # Service routing logic
│   │   ├── systemPrompt.js                # Shared prompt builder
│   │   ├── water_cost_reference_data.json # Full reference dataset
│   │   └── zipRegions.js                  # ZIP code → region mapping
│   ├── pages/
│   │   ├── ChatPage.jsx    # Main page (home + chat)
│   │   ├── AboutPage.jsx   # FAQ / Why / System Prompt tabs
│   │   └── AdminPage.jsx   # Eval dashboard
│   ├── App.jsx             # Router
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind + custom styles
├── server.js               # Local dev API server
├── index.html              # HTML shell + Donorbox widget
├── vite.config.js          # Vite + Tailwind + API proxy
├── vercel.json             # Deployment config
├── .env.example            # Environment variable template
└── package.json
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `ADMIN_PASSWORD` | Yes | Password for /admin eval dashboard |
| `KV_REST_API_URL` | No | Upstash Redis URL (auto-set by Vercel integration) |
| `KV_REST_API_TOKEN` | No | Upstash Redis token (auto-set by Vercel integration) |

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY and ADMIN_PASSWORD

# Start both frontend + API server
npm run dev:full

# Or separately:
npm run dev      # Vite frontend on :5173
npm run dev:api  # API server on :3001
```

The Vite dev server proxies `/api/*` requests to `localhost:3001`.

---

## Deployment

Deployed on Vercel with automatic deploys from the `main` branch.

```bash
# Manual deploy
npx vercel --prod
```

Redis persistence is provided by the Upstash integration (free tier, auto-provisioned via `vercel integration add upstash/upstash-kv`).

---

## Key Design Decisions

1. **AI does classification only, not math.** All water calculations are deterministic and auditable on the client side. This prevents hallucinated numbers and makes the system verifiable.

2. **Confidence scoring is transparent.** Every estimate shows exactly why it earned its confidence score — which factors were met (published source, multi-source verification, etc.) and which weren't.

3. **Privacy by default.** Only query text is public. ZIP codes, device info, and other analytics are stored server-side and never returned to clients.

4. **Meta-cost honesty.** The app tracks and displays the water cost of running itself — the AI queries that power the calculator contribute to a shared daily water bottle.

5. **Repeat queries don't double-count.** Clicking a recent search re-runs the classification but doesn't add to the daily water usage.

6. **Open system prompt.** Users can view the exact instructions given to the AI at `/about` (System Prompt tab). Full transparency.

---

## About MakeWater

[MakeWater](https://www.makewater.org) is a 501(c)(3) water education nonprofit. Our mission is to make the invisible water costs of modern life visible and understandable.

- Website: [makewater.org](https://www.makewater.org)
- Donate: [makewater.org/donate](https://www.makewater.org/donate)
- Contact: [makewater.org/contact](https://www.makewater.org/contact)

---

*Built with transparency, powered by research, funded by donations.*

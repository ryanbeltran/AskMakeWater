# CLAUDE.md — Project conventions for AI-assisted development

## Project overview

ask-makewater is a React 19 + Vite 8 + Tailwind CSS 4 app that calculates
the water cost of digital activities. Deployed on Vercel with serverless
API routes in `api/`. Uses Upstash Redis for persistence.

## Key commands

- `npm run dev` — Vite dev server (frontend only)
- `npm run dev:full` — frontend + API server (via vercel dev)
- `npm run build` — production build
- `npm run preview` — preview production build locally

## Code conventions

- ESM throughout (`import`/`export`, no `require`)
- Tailwind utility classes inline; no separate CSS files
- Components in `src/components/`, pages in `src/pages/`, data in `src/data/`
- JSON data files imported directly (Vite handles JSON imports)
- SVG components use `viewBox` scaling for responsiveness

## Changelog maintenance discipline

Every shipped version must include a `tokens_estimated` field in its
`src/data/changelog.json` entry. This feeds the build-cost transparency
widget on the home page and per-version cost lines on the About page.

### How to estimate tokens

- Count approximate input + output tokens across all AI coding sessions
- Small bugfix: 8K–30K tokens
- Medium feature: 60K–120K tokens
- Large feature: 150K–300K tokens

### What updates automatically

- `src/data/changelogCost.js` converts tokens → water (mL) + energy (Wh)
- About page (What's New tab) shows per-entry cost below each version
- Home page shows founding cost + cumulative total
- `SiteFooter.jsx` reads version from `changelog[0].version`

## Environment variables

- `ANTHROPIC_API_KEY` — Claude API (used by classifier + deep research)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Redis persistence
- `ADMIN_PASSWORD` — admin dashboard auth
- Never commit `.env.local` (gitignored)

## Water math

- Headline: dual-region attribution when ZIP is set (user grid + DC grid + DC cooling)
- Fallback: single-region with selected region's WUE
- Meta-cost formula: `energy_wh = (tokens / 1000) × 0.14`, `water_ml = (energy_wh / 1000) × 1800`
- DC energy approximated as 80% of activity energy

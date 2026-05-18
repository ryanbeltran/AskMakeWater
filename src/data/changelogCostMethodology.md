# Build-Cost Methodology

How we estimate the water and energy cost of building this app.

## What we're measuring

Every version of ask-makewater was built with AI assistance (Claude Sonnet
and Haiku). Each coding session consumes inference tokens, which consume
electricity, which consumes water. We track approximate token counts per
version and convert them to energy and water using the same formula the app
uses for its own query accounting.

## Token estimates

Each changelog entry carries a `tokens_estimated` field — a rough estimate
of total input + output tokens across all AI-assisted coding sessions for
that version. These are order-of-magnitude estimates based on conversation
length and complexity, not precise API billing data.

Ranges:
- Small polish / bugfix: 8K–30K tokens
- Medium feature: 60K–120K tokens
- Large feature (new subsystem): 150K–300K tokens

## Conversion formula

```
energy_wh  = (tokens / 1000) × 0.14
water_ml   = (energy_wh / 1000) × 1800
```

### Energy: 0.14 Wh per 1K tokens

Industry estimates for inference energy on models in the Sonnet/Haiku class
(~70B parameters, optimized inference stack). This covers GPU compute only —
it doesn't include training amortization, networking, or storage.

### Water: 1800 mL per kWh (= 1.8 L/kWh)

US-average blended water intensity covering:
- **Site water**: direct cooling at the data center (~0.5 L/kWh typical)
- **Grid water**: water consumed by the power plants generating the
  electricity (~1.3 L/kWh US average)

This matches the app's `calculateMetaWater()` function in `recalculate.js`.

## What's NOT included

- **Training cost**: We only count inference tokens, not the water/energy
  that went into training the models we use.
- **Human energy**: Developer time, coffee, commute, etc.
- **Infrastructure**: CI/CD runs, Vercel builds, npm installs.
- **Research browsing**: Reading papers and docs to inform the build.

## Maintenance discipline

When shipping a new version:
1. Estimate total tokens used during development
2. Add `tokens_estimated` to the new changelog.json entry
3. The About page and home page widget update automatically

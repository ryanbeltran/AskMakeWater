/**
 * AI-powered data extraction endpoint (admin-only).
 *
 * POST /api/extract
 * Body: { text: string, source_hint?: string }
 *
 * Sends the raw text to Claude Sonnet with a structured-extraction prompt
 * and returns the parsed data points + any citation fields the model could
 * identify. The admin always reviews and approves before saving.
 *
 * Auth: X-Admin-Password header matching ADMIN_PASSWORD.
 */

import Anthropic from '@anthropic-ai/sdk';

const EXTRACTION_MODEL = 'claude-sonnet-4-20250514';
const MAX_INPUT_CHARS = 60000; // ~20k tokens of raw text

const EXTRACTION_SYSTEM_PROMPT = `You are a research data extraction assistant for a water cost calculator. You will be given raw content — pasted from a PDF, webpage, email, or document — and you must identify any quantitative data related to:

- Energy consumption (kWh, MWh, joules, BTU, watts)
- Water usage (liters, gallons, mL, cubic meters per kWh or per activity)
- Power source water intensity (water consumed per unit of electricity generated, broken down by fuel type)
- Cooling method efficiency (water per kWh of thermal load, by cooling technology)
- Data center WUE (Water Usage Effectiveness) values, ideally region- or provider-specific
- Digital activity energy costs (kWh per query, per hour of streaming, etc.)

For each data point you find, extract:
- value (number)
- unit (string, as found in the source — don't convert)
- measures (short description of what it measures, e.g. "water per kWh for coal generation")
- context (conditions, region, year, technology — anything that qualifies the number)
- suggested_category (one of: power_sources, cooling_methods, regional_wue, activity_energy, other)

Also extract citation information for the source:
- source_type (one of: research_paper, government_report, industry_whitepaper, conference, personal_communication, proprietary, website, dataset)
- author (lead author or institutional author)
- title
- organization (publishing org if different from author)
- journal (for papers)
- year
- url (if any URL appears in the content)
- doi (if a DOI appears)
- page (specific page, table, or figure number where the data appears, if detectable)
- notes (anything else useful)

Return ONLY a JSON object inside <extract>...</extract> tags. No prose outside the tags. Shape:

<extract>
{
  "citation": {
    "source_type": "government_report",
    "author": "Macknick, J. et al.",
    "title": "Operational water consumption and withdrawal factors",
    "organization": "NREL",
    "journal": null,
    "year": 2012,
    "url": "https://www.nrel.gov/docs/fy11osti/50900.pdf",
    "doi": null,
    "page": "Table 1",
    "notes": null
  },
  "data_points": [
    {
      "value": 2.2,
      "unit": "liters per kWh",
      "measures": "Total water per kWh for coal-fired generation",
      "context": "Once-through cooling, US average, 2012",
      "suggested_category": "power_sources"
    }
  ]
}
</extract>

If no quantitative data is found, return "data_points": []. If no citation fields can be identified, set them to null — do NOT invent values.`;

function isAuthorized(req) {
  const headerPwd = req.headers?.['x-admin-password']
    || req.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const expected = process.env.ADMIN_PASSWORD;
  return expected && headerPwd && headerPwd === expected;
}

function parseExtractionResponse(text) {
  const m = text.match(/<extract>\s*([\s\S]*?)\s*<\/extract>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { text, source_hint } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text (string) is required' });
  }

  const truncated = text.length > MAX_INPUT_CHARS;
  const payload = truncated ? text.slice(0, MAX_INPUT_CHARS) : text;

  try {
    const client = new Anthropic({ apiKey });
    const userContent = source_hint
      ? `SOURCE HINT (from admin): ${source_hint}\n\nRAW CONTENT:\n${payload}`
      : `RAW CONTENT:\n${payload}`;

    const response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 4000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content?.find(b => b.type === 'text');
    const raw = textBlock?.text || '';
    const parsed = parseExtractionResponse(raw);

    return res.status(200).json({
      ok: true,
      parsed,
      raw,
      truncated,
      usage: response.usage,
      model: response.model,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'extraction failed' });
  }
}

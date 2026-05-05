import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const KEYWORDS = [
  'entergy',
  'sewerage and water board',
  's&wb',
  'swbno',
  'delta utilities',
  'public service commission',
  'psc',
  'nocc',
  'city council utility',
];

const BODY_CHAR_LIMIT = 8000;

export const UTILITY_TAGS = [
  'entergy',
  'swbno',
  'delta',
  'psc',
  'nocc',
  'city_council',
];

const ClassificationSchema = z.object({
  is_relevant: z
    .boolean()
    .describe(
      'True only if the article materially concerns Entergy, SWBNO, or Delta Utilities — or regulatory action by the Louisiana PSC, New Orleans City Council, or its Utility Committee on those utilities. False for passing mentions.'
    ),
  utility_tag: z
    .array(z.enum(UTILITY_TAGS))
    .describe('Which utilities or regulators the article concerns. Empty if not relevant.'),
  summary: z
    .string()
    .describe('2–3 sentence plain-English summary. Empty string if not relevant.'),
  consumer_implication: z
    .string()
    .describe(
      'One sentence stating the concrete effect on a typical New Orleans utility customer (rates, bills, reliability, service). If no direct consumer impact, say so briefly. Empty string if not relevant.'
    ),
});

const SYSTEM_PROMPT = `You are classifying New Orleans news articles for a public-interest utility-tracking website.

The site covers three utilities: Entergy (electric), Sewerage & Water Board of New Orleans (water/sewer — also "SWBNO" or "S&WB"), and Delta Utilities (gas — the new company replacing Entergy Gas). It also covers regulatory action by the Louisiana Public Service Commission (PSC), the New Orleans City Council, and its Utility Committee when those bodies rule on any of the three utilities.

Your task on each article:
1. Decide whether the article materially concerns one of these utilities or a regulator's action on them. A passing mention in a list of unrelated entities is NOT relevant.
2. Tag which utilities/regulators it concerns (multi-tag allowed).
3. Write a 2–3 sentence plain-English summary — prefer concrete facts over vague framing.
4. Write a one-sentence consumer implication describing WHAT changes for a typical New Orleans customer and, where possible, HOW MUCH (rates, bills, reliability, service). If the article has no direct consumer impact, say so briefly.

Return empty strings/arrays when is_relevant is false.`;

let _client = null;
function getClient() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }
  _client = new Anthropic();
  return _client;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function passesKeywordPrefilter({ title, rawExcerpt, rawBody }) {
  const blob = `${title} ${rawExcerpt} ${stripHtml(rawBody).slice(0, 2000)}`.toLowerCase();
  return KEYWORDS.some(kw => blob.includes(kw));
}

export async function classifyArticle({ source, title, pubDate, rawExcerpt, rawBody }) {
  const cleanBody = stripHtml(rawBody).slice(0, BODY_CHAR_LIMIT);
  const content = [
    `Source: ${source}`,
    pubDate ? `Published: ${new Date(pubDate).toISOString().slice(0, 10)}` : null,
    `Title: ${title}`,
    rawExcerpt ? `Excerpt: ${rawExcerpt}` : null,
    cleanBody ? `\nFull article:\n${cleanBody}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await getClient().messages.parse({
    model: 'claude-opus-4-7',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
    output_config: {
      format: zodOutputFormat(ClassificationSchema),
    },
  });

  return response.parsed_output;
}

#!/usr/bin/env node
// Usage: TP_SESSION_COOKIE=... node scripts/testHtmlFetch.mjs
// Fetches a known TP article and a known Lens article; reports body length and fetch status.

import { fetchArticleBody } from '../api/_lib/news/htmlFetch.js';

const TARGETS = [
  {
    source: 'tp',
    url: 'https://www.nola.com/news/swb-city-council-hilferty/article_ab6db6da-0850-4780-ac41-0ca17fd356c5.html',
  },
  {
    source: 'lens',
    url: 'https://thelensnola.org/2026/04/14/meta-project-evest-louisiana-energy-expansion-costs-entergy/',
  },
];

for (const t of TARGETS) {
  const r = await fetchArticleBody(t.url, t.source);
  console.log(`[${t.source}] ${t.url}`);
  console.log(`  status: ${r.fetchStatus}${r.reason ? ` (${r.reason})` : ''}`);
  console.log(`  body length: ${r.body?.length ?? 0}`);
  if (r.body) {
    console.log(`  preview: ${r.body.slice(0, 250)}…`);
  }
  console.log();
}

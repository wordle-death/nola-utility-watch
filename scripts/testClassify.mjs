#!/usr/bin/env node
// Usage: ANTHROPIC_API_KEY=... node scripts/testClassify.mjs [sourceId]
// Runs the keyword prefilter + classifier against one source's current feed.
// Default source: verite (it has full bodies in RSS — best for a proof-of-concept).

import { fetchSource } from '../api/_lib/news/sources.js';
import { classifyArticle, passesKeywordPrefilter } from '../api/_lib/news/classify.js';

const sourceId = process.argv[2] || 'verite';
const items = await fetchSource(sourceId);

console.log(`\n[${sourceId}] ${items.length} items fetched\n`);

const prefiltered = items.filter(passesKeywordPrefilter);
console.log(`${prefiltered.length} passed keyword prefilter\n`);

if (prefiltered.length === 0) {
  console.log('No relevant articles in current feed. Try another source.');
  process.exit(0);
}

for (const item of prefiltered.slice(0, 5)) {
  console.log(`→ ${item.title}`);
  console.log(`  ${item.url}`);
  const result = await classifyArticle(item);
  console.log(`  relevant: ${result.is_relevant}`);
  console.log(`  tags: ${result.utility_tag.join(', ') || '(none)'}`);
  if (result.is_relevant) {
    console.log(`  summary: ${result.summary}`);
    console.log(`  consumer: ${result.consumer_implication}`);
  }
  console.log();
}

#!/usr/bin/env node
// Usage: node scripts/testFetchSource.mjs verite
// Prints a compact summary of what each source's RSS returns.

import { fetchSource, SOURCES } from '../api/_lib/news/sources.js';

const sourceId = process.argv[2];
if (!sourceId || !SOURCES[sourceId]) {
  console.error(`Usage: node scripts/testFetchSource.mjs <${Object.keys(SOURCES).join('|')}>`);
  process.exit(1);
}

const items = await fetchSource(sourceId);

console.log(`\n[${sourceId}] ${items.length} items\n`);
for (const it of items.slice(0, 5)) {
  console.log(`- ${it.pubDate.toISOString().slice(0, 10)}  ${it.title}`);
  console.log(`  ${it.url}`);
  console.log(`  excerpt: ${it.rawExcerpt.slice(0, 120)}${it.rawExcerpt.length > 120 ? '…' : ''}`);
  console.log(`  body len: ${it.rawBody.length}`);
  console.log();
}

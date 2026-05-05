#!/usr/bin/env node
// Usage: (with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set)
//   node scripts/testDedupe.mjs
//
// Seeds two near-duplicate fake articles (Lens + TP), runs reconcileGroup, and
// prints the result. Cleans up its own seeded rows at the end.

import { getSupabase } from '../api/_lib/supabase.js';
import { reconcileGroup, pickOriginator, pickDisplayArticle, detectCitedSource } from '../api/_lib/news/dedupe.js';

// --- Pure-function sanity checks (no DB) ---
console.log('=== pure-function checks ===');

const citeCheck = detectCitedSource({
  source: 'wwno',
  rawBody: 'As Verite News first reported on Tuesday, the PSC ruled 4-1...',
});
console.log(`detectCitedSource({source:wwno, body cites Verite}) → ${citeCheck}`);
console.assert(citeCheck === 'verite', 'expected verite');

const simpleGroup = [
  { id: 'a', source: 'lens', pub_date: '2026-04-14T10:00:00Z' },
  { id: 'b', source: 'tp', pub_date: '2026-04-14T14:00:00Z' },
];
const origSimple = pickOriginator(simpleGroup);
console.log(`pickOriginator([lens@10h, tp@14h]) → ${origSimple}  (expect tp, within-6h priority)`);
console.assert(origSimple === 'tp');

const wideGap = [
  { id: 'a', source: 'lens', pub_date: '2026-04-14T10:00:00Z' },
  { id: 'b', source: 'tp', pub_date: '2026-04-14T20:00:00Z' },
];
const origWide = pickOriginator(wideGap);
console.log(`pickOriginator([lens@10h, tp@20h]) → ${origWide}  (expect lens, earliest by >6h)`);
console.assert(origWide === 'lens');

const cited = [
  { id: 'a', source: 'wwno', pub_date: '2026-04-14T10:00:00Z',
    rawBody: 'As Verite News reported...' },
  { id: 'b', source: 'verite', pub_date: '2026-04-14T11:00:00Z', rawBody: '' },
];
const origCited = pickOriginator(cited);
console.log(`pickOriginator(wwno-cites-verite + verite) → ${origCited}  (expect verite)`);
console.assert(origCited === 'verite');

// --- DB integration: seed two rows, reconcile, verify ---
console.log('\n=== DB integration ===');

const supabase = getSupabase();
const SEED_TAG = `__dedupe_test_${Date.now()}`;

const lensRow = {
  url: `https://example.test/lens/${SEED_TAG}-a`,
  source: 'lens',
  title: 'Entergy Meta deal faces scrutiny from ratepayer advocates',
  pub_date: '2026-04-14T10:00:00Z',
  raw_excerpt: SEED_TAG,
  is_relevant: true,
  utility_tag: ['entergy', 'psc'],
  summary: 'seed',
  consumer_implication: 'seed',
};

const tpRow = {
  url: `https://example.test/tp/${SEED_TAG}-b`,
  source: 'tp',
  title: 'Entergy-Meta deal faces ratepayer scrutiny at PSC',
  pub_date: '2026-04-14T14:00:00Z',
  raw_excerpt: SEED_TAG,
  is_relevant: true,
  utility_tag: ['entergy', 'psc'],
  summary: 'seed',
  consumer_implication: 'seed',
};

async function cleanup() {
  await supabase.from('news_articles').delete().eq('raw_excerpt', SEED_TAG);
}

try {
  // Insert both
  const { data: inserted, error } = await supabase
    .from('news_articles')
    .insert([lensRow, tpRow])
    .select();
  if (error) throw error;

  console.log(`seeded ${inserted.length} rows`);
  const tpInserted = inserted.find(r => r.source === 'tp');

  // Reconcile on the TP row (last ingested, typical flow)
  const result = await reconcileGroup(tpInserted);
  console.log('reconcileGroup →', result);
  console.assert(result.groupSize === 2, 'expected groupSize=2');
  console.assert(result.originator === 'tp', 'expected originator=tp');
  console.assert(result.displayId === tpInserted.id, 'expected display=tp row');

  // Verify DB state
  const { data: final } = await supabase
    .from('news_articles')
    .select('id, source, approved_for_display, dedupe_group_id, originator_source')
    .eq('raw_excerpt', SEED_TAG)
    .order('pub_date');
  console.log('final state:');
  for (const r of final) {
    console.log(`  ${r.source}: approved=${r.approved_for_display}  originator=${r.originator_source}  group=${r.dedupe_group_id?.slice(0, 8)}`);
  }

  const approved = final.filter(r => r.approved_for_display);
  console.assert(approved.length === 1 && approved[0].source === 'tp', 'expected 1 approved (tp)');
  console.assert(new Set(final.map(r => r.dedupe_group_id)).size === 1, 'expected shared group_id');

  console.log('\n✔ all checks passed');
} finally {
  await cleanup();
  console.log('cleanup complete');
}

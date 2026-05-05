#!/usr/bin/env node
// Peek at current news_articles state. Groups by dedupe_group_id, shows which
// article is approved_for_display within each group.

import { getSupabase } from '../api/_lib/supabase.js';

const supabase = getSupabase();
const { data, error } = await supabase
  .from('news_articles')
  .select('source, title, pub_date, dedupe_group_id, originator_source, approved_for_display, utility_tag')
  .order('dedupe_group_id')
  .order('pub_date', { ascending: true });
if (error) throw error;

const byGroup = {};
for (const r of data) {
  const k = r.dedupe_group_id || 'unGROUPED';
  (byGroup[k] ||= []).push(r);
}

console.log(`\n${data.length} total articles in ${Object.keys(byGroup).length} group(s)\n`);

for (const [gid, rows] of Object.entries(byGroup)) {
  console.log(`--- group ${gid.slice(0, 8)} — originator: ${rows[0].originator_source} ---`);
  for (const r of rows) {
    const mark = r.approved_for_display ? '●' : '○';
    console.log(`  ${mark} [${r.source}] ${r.pub_date.slice(0, 10)}  ${r.title}`);
    console.log(`       tags: ${r.utility_tag.join(', ')}`);
  }
  console.log();
}

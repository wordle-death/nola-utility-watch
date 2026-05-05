import { randomUUID } from 'node:crypto';
import { getSupabase } from '../supabase.js';

const SOURCE_PRIORITY = { tp: 4, verite: 3, lens: 2, wwno: 1 };

const CITATION_PATTERNS = {
  verite: /\bverite\s*news\b/i,
  lens: /\bthe\s+lens\b/i,
  wwno: /\bwwno\b/i,
  tp: /\b(?:times[-\s]picayune|the\s+advocate|nola\.com)\b/i,
};

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pubTime(a) {
  return new Date(a.pubDate ?? a.pub_date).getTime();
}

export function detectCitedSource(article) {
  const body = stripHtml(article.rawBody ?? article.raw_body ?? '').toLowerCase();
  if (!body) return null;
  for (const [src, re] of Object.entries(CITATION_PATTERNS)) {
    if (src === article.source) continue;
    if (re.test(body)) return src;
  }
  return null;
}

// Returns the originator source for a group of (likely-)duplicate articles.
// Applies the "who broke it" ranking. Rule 3 (Claude depth scoring) is deferred.
export function pickOriginator(articles) {
  if (articles.length === 0) return null;
  if (articles.length === 1) return articles[0].source;

  // Rule 1: one article explicitly credits another outlet in our set.
  for (const a of articles) {
    const cited = detectCitedSource(a);
    if (cited && articles.some(x => x.source === cited)) return cited;
  }

  const sorted = [...articles].sort((a, b) => pubTime(a) - pubTime(b));
  const earliest = pubTime(sorted[0]);
  const within6h = sorted.filter(a => pubTime(a) - earliest <= 6 * 60 * 60 * 1000);

  // Rule 2: earliest pubDate wins if the next candidate is >6h later.
  if (within6h.length === 1) return within6h[0].source;

  // Rule 3 (original-reporting depth) deferred — fall through to source priority.
  within6h.sort((a, b) => (SOURCE_PRIORITY[b.source] || 0) - (SOURCE_PRIORITY[a.source] || 0));
  return within6h[0].source;
}

// Among the group, pick the one article to surface on the homepage.
// Prefer the most recent article from the originator; fall back to earliest overall.
export function pickDisplayArticle(articles, originator) {
  const fromOriginator = articles.filter(a => a.source === originator);
  if (fromOriginator.length > 0) {
    return [...fromOriginator].sort((a, b) => pubTime(b) - pubTime(a))[0];
  }
  return [...articles].sort((a, b) => pubTime(a) - pubTime(b))[0];
}

export async function findSimilarInWindow(
  title,
  pubDate,
  { windowHours = 72, threshold = 0.6 } = {}
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('find_similar_news_articles', {
    q_title: title,
    q_pub_date: new Date(pubDate).toISOString(),
    window_hours: windowHours,
    threshold,
  });
  if (error) throw error;
  return data || [];
}

// Post-insert reconciliation: given the just-inserted candidate row, find its
// dedupe group, inherit or mint a group_id, recompute originator + display,
// and write the result back. Returns a summary object.
export async function reconcileGroup(candidateRow) {
  const supabase = getSupabase();

  const similar = await findSimilarInWindow(candidateRow.title, candidateRow.pub_date);
  const otherIds = similar.map(s => s.id).filter(id => id !== candidateRow.id);

  let otherRows = [];
  if (otherIds.length > 0) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('id, source, title, pub_date, raw_body, dedupe_group_id, originator_source')
      .in('id', otherIds);
    if (error) throw error;
    otherRows = data || [];
  }

  const group = [candidateRow, ...otherRows];

  // Inherit an existing group_id if any member already has one; else mint a new UUID.
  const groupId =
    otherRows.find(r => r.dedupe_group_id)?.dedupe_group_id ??
    candidateRow.dedupe_group_id ??
    randomUUID();

  const originator = pickOriginator(group);
  const display = pickDisplayArticle(group, originator);

  const allIds = group.map(g => g.id);

  const { error: err1 } = await supabase
    .from('news_articles')
    .update({
      dedupe_group_id: groupId,
      originator_source: originator,
      approved_for_display: false,
    })
    .in('id', allIds);
  if (err1) throw err1;

  const { error: err2 } = await supabase
    .from('news_articles')
    .update({ approved_for_display: true })
    .eq('id', display.id);
  if (err2) throw err2;

  return { groupId, originator, displayId: display.id, groupSize: group.length };
}

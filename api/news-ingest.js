import { SOURCES, fetchSource } from './_lib/news/sources.js';
import { passesKeywordPrefilter, classifyArticle } from './_lib/news/classify.js';
import { reconcileGroup } from './_lib/news/dedupe.js';
import { fetchArticleBody } from './_lib/news/htmlFetch.js';
import { getSupabase } from './_lib/supabase.js';

async function ingestSource(sourceId, supabase, stats) {
  const s = stats[sourceId];
  let items;
  try {
    items = await fetchSource(sourceId);
  } catch (err) {
    console.error(`[${sourceId}] fetch failed: ${err.message}`);
    s.errors += 1;
    return;
  }
  s.fetched = items.length;

  for (const item of items) {
    try {
      const { data: existing } = await supabase
        .from('news_articles')
        .select('id')
        .eq('url', item.url)
        .maybeSingle();
      if (existing) {
        s.skippedExisting += 1;
        continue;
      }

      if (!passesKeywordPrefilter(item)) {
        s.skippedPrefilter += 1;
        continue;
      }

      let fetchStatus = item.rawBody ? 'ok' : item.needsHtmlFetch ? 'headline_only' : 'ok';
      if (item.needsHtmlFetch && (!item.rawBody || item.rawBody.length < 1000)) {
        const fetched = await fetchArticleBody(item.url, item.source);
        fetchStatus = fetched.fetchStatus;
        if (fetched.body) item.rawBody = fetched.body;
      }

      const classification = await classifyArticle(item);
      if (!classification.is_relevant) {
        s.classifiedIrrelevant += 1;
        continue;
      }

      const { data: inserted, error } = await supabase
        .from('news_articles')
        .insert({
          url: item.url,
          source: item.source,
          title: item.title,
          author: item.author,
          pub_date: new Date(item.pubDate).toISOString(),
          raw_excerpt: item.rawExcerpt || null,
          raw_body: item.rawBody || null,
          fetch_status: fetchStatus,
          is_relevant: true,
          utility_tag: classification.utility_tag,
          summary: classification.summary,
          consumer_implication: classification.consumer_implication,
          approved_for_display: false,
        })
        .select()
        .single();
      if (error) throw error;

      await reconcileGroup(inserted);
      s.inserted += 1;
    } catch (err) {
      console.error(`[${sourceId}] ${item.url}: ${err.message}`);
      s.errors += 1;
    }
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const startedAt = Date.now();
  const supabase = getSupabase();

  const stats = Object.fromEntries(
    Object.keys(SOURCES).map(id => [
      id,
      { fetched: 0, skippedExisting: 0, skippedPrefilter: 0, classifiedIrrelevant: 0, inserted: 0, errors: 0 },
    ])
  );

  for (const sourceId of Object.keys(SOURCES)) {
    await ingestSource(sourceId, supabase, stats);
  }

  const totals = Object.values(stats).reduce(
    (acc, s) => {
      for (const k of Object.keys(s)) acc[k] = (acc[k] || 0) + s[k];
      return acc;
    },
    {}
  );

  const elapsedMs = Date.now() - startedAt;
  console.log(`news-ingest finished in ${elapsedMs}ms: ${JSON.stringify(totals)}`);

  return res.status(200).json({ elapsedMs, totals, sources: stats });
}

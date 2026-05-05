import * as cheerio from 'cheerio';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PER_SOURCE = {
  // BLOX/TownNews: full article text lives inside #article-body. Subscriber-only
  // wrappers, related-content blocks, and sharing widgets are siblings — strip them.
  tp: {
    selector: '#article-body',
    strip: ['.related-content', '.share-container', 'script', 'style', 'aside', '.ad', '[id^="tncms-region"]'],
  },
  lens: {
    selector: 'div.entry-content, article .entry-content',
    strip: ['.sharedaddy', 'script', 'style', 'aside', 'figure', '.wp-block-image'],
  },
};

function extractText($, source) {
  const cfg = PER_SOURCE[source];
  if (!cfg) return '';
  const root = $(cfg.selector);
  if (!root.length) return '';
  for (const sel of cfg.strip) root.find(sel).remove();
  return root
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchArticleBody(url, source, { signal } = {}) {
  const headers = { 'User-Agent': BROWSER_UA };
  if (source === 'tp' && process.env.TP_SESSION_COOKIE) {
    headers.Cookie = process.env.TP_SESSION_COOKIE;
  }

  let res;
  try {
    res = await fetch(url, { headers, signal });
  } catch (err) {
    return { body: null, fetchStatus: 'failed', reason: err.message };
  }
  if (!res.ok) {
    return { body: null, fetchStatus: 'failed', reason: `HTTP ${res.status}` };
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const body = extractText($, source);
  if (!body || body.length < 200) {
    // Either wrong selector for this article, or paywall returned only a lede.
    return { body: body || null, fetchStatus: 'headline_only', reason: 'body_too_short' };
  }
  return { body, fetchStatus: 'ok' };
}

import Parser from 'rss-parser';
import { parseStringPromise } from 'xml2js';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const rssParser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
    ],
  },
  headers: { 'User-Agent': BROWSER_UA },
});

// Lenient RSS 2.0 fallback for feeds that occasionally ship malformed XML
// (e.g. a single article with bad attribute spacing breaks strict parsing for
// every other item in the feed). Pulls the fields we actually use.
function parseRssLenient(xml) {
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const inner = m[1];
    items.push({
      title: extractTag(inner, 'title'),
      link: extractTag(inner, 'link'),
      pubDate: extractTag(inner, 'pubDate'),
      isoDate: extractTag(inner, 'pubDate'),
      contentSnippet: stripTags(extractTag(inner, 'description')),
      content: extractTag(inner, 'description'),
      contentEncoded: extractTag(inner, 'content:encoded'),
      dcCreator: extractTag(inner, 'dc:creator'),
    });
  }
  return { items };
}

function extractTag(xml, tag) {
  const escaped = tag.replace(/:/g, ':');
  const re = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  let v = m[1].trim();
  const cdata = v.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) v = cdata[1].trim();
  return v;
}

function stripTags(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchRssFeeds(source) {
  const items = [];
  for (const feedUrl of source.feeds) {
    let feed;
    try {
      feed = await rssParser.parseURL(feedUrl);
    } catch (err) {
      // Strict parser tripped on something — fetch raw and parse leniently.
      const res = await fetch(feedUrl, { headers: { 'User-Agent': BROWSER_UA } });
      if (!res.ok) throw err;
      feed = parseRssLenient(await res.text());
    }
    for (const item of feed.items || []) {
      if (!item.link) continue;
      items.push(normalizeRssItem(source, item));
    }
  }
  return items;
}

function normalizeRssItem(source, item) {
  return {
    source: source.id,
    url: item.link,
    title: (item.title || '').trim(),
    author: item.dcCreator || item.creator || item.author || null,
    pubDate: item.isoDate ? new Date(item.isoDate) : new Date(item.pubDate),
    rawExcerpt: (item.contentSnippet || '').trim(),
    rawBody: source.bodyFromItem(item),
    needsHtmlFetch: source.needsHtmlFetch,
  };
}

async function fetchGoogleNewsSitemap(source) {
  const items = [];
  for (const feedUrl of source.feeds) {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': BROWSER_UA } });
    if (!res.ok) throw new Error(`${feedUrl} → ${res.status}`);
    const xml = await res.text();
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const urls = parsed?.urlset?.url;
    if (!urls) continue;
    const list = Array.isArray(urls) ? urls : [urls];
    for (const entry of list) {
      const news = entry['news:news'];
      if (!news) continue;
      const title = news['news:title'];
      const pubDate = news['news:publication_date'];
      const loc = entry.loc;
      if (!loc || !title) continue;
      items.push({
        source: source.id,
        url: loc,
        title: String(title).trim(),
        author: null,
        pubDate: new Date(pubDate),
        rawExcerpt: '',
        rawBody: '',
        needsHtmlFetch: source.needsHtmlFetch,
      });
    }
  }
  return items;
}

export const SOURCES = {
  verite: {
    id: 'verite',
    type: 'rss',
    feeds: ['https://veritenews.org/feed/'],
    needsHtmlFetch: false,
    bodyFromItem: item => item.contentEncoded || item.content || '',
  },
  lens: {
    id: 'lens',
    type: 'rss',
    feeds: ['https://thelensnola.org/feed/'],
    needsHtmlFetch: true,
    bodyFromItem: item => item.contentEncoded || item.content || '',
  },
  wwno: {
    id: 'wwno',
    type: 'rss',
    // Coastal Desk's per-show RSS started returning HTML in May 2026; only Louisiana Considered
    // is reliable. Lenient fallback in fetchRssFeeds handles its occasionally-malformed XML.
    feeds: ['https://www.wwno.org/show/louisiana-considered/rss.xml'],
    needsHtmlFetch: true,
    bodyFromItem: item => item.contentEncoded || item.content || item.contentSnippet || '',
  },
  tp: {
    id: 'tp',
    type: 'google-news-sitemap',
    feeds: ['https://www.nola.com/tncms/sitemap/news.xml'],
    needsHtmlFetch: true,
    bodyFromItem: () => '',
  },
};

const FETCHERS = {
  rss: fetchRssFeeds,
  'google-news-sitemap': fetchGoogleNewsSitemap,
};

export async function fetchSource(sourceId) {
  const source = SOURCES[sourceId];
  if (!source) throw new Error(`Unknown source: ${sourceId}`);
  const fetcher = FETCHERS[source.type];
  if (!fetcher) throw new Error(`No fetcher for type: ${source.type}`);
  return await fetcher(source);
}

export async function fetchAllSources() {
  const out = {};
  for (const id of Object.keys(SOURCES)) {
    try {
      out[id] = await fetchSource(id);
    } catch (err) {
      out[id] = { error: err.message };
    }
  }
  return out;
}

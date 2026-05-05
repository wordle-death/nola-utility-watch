import { getSupabase } from './_lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://nola-utility-watch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

const DISPLAY_LIMIT = 5;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('news_articles')
      .select('url, source, title, pub_date, summary, consumer_implication, utility_tag, originator_source')
      .eq('approved_for_display', true)
      .eq('is_relevant', true)
      .order('pub_date', { ascending: false })
      .limit(DISPLAY_LIMIT);

    if (error) {
      console.error('news query error:', error);
      return res.status(500).json({ error: 'Failed to fetch news' });
    }

    return res.status(200).json({ articles: data || [] });
  } catch (err) {
    console.error('news endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

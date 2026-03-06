import { getSupabase } from './_lib/supabase.js';

const ALLOWED_ORIGINS = [
  'https://nola-utility-watch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

/**
 * GET /api/community-stats
 *
 * Returns aggregate community submission statistics.
 * Never returns individual records — only counts, averages, and distributions.
 * Cached for 5 minutes via CDN.
 */
export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // CDN cache for 5 minutes
  res.setHeader('Cache-Control', 'public, s-maxage=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();

    // Total submission count
    const { count: totalSubmissions } = await supabase
      .from('community_bills')
      .select('*', { count: 'exact', head: true });

    if (!totalSubmissions || totalSubmissions === 0) {
      return res.status(200).json({
        total_submissions: 0,
        unique_months: 0,
        unique_zips: 0,
        by_month: [],
        by_zip: [],
      });
    }

    // All records for aggregation (only the fields we need)
    const { data: bills, error } = await supabase
      .from('community_bills')
      .select('bill_month, provider, pga_rate, ccf, total_gas, zip_code');

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch community data' });
    }

    // Aggregate by month + provider
    const monthMap = {};
    for (const bill of bills) {
      const key = `${bill.provider}-${bill.bill_month}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          bill_month: bill.bill_month,
          provider: bill.provider,
          count: 0,
          pga_sum: 0,
          pga_min: Infinity,
          pga_max: -Infinity,
          ccf_sum: 0,
          total_sum: 0,
        };
      }
      const m = monthMap[key];
      m.count++;
      m.pga_sum += bill.pga_rate;
      m.pga_min = Math.min(m.pga_min, bill.pga_rate);
      m.pga_max = Math.max(m.pga_max, bill.pga_rate);
      m.ccf_sum += bill.ccf;
      m.total_sum += Number(bill.total_gas);
    }

    const byMonth = Object.values(monthMap)
      .map(m => ({
        bill_month: m.bill_month,
        provider: m.provider,
        count: m.count,
        avg_pga: Math.round((m.pga_sum / m.count) * 100000) / 100000,
        min_pga: Math.round(m.pga_min * 100000) / 100000,
        max_pga: Math.round(m.pga_max * 100000) / 100000,
        avg_ccf: Math.round(m.ccf_sum / m.count),
        avg_total: Math.round((m.total_sum / m.count) * 100) / 100,
      }))
      .sort((a, b) => a.bill_month.localeCompare(b.bill_month));

    // Aggregate by ZIP
    const zipMap = {};
    for (const bill of bills) {
      zipMap[bill.zip_code] = (zipMap[bill.zip_code] || 0) + 1;
    }
    const byZip = Object.entries(zipMap)
      .map(([zip_code, count]) => ({ zip_code, count }))
      .sort((a, b) => b.count - a.count);

    // Unique months and ZIPs
    const uniqueMonths = new Set(bills.map(b => b.bill_month)).size;
    const uniqueZips = new Set(bills.map(b => b.zip_code)).size;

    return res.status(200).json({
      total_submissions: totalSubmissions,
      unique_months: uniqueMonths,
      unique_zips: uniqueZips,
      by_month: byMonth,
      by_zip: byZip,
    });
  } catch (err) {
    console.error('community-stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

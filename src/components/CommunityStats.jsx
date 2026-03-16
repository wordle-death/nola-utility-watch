import { useState, useEffect } from 'react';
import { getMonthShortLabel } from '../lib/billCalculator';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

/**
 * Displays aggregate community submission statistics.
 * Fetches from /api/community-stats (cached 5 min).
 */
export default function CommunityStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/community-stats');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        // Silently fail — community stats are optional
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  function retry() {
    setError(null);
    setLoading(true);
    fetch('/api/community-stats')
      .then(res => { if (!res.ok) throw new Error('Failed to load'); return res.json(); })
      .then(data => setStats(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Community Data</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-gray-50 rounded-lg px-4 py-3 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto" />
            </div>
          ))}
        </div>
        <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    );
  }

  // API error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Community Data</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-6 text-center">
          <p className="text-sm text-gray-600">Community data is temporarily unavailable.</p>
          <button onClick={retry} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state — no submissions yet
  if (!stats || stats.total_submissions === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Community Data</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            No community bills have been submitted yet. Be the first to contribute!
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Every bill adds an independent data point to the analysis.
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data for PGA by month (Delta only, since that's the focus)
  const pgaChartData = stats.by_month
    .filter(m => m.provider === 'delta')
    .map(m => ({
      month: getMonthShortLabel(m.bill_month),
      avgPGA: m.avg_pga,
      count: m.count,
      minPGA: m.min_pga,
      maxPGA: m.max_pga,
    }));

  // ZIP code chart data
  const zipChartData = stats.by_zip.slice(0, 10); // Top 10 ZIPs

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Community Data</h2>
        <p className="text-sm text-gray-500 mt-1">
          Anonymized, validated bill data contributed by New Orleans residents.
        </p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.total_submissions}</p>
          <p className="text-xs text-blue-600 font-medium">Bills Contributed</p>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.unique_months}</p>
          <p className="text-xs text-green-600 font-medium">Months Covered</p>
        </div>
        <div className="bg-purple-50 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{stats.unique_zips}</p>
          <p className="text-xs text-purple-600 font-medium">ZIP Codes</p>
        </div>
      </div>

      {/* PGA by month chart */}
      {pgaChartData.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Community-Reported Delta PGA Rates by Month
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pgaChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={v => `$${v.toFixed(2)}`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
                        <p className="font-semibold">{d.month}</p>
                        <p>Avg PGA: ${d.avgPGA?.toFixed(5)}/CCF</p>
                        <p>Range: ${d.minPGA?.toFixed(5)} – ${d.maxPGA?.toFixed(5)}</p>
                        <p className="text-gray-500">{d.count} bill{d.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="avgPGA" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ZIP code coverage */}
      {zipChartData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Contributions by ZIP Code
          </h4>
          <div className="space-y-1.5">
            {zipChartData.map(z => {
              const maxCount = zipChartData[0].count;
              const pct = (z.count / maxCount) * 100;
              return (
                <div key={z.zip_code} className="flex items-center gap-2 text-sm">
                  <span className="w-14 text-gray-600 font-mono text-xs">{z.zip_code}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-gray-500 text-right">{z.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        All community data is validated against the known rate formula before inclusion.
        Only anonymized usage and rate data is stored — no personal information.
      </p>
    </div>
  );
}

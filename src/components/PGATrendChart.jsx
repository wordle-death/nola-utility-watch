import { getPGATrend, getMonthShortLabel } from '../lib/billCalculator';
import InfoTip from './Tooltip';
import henryHub from '../data/henryHub.json';
import rates from '../data/rates.json';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

export default function PGATrendChart() {
  const trend = getPGATrend();

  // Build lookup of HH bill-period averages, converted to $/CCF
  const hhByCCF = {};
  for (const p of henryHub.billPeriodAverages) {
    if (p.avgHenryHub !== null) {
      hhByCCF[p.billMonth] = Math.round(p.avgHenryHub * rates.ccfToMMBtu * 100000) / 100000;
    }
  }

  const data = trend.map(d => ({
    month: getMonthShortLabel(d.billMonth),
    billMonth: d.billMonth,
    pgaRate: d.pgaRate,
    provider: d.provider,
    isEntergy: d.provider === 'entergy',
    isDelta: d.provider === 'delta',
    entergyPGA: d.provider === 'entergy' ? d.pgaRate : null,
    deltaPGA: d.provider === 'delta' ? d.pgaRate : null,
    henryHubCCF: hhByCCF[d.billMonth] || null,
    hhMMBtu: henryHub.billPeriodAverages.find(p => p.billMonth === d.billMonth)?.avgHenryHub || null,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    const spread = item?.pgaRate && item?.henryHubCCF
      ? (item.pgaRate - item.henryHubCCF).toFixed(3)
      : null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className={item?.isEntergy ? 'text-blue-600' : 'text-red-600'}>
          PGA: ${item?.pgaRate?.toFixed(5)}/CCF
        </p>
        {item?.henryHubCCF && (
          <p className="text-green-600">
            Henry Hub: ${item.henryHubCCF.toFixed(5)}/CCF (${item.hhMMBtu}/MMBtu)
          </p>
        )}
        {spread && (
          <p className="text-amber-600 font-medium">
            Markup over HH: ${spread}/CCF
          </p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          {item?.isEntergy ? 'Entergy (with hedging)' : 'Delta (no hedging)'}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <InfoTip term="PGA">Purchase Gas Adjustment — the per-CCF commodity pass-through charge. This is the only rate component that differs between Entergy and Delta.</InfoTip> Rate vs. <InfoTip term="Henry Hub">The U.S. benchmark pricing point for natural gas, located in Erath, Louisiana. Wholesale gas prices are based on Henry Hub spot prices.</InfoTip> Wholesale Price
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          The PGA is what the utility charges you for gas commodity. The green line shows what the gas
          actually costs on the wholesale market (Henry Hub). The gap between the bar and the line is the
          utility{"'"}s procurement markup.
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={v => `$${v.toFixed(2)}`}
              domain={[0, 'auto']}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
            />

            <Bar
              dataKey="entergyPGA"
              name="Entergy PGA"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="deltaPGA"
              name="Delta PGA"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
            <Line
              dataKey="henryHubCCF"
              name="Henry Hub (wholesale)"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ fill: '#16a34a', r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Source: PGA rates from actual bills (same address/meter). Henry Hub daily spot prices from{' '}
        <a href="https://fred.stlouisfed.org/series/DHHNGSP" className="text-blue-500 hover:underline" target="_blank" rel="noopener">
          FRED (series DHHNGSP)
        </a>
        , averaged over each bill's meter-read period. Last updated: {henryHub.lastUpdated}.
      </p>
    </div>
  );
}

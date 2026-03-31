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
} from 'recharts';
import { computeOutageImpact, formatDollars, formatNumber } from '../lib/electricityImpact';

function getQuarter(isoTime) {
  const d = new Date(isoTime);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

function formatQuarter(qKey) {
  const [y, q] = qKey.split('-');
  return `${q} '${y.slice(2)}`;
}

export default function OutageTimeline({ events, assumptions }) {
  const byQuarter = {};
  for (const event of events) {
    const q = getQuarter(event.startTime);
    if (!byQuarter[q]) {
      byQuarter[q] = { customerHours: 0, events: 0, impact: 0, peakCustomers: 0 };
    }
    const impact = computeOutageImpact(event, assumptions);
    byQuarter[q].customerHours += event.totalCustomerHours || 0;
    byQuarter[q].events += 1;
    byQuarter[q].impact += impact.totalImpact;
    byQuarter[q].peakCustomers = Math.max(
      byQuarter[q].peakCustomers, event.peakCustomersAffected || 0
    );
  }

  const data = Object.entries(byQuarter)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([q, d]) => ({
      quarter: formatQuarter(q),
      rawQuarter: q,
      customerHours: Math.round(d.customerHours),
      events: d.events,
      impact: d.impact,
      peakCustomers: d.peakCustomers,
    }));

  if (data.length === 0) return null;

  const years = [...new Set(events.map(e => e.startTime.slice(0, 4)))].sort();
  const yearRange = years.length > 1
    ? `${years[0]}–${years[years.length - 1]}`
    : years[0];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-yellow-600">
          {formatNumber(d.customerHours)} customer-hours
        </p>
        <p className="text-gray-600">
          {d.events} event{d.events !== 1 ? 's' : ''}
        </p>
        <p className="text-gray-600">
          Peak: {formatNumber(d.peakCustomers)} customers
        </p>
        <p className="text-red-600 font-medium mt-1">
          Est. cost: {formatDollars(d.impact)}
        </p>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        Quarterly Outage Summary — {yearRange}
      </h4>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="hours"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              width={50}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickFormatter={v => formatDollars(v)}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            <Bar
              yAxisId="hours"
              dataKey="customerHours"
              name="Customer-Hours"
              fill="#ca8a04"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="cost"
              dataKey="impact"
              name="Economic Impact (ICE)"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ fill: '#dc2626', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

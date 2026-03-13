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
import { computeIncidentImpact, formatDollars } from '../lib/swbImpact';

function getQuarter(yyyymm) {
  const [y, m] = yyyymm.split('-');
  const q = Math.ceil(parseInt(m, 10) / 3);
  return `${y}-Q${q}`;
}

function formatQuarter(qKey) {
  const [y, q] = qKey.split('-');
  return `${q} '${y.slice(2)}`;
}

export default function IncidentTimeline({ incidents, assumptions }) {
  // Aggregate incidents by quarter for a cleaner multi-year view
  const byQuarter = {};
  for (const inc of incidents) {
    const month = inc.date.slice(0, 7);
    const q = getQuarter(month);
    if (!byQuarter[q]) {
      byQuarter[q] = { hours: 0, incidents: 0, conservativeCost: 0, fullCost: 0, population: 0 };
    }
    const conserv = computeIncidentImpact(inc, assumptions, 'conservative');
    const full = computeIncidentImpact(inc, assumptions, 'full');
    byQuarter[q].hours += conserv.durationHours;
    byQuarter[q].incidents += 1;
    byQuarter[q].conservativeCost += conserv.total;
    byQuarter[q].fullCost += full.total;
    byQuarter[q].population += inc.estimatedPopulationAffected || 0;
  }

  const data = Object.entries(byQuarter)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([q, d]) => ({
      quarter: formatQuarter(q),
      rawQuarter: q,
      hours: Math.round(d.hours),
      incidents: d.incidents,
      conservativeCost: d.conservativeCost,
      fullCost: d.fullCost,
      population: d.population,
    }));

  if (data.length === 0) return null;

  // Compute year boundaries for annotation
  const years = [...new Set(incidents.map(i => i.date.slice(0, 4)))].sort();
  const yearRange = years.length > 1
    ? `${years[0]}–${years[years.length - 1]}`
    : years[0];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-cyan-600">
          {d.hours} hours of disruption
        </p>
        <p className="text-gray-600">
          {d.incidents} incident{d.incidents !== 1 ? 's' : ''}
        </p>
        <p className="text-gray-600">
          {d.population.toLocaleString()} people affected
        </p>
        <p className="text-red-600 font-medium mt-1">
          Est. cost: {formatDollars(d.conservativeCost)} – {formatDollars(d.fullCost)}
        </p>
      </div>
    );
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        Quarterly Disruption Summary — {yearRange}
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
              width={40}
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
              dataKey="hours"
              name="Disruption Hours"
              fill="#0891b2"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="cost"
              dataKey="conservativeCost"
              name="Est. Cost (Conservative)"
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

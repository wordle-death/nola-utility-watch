import { computeIncidentImpact, formatDollars, formatNumber } from '../lib/swbImpact';

export default function YearOverYearSummary({ incidents, assumptions }) {
  // Group by year
  const byYear = {};
  for (const inc of incidents) {
    const year = inc.date.slice(0, 4);
    if (!byYear[year]) {
      byYear[year] = { events: 0, hours: 0, population: 0, conservativeCost: 0, mainBreaks: 0 };
    }
    byYear[year].events += 1;
    byYear[year].population += inc.estimatedPopulationAffected || 0;
    if (inc.type === 'main_break') byYear[year].mainBreaks += 1;

    const conserv = computeIncidentImpact(inc, assumptions, 'conservative');
    byYear[year].hours += conserv.durationHours;
    byYear[year].conservativeCost += conserv.total;
  }

  const years = Object.keys(byYear).sort();
  const currentYear = new Date().getFullYear().toString();

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        Year-Over-Year Trend
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Year</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Advisories</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Main Breaks</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">People Affected</th>
              <th className="text-right py-2 pl-3 text-gray-500 font-medium">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year, i) => {
              const d = byYear[year];
              const prev = i > 0 ? byYear[years[i - 1]] : null;
              const eventDelta = prev ? d.events - prev.events : null;
              const isCurrent = year === currentYear;

              return (
                <tr key={year} className={`border-b border-gray-100 ${isCurrent ? 'bg-cyan-50/50' : ''}`}>
                  <td className="py-2 pr-3 font-semibold text-gray-900">
                    {year}
                    {isCurrent && <span className="text-[10px] text-cyan-600 ml-1">YTD</span>}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700 font-medium">
                    {d.events}
                    {eventDelta !== null && eventDelta !== 0 && (
                      <span className={`ml-1 text-[10px] ${eventDelta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {eventDelta > 0 ? `+${eventDelta}` : eventDelta}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700">
                    {d.mainBreaks > 0 ? d.mainBreaks : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-700">
                    {formatNumber(d.population)}
                  </td>
                  <td className="py-2 pl-3 text-right text-red-600 font-medium">
                    {formatDollars(d.conservativeCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td className="py-2 pr-3 font-bold text-gray-900">Total</td>
              <td className="py-2 px-3 text-right font-bold text-gray-900">
                {incidents.length}
              </td>
              <td className="py-2 px-3 text-right font-bold text-gray-900">
                {incidents.filter(i => i.type === 'main_break').length}
              </td>
              <td className="py-2 px-3 text-right font-bold text-gray-900">
                {formatNumber(Object.values(byYear).reduce((s, d) => s + d.population, 0))}
              </td>
              <td className="py-2 pl-3 text-right font-bold text-red-700">
                {formatDollars(Object.values(byYear).reduce((s, d) => s + d.conservativeCost, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { calculateBill, getAvailableMonths } from '../lib/billCalculator';
import pgaHistory from '../data/pgaHistory.json';
import henryHub from '../data/henryHub.json';
import rates from '../data/rates.json';

const CUMULATIVE_MONTHS = [
  { billMonth: '2025-08', label: 'Aug 2025' },
  { billMonth: '2025-09', label: 'Sep 2025' },
  { billMonth: '2025-10', label: 'Oct 2025' },
  { billMonth: '2025-11', label: 'Nov 2025' },
  { billMonth: '2025-12', label: 'Dec 2025' },
  { billMonth: '2026-01', label: 'Jan 2026' },
  { billMonth: '2026-02', label: 'Feb 2026' },
];

export default function CumulativeSavings() {
  const months = getAvailableMonths();

  // Initialize CCF state for each month (empty strings)
  const [ccfValues, setCcfValues] = useState(
    Object.fromEntries(CUMULATIVE_MONTHS.map(m => [m.billMonth, '']))
  );

  function updateCcf(billMonth, value) {
    setCcfValues(prev => ({ ...prev, [billMonth]: value }));
  }

  // Compute bills for each month where CCF is entered
  const rows = CUMULATIVE_MONTHS.map(m => {
    const ccfStr = ccfValues[m.billMonth];
    const ccfNum = parseFloat(ccfStr);
    if (!ccfStr || isNaN(ccfNum) || ccfNum <= 0) {
      return { ...m, ccf: null, deltaBill: null, entergyBill: null, diff: null };
    }

    // Get Delta PGA for this month
    const deltaMonth = months.delta.find(d => d.billMonth === m.billMonth);
    if (!deltaMonth) return { ...m, ccf: ccfNum, deltaBill: null, entergyBill: null, diff: null };

    const deltaBill = calculateBill(ccfNum, deltaMonth.pgaRate);

    // Entergy estimate: HH × conversion + $0.17 markup
    const periodAvg = henryHub.billPeriodAverages.find(p => p.billMonth === m.billMonth);
    const hhPrice = periodAvg ? periodAvg.avgHenryHub : 3.00;
    const entergyPGA = (hhPrice * rates.ccfToMMBtu) + pgaHistory.entergyEstimatedMarkup.markupPerCCF;
    const entergyBill = calculateBill(ccfNum, entergyPGA);

    return {
      ...m,
      ccf: ccfNum,
      deltaBill,
      entergyBill,
      diff: deltaBill.total - entergyBill.total,
    };
  });

  // Compute totals (only for months with data)
  const filledRows = rows.filter(r => r.deltaBill !== null);
  const totalDelta = filledRows.reduce((s, r) => s + r.deltaBill.total, 0);
  const totalEntergy = filledRows.reduce((s, r) => s + r.entergyBill.total, 0);
  const totalDiff = totalDelta - totalEntergy;
  const hasAnyData = filledRows.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Cumulative Cost Since Switchover</h3>
        <p className="text-sm text-gray-500 mt-1">
          Enter your CCF usage from each Delta bill to see how much more you{"'"}ve paid
          compared to what Entergy would have charged. Find CCF on page 1 of each bill.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 font-medium text-gray-600">Month</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-28">Your CCF</th>
              <th className="text-right px-4 py-3 font-medium text-red-600">Delta Bill</th>
              <th className="text-right px-4 py-3 font-medium text-blue-600">Entergy Est.</th>
              <th className="text-right px-6 py-3 font-medium text-amber-600">You Overpaid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.billMonth} className="border-b border-gray-100">
                <td className="px-6 py-2.5 text-gray-900 font-medium">{row.label}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="CCF"
                    value={ccfValues[row.billMonth]}
                    onChange={e => updateCcf(row.billMonth, e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-red-700">
                  {row.deltaBill ? `$${row.deltaBill.total.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-blue-700">
                  {row.entergyBill ? `$${row.entergyBill.total.toFixed(2)}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-2.5 text-right font-mono">
                  {row.diff !== null ? (
                    <span className={row.diff > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                      {row.diff > 0 ? '+' : ''}${row.diff.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td className="px-6 py-3 font-bold text-gray-900">TOTAL</td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">
                {hasAnyData ? `${filledRows.length} month${filledRows.length > 1 ? 's' : ''}` : ''}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-red-700">
                {hasAnyData ? `$${totalDelta.toFixed(2)}` : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                {hasAnyData ? `$${totalEntergy.toFixed(2)}` : '—'}
              </td>
              <td className="px-6 py-3 text-right font-mono font-bold text-red-600">
                {hasAnyData ? `+$${totalDiff.toFixed(2)}` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary callout */}
      {hasAnyData && totalDiff > 0 && (
        <div className="mx-6 my-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800">
            Over {filledRows.length} month{filledRows.length > 1 ? 's' : ''}, you paid{' '}
            <span className="text-lg font-bold">${totalDiff.toFixed(2)} more</span> with Delta
            than you would have under Entergy.
          </p>
          <p className="text-xs text-amber-600 mt-1">
            That{"'"}s {((totalDiff / totalEntergy) * 100).toFixed(1)}% more than the Entergy estimate.
            The Entergy estimate uses their historical PGA markup ($0.17/CCF over Henry Hub wholesale prices).
          </p>
        </div>
      )}

      <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
        Entergy estimates use real Henry Hub daily spot prices from FRED, averaged over each bill{"'"}s meter-read period,
        plus Entergy{"'"}s historical $0.17/CCF procurement markup.
      </div>
    </div>
  );
}

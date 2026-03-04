import { useState } from 'react';
import { calculateBill, getAvailableMonths } from '../lib/billCalculator';
import BillDecomposition from './BillDecomposition';
import pgaHistory from '../data/pgaHistory.json';
import henryHub from '../data/henryHub.json';

const MONTH_LABELS = {
  '2025-01': 'Jan 2025 (Entergy)',
  '2025-07': 'Jul 2025 (Entergy final)',
  '2025-07-delta': 'Jul 2025 (Delta first)',
  '2025-11': 'Nov 2025',
  '2025-12': 'Dec 2025',
  '2026-01': 'Jan 2026',
  '2026-02': 'Feb 2026 (Storm Fern)',
};

export default function BillCalculator() {
  const [ccf, setCcf] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-02');
  const [result, setResult] = useState(null);

  const months = getAvailableMonths();

  // Build dropdown options from delta months (the active provider)
  const monthOptions = months.delta.map(m => ({
    value: m.billMonth,
    label: MONTH_LABELS[m.billMonth] || m.billMonth,
    pgaRate: m.pgaRate,
    periodStart: m.periodStart,
    periodEnd: m.periodEnd,
  }));

  function handleCalculate(e) {
    e.preventDefault();
    const ccfNum = parseFloat(ccf);
    if (isNaN(ccfNum) || ccfNum < 0) return;

    const month = months.delta.find(m => m.billMonth === selectedMonth);
    if (!month) return;

    const deltaBill = calculateBill(ccfNum, month.pgaRate);

    // Entergy estimate: use $0.17/CCF markup over Henry Hub
    // Henry Hub prices are real FRED data, averaged over each bill's meter-read period
    const entergyMarkup = pgaHistory.entergyEstimatedMarkup.markupPerCCF;
    const periodAvg = henryHub.billPeriodAverages.find(p => p.billMonth === selectedMonth);
    const hhPrice = periodAvg ? periodAvg.avgHenryHub : 3.00;
    const ccfToMMBtu = 0.1037;
    const entergyPGA = (hhPrice * ccfToMMBtu) + entergyMarkup;
    const entergyBill = calculateBill(ccfNum, entergyPGA);

    // Wholesale floor: HH spot only
    const wholesalePGA = hhPrice * ccfToMMBtu;
    const wholesaleBill = calculateBill(ccfNum, wholesalePGA);

    setResult({
      deltaBill,
      entergyBill,
      wholesaleBill,
      entergyPGA: Math.round(entergyPGA * 100000) / 100000,
      wholesalePGA: Math.round(wholesalePGA * 100000) / 100000,
      hhPrice,
      tradingDays: periodAvg ? periodAvg.tradingDays : null,
      month,
      ccfNum,
    });
  }

  const selectedMonthData = monthOptions.find(m => m.value === selectedMonth);

  return (
    <div>
      {/* Input Form */}
      <form onSubmit={handleCalculate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calculate Your Gas Bill</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="ccf" className="block text-sm font-medium text-gray-700 mb-1">
              Gas Usage (CCF)
            </label>
            <input
              id="ccf"
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 169"
              value={ccf}
              onChange={e => setCcf(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Find this on page 1 of your Delta bill</p>
          </div>
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
              Billing Month
            </label>
            <select
              id="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {selectedMonthData && (
              <p className="text-xs text-gray-500 mt-1">
                Meter reads: {selectedMonthData.periodStart} → {selectedMonthData.periodEnd}
              </p>
            )}
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Calculate
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Three-way comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Delta Actual */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-red-600">Delta Utilities</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Actual</span>
              </div>
              <p className="text-3xl font-bold text-red-700">${result.deltaBill.total.toFixed(2)}</p>
              <p className="text-sm text-red-600 mt-1">${result.deltaBill.perCCF.toFixed(2)}/CCF all-in</p>
              <p className="text-xs text-gray-500 mt-2">PGA: ${result.month.pgaRate.toFixed(5)}/CCF</p>
            </div>

            {/* Entergy Estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Entergy (Est.)</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">If Entergy still had gas</span>
              </div>
              <p className="text-3xl font-bold text-blue-700">${result.entergyBill.total.toFixed(2)}</p>
              <p className="text-sm text-blue-600 mt-1">${result.entergyBill.perCCF.toFixed(2)}/CCF all-in</p>
              <p className="text-xs text-gray-500 mt-2">Est. PGA: ${result.entergyPGA.toFixed(5)}/CCF (HH + $0.17 markup)</p>
            </div>

            {/* Wholesale Floor */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-green-600">Wholesale Floor</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Market price only</span>
              </div>
              <p className="text-3xl font-bold text-green-700">${result.wholesaleBill.total.toFixed(2)}</p>
              <p className="text-sm text-green-600 mt-1">${result.wholesaleBill.perCCF.toFixed(2)}/CCF all-in</p>
              <p className="text-xs text-gray-500 mt-2">HH Spot: ${result.hhPrice.toFixed(2)}/MMBtu → ${result.wholesalePGA.toFixed(5)}/CCF</p>
            </div>
          </div>

          {/* Difference callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-amber-800">You paid more with Delta vs. Entergy estimate</p>
                <p className="text-2xl font-bold text-amber-700">
                  +${(result.deltaBill.total - result.entergyBill.total).toFixed(2)}
                </p>
                <p className="text-sm text-amber-600">
                  ({(((result.deltaBill.total - result.entergyBill.total) / result.entergyBill.total) * 100).toFixed(1)}% more)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Delta's PGA markup over Henry Hub</p>
                <p className="text-2xl font-bold text-amber-700">
                  ${(result.month.pgaRate - result.wholesalePGA).toFixed(3)}/CCF
                </p>
                <p className="text-sm text-amber-600">
                  vs. Entergy's historical ~$0.17/CCF markup
                </p>
              </div>
            </div>
          </div>

          {/* Methodology note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">How this is calculated</p>
            <p>
              The rate structure is identical for both utilities (confirmed via actual bills and City Council docket UD-24-01).
              The only variable is the Purchase Gas Adjustment (PGA) — the commodity pass-through.
              Entergy operated an LPSC-approved hedging program that kept its PGA markup stable at ~$0.17/CCF over Henry Hub.
              Delta has no hedging program. The "Entergy estimate" uses the same rate formula but substitutes Entergy's historical
              PGA behavior (Henry Hub spot × 0.1037 CCF/MMBtu + $0.17/CCF markup). Henry Hub daily avg for this
              bill period: ${result.hhPrice.toFixed(2)}/MMBtu ({result.tradingDays} trading days, sourced from FRED series DHHNGSP).
            </p>
          </div>

          {/* Bill decomposition */}
          <BillDecomposition
            deltaBill={result.deltaBill}
            entergyBill={result.entergyBill}
            ccf={result.ccfNum}
          />
        </div>
      )}
    </div>
  );
}

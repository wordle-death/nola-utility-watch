import { useState } from 'react';
import { calculateBill, getAvailableMonths, getMonthLabel } from '../lib/billCalculator';
import BillDecomposition from './BillDecomposition';
import Tooltip from './Tooltip';
import pgaHistory from '../data/pgaHistory.json';
import henryHub from '../data/henryHub.json';

export default function BillCalculator() {
  const months = getAvailableMonths();
  const defaultMonth = months.delta[months.delta.length - 1]?.billMonth || '2026-02';

  const [ccf, setCcf] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Build dropdown: all Delta months + Entergy July (the final Entergy bill)
  const entergyJuly = months.entergy.find(m => m.billMonth === '2025-07');
  const allOptions = [
    ...months.delta.map(m => ({
      value: m.billMonth,
      label: getMonthLabel(m.billMonth),
      pgaRate: m.pgaRate,
      periodStart: m.periodStart,
      periodEnd: m.periodEnd,
      type: 'delta',
    })),
    ...(entergyJuly ? [{
      value: '2025-07-entergy',
      label: getMonthLabel('2025-07-entergy'),
      pgaRate: entergyJuly.pgaRate,
      periodStart: entergyJuly.periodStart,
      periodEnd: entergyJuly.periodEnd,
      type: 'entergy_actual',
    }] : []),
  ];
  const monthOptions = allOptions.sort((a, b) => a.value.localeCompare(b.value));

  function handleCalculate(e) {
    e.preventDefault();
    const ccfNum = parseFloat(ccf);
    if (!ccf || isNaN(ccfNum)) {
      setValidationError('Please enter your gas usage in CCF');
      return;
    }
    if (ccfNum <= 0) {
      setValidationError('Usage must be greater than 0');
      return;
    }
    setValidationError('');

    const selected = monthOptions.find(m => m.value === selectedMonth);
    if (!selected) return;

    const isFlipped = selected.type === 'entergy_actual';

    // Look up Henry Hub average for this bill period
    const hhKey = isFlipped ? '2025-07-entergy' : selected.value;
    const periodAvg = henryHub.billPeriodAverages.find(p => p.billMonth === hhKey);
    const hhPrice = periodAvg ? periodAvg.avgHenryHub : 3.00;
    const ccfToMMBtu = 0.1037;

    let deltaBill, entergyBill, entergyPGA, deltaPGARate;

    if (isFlipped) {
      // Entergy was the actual carrier — use their real PGA
      entergyPGA = entergyJuly.pgaRate;
      entergyBill = calculateBill(ccfNum, entergyPGA);

      // Delta comparison — use Delta's actual July PGA
      const deltaJuly = months.delta.find(m => m.billMonth === '2025-07');
      deltaPGARate = deltaJuly.pgaRate;
      deltaBill = calculateBill(ccfNum, deltaPGARate);
    } else {
      // Delta is the actual carrier (normal case)
      const month = months.delta.find(m => m.billMonth === selectedMonth);
      if (!month) return;
      deltaPGARate = month.pgaRate;
      deltaBill = calculateBill(ccfNum, deltaPGARate);

      // Check if we have actual Entergy PGA for this month (e.g., Delta July overlaps with Entergy July)
      const actualEntergy = months.entergy.find(m => m.billMonth === selectedMonth);
      if (actualEntergy) {
        entergyPGA = actualEntergy.pgaRate;
      } else {
        // Estimate Entergy PGA: HH × conversion + $0.17 markup
        const entergyMarkup = pgaHistory.entergyEstimatedMarkup.markupPerCCF;
        entergyPGA = (hhPrice * ccfToMMBtu) + entergyMarkup;
      }
      entergyBill = calculateBill(ccfNum, entergyPGA);
    }

    // Wholesale floor: HH spot only
    const wholesalePGA = hhPrice * ccfToMMBtu;
    const wholesaleBill = calculateBill(ccfNum, wholesalePGA);

    setResult({
      deltaBill,
      entergyBill,
      wholesaleBill,
      deltaPGARate: Math.round(deltaPGARate * 100000) / 100000,
      entergyPGA: Math.round(entergyPGA * 100000) / 100000,
      wholesalePGA: Math.round(wholesalePGA * 100000) / 100000,
      hhPrice,
      tradingDays: periodAvg ? periodAvg.tradingDays : null,
      month: selected,
      ccfNum,
      flipped: isFlipped,
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
              Gas Usage (<Tooltip term="CCF">Hundred Cubic Feet — the standard unit for measuring natural gas usage. Find this on page 1 of your Delta bill under "Gas Usage."</Tooltip>)
            </label>
            <input
              id="ccf"
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 169"
              value={ccf}
              onChange={e => { setCcf(e.target.value); setValidationError(''); }}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 text-gray-900 ${
                validationError
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {validationError ? (
              <p className="text-xs text-red-600 mt-1">{validationError}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Find this on page 1 of your Delta bill</p>
            )}
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

      {/* Empty state */}
      {!result && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">
            Enter your gas usage and billing month above, then click <span className="font-medium text-gray-700">Calculate</span> to see the comparison.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Three-way comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.flipped ? (
              <>
                {/* Entergy Actual (flipped — Entergy was the carrier) */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Entergy</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Actual</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">${result.entergyBill.total.toFixed(2)}</p>
                  <p className="text-sm text-blue-600 mt-1">${result.entergyBill.perCCF.toFixed(2)}/CCF all-in</p>
                  <p className="text-xs text-gray-500 mt-2">PGA: ${result.entergyPGA.toFixed(5)}/CCF</p>
                </div>

                {/* Delta Estimate (flipped) */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-red-600">Delta Utilities</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Delta{"'"}s first bill rate</span>
                  </div>
                  <p className="text-3xl font-bold text-red-700">${result.deltaBill.total.toFixed(2)}</p>
                  <p className="text-sm text-red-600 mt-1">${result.deltaBill.perCCF.toFixed(2)}/CCF all-in</p>
                  <p className="text-xs text-gray-500 mt-2">PGA: ${result.deltaPGARate.toFixed(5)}/CCF</p>
                </div>
              </>
            ) : (
              <>
                {/* Delta Actual (normal) */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-red-600">Delta Utilities</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Actual</span>
                  </div>
                  <p className="text-3xl font-bold text-red-700">${result.deltaBill.total.toFixed(2)}</p>
                  <p className="text-sm text-red-600 mt-1">${result.deltaBill.perCCF.toFixed(2)}/CCF all-in</p>
                  <p className="text-xs text-gray-500 mt-2">PGA: ${result.deltaPGARate.toFixed(5)}/CCF</p>
                </div>

                {/* Entergy Estimate (normal) */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Entergy (Est.)</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">If Entergy still had gas</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">${result.entergyBill.total.toFixed(2)}</p>
                  <p className="text-sm text-blue-600 mt-1">${result.entergyBill.perCCF.toFixed(2)}/CCF all-in</p>
                  <p className="text-xs text-gray-500 mt-2">Est. PGA: ${result.entergyPGA.toFixed(5)}/CCF (HH + $0.17 markup)</p>
                </div>
              </>
            )}

            {/* Wholesale Floor (same either way) */}
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
          {result.flipped ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-800">At the transition, rates were nearly identical</p>
                  <p className="text-2xl font-bold text-green-700">
                    {result.deltaBill.total - result.entergyBill.total >= 0 ? '+' : '-'}${Math.abs(result.deltaBill.total - result.entergyBill.total).toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">
                    difference between Delta and Entergy
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Entergy was still the carrier</p>
                  <p className="text-sm text-green-600 mt-1">
                    This was Entergy{"'"}s final billing period before handing off gas service
                    to Delta on June 30, 2025. Both providers{"'"} PGA rates were ~$0.52/CCF.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {result.deltaBill.total >= result.entergyBill.total ? (
                    <>
                      <p className="text-sm font-medium text-amber-800">You paid more with Delta vs. Entergy estimate</p>
                      <p className="text-2xl font-bold text-amber-700">
                        +${(result.deltaBill.total - result.entergyBill.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-amber-600">
                        ({(((result.deltaBill.total - result.entergyBill.total) / result.entergyBill.total) * 100).toFixed(1)}% more)
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-amber-800">Delta vs. Entergy estimate</p>
                      <p className="text-2xl font-bold text-green-700">
                        -${(result.entergyBill.total - result.deltaBill.total).toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600">
                        Delta was {(((result.entergyBill.total - result.deltaBill.total) / result.entergyBill.total) * 100).toFixed(1)}% cheaper this month
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">Delta{"'"}s PGA markup over Henry Hub</p>
                  <p className="text-2xl font-bold text-amber-700">
                    ${(result.deltaPGARate - result.wholesalePGA).toFixed(3)}/CCF
                  </p>
                  <p className="text-sm text-amber-600">
                    vs. Entergy{"'"}s historical ~$0.17/CCF markup
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">How this is calculated</p>
            {result.flipped ? (
              <p>
                This period was Entergy{"'"}s final billing cycle before Delta took over gas service on June 30, 2025.
                The Entergy bill uses their actual PGA rate from this period. The Delta comparison uses
                Delta{"'"}s PGA from their first bill (overlapping period). Both PGA rates come from actual bills
                for the same address. Henry Hub daily avg for this bill period: ${result.hhPrice.toFixed(2)}/MMBtu
                ({result.tradingDays} trading days, sourced from FRED series DHHNGSP).
              </p>
            ) : (
              <p>
                The rate structure is identical for both utilities (confirmed via actual bills and City Council docket UD-24-01).
                The only variable is the Purchase Gas Adjustment (PGA) — the commodity pass-through.
                Entergy operated an LPSC-approved hedging program that kept its PGA markup stable at ~$0.17/CCF over Henry Hub.
                Delta has no hedging program. The &quot;Entergy estimate&quot; uses the same rate formula but substitutes Entergy{"'"}s historical
                PGA behavior (Henry Hub spot × 0.1037 CCF/MMBtu + $0.17/CCF markup). Henry Hub daily avg for this
                bill period: ${result.hhPrice.toFixed(2)}/MMBtu ({result.tradingDays} trading days, sourced from FRED series DHHNGSP).
              </p>
            )}
          </div>

          {/* Bill decomposition */}
          <BillDecomposition
            deltaBill={result.deltaBill}
            entergyBill={result.entergyBill}
            ccf={result.ccfNum}
            flipped={result.flipped}
          />
        </div>
      )}
    </div>
  );
}

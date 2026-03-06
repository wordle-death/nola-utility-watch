import rates from '../data/rates.json';
import pgaHistory from '../data/pgaHistory.json';

/**
 * Calculate a full gas bill using the New Orleans rate structure.
 *
 * Rate formula:
 *   Customer Charge:        $12.32/month (fixed)
 *   Gas Services:           $0.266/CCF (delivery)
 *   FRP Rider:              77.47% of (Customer Charge + Gas Services) [DELTA ONLY]
 *   Purchase Gas Adjustment: variable $/CCF (the ONLY different component)
 *   Street Use Franchise Fee: 5.27% of all gas charges above
 *   City Tax:               3% of everything including franchise fee
 *
 * The FRP (Formula Rate Plan) Rider is a Delta-specific charge introduced
 * after the July 2025 acquisition. Entergy bills did not include this rider.
 *
 * @param {number} ccf - Gas usage in CCF (hundred cubic feet)
 * @param {number} pgaRate - PGA rate in $/CCF
 * @param {string} provider - 'delta' or 'entergy' (default: 'delta')
 * @returns {object} Full bill decomposition
 */
export function calculateBill(ccf, pgaRate, provider = 'delta') {
  const customerCharge = rates.customerCharge;
  const gasServices = ccf * rates.gasServicesPerCCF;
  // FRP Rider is Delta-only — Entergy did not charge this
  const frpRider = provider === 'delta'
    ? (customerCharge + gasServices) * rates.formulaRatePlanRiderPct
    : 0;
  const pga = ccf * pgaRate;

  const subtotalBeforeFees = customerCharge + gasServices + frpRider + pga;
  const franchiseFee = subtotalBeforeFees * rates.streetUseFranchiseFeePct;
  const subtotalBeforeTax = subtotalBeforeFees + franchiseFee;
  const cityTax = subtotalBeforeTax * rates.cityTaxPct;
  const total = subtotalBeforeTax + cityTax;

  return {
    customerCharge: round(customerCharge),
    gasServices: round(gasServices),
    frpRider: round(frpRider),
    pga: round(pga),
    subtotalBeforeFees: round(subtotalBeforeFees),
    franchiseFee: round(franchiseFee),
    subtotalBeforeTax: round(subtotalBeforeTax),
    cityTax: round(cityTax),
    total: round(total),
    // Per-CCF breakdown
    perCCF: ccf > 0 ? round(total / ccf) : 0,
    // Inputs echoed back
    ccf,
    pgaRate,
  };
}

/**
 * Calculate three side-by-side bills for a given month and usage:
 * 1. Delta actual (using Delta's PGA for that month)
 * 2. Entergy estimate (using Henry Hub + $0.17/CCF markup)
 * 3. Wholesale floor (Henry Hub alone + delivery, no markup)
 *
 * @param {number} ccf - Gas usage in CCF
 * @param {string} billMonth - Format "YYYY-MM"
 * @param {number|null} henryHubPerMMBtu - Monthly avg Henry Hub price in $/MMBtu (optional)
 * @returns {object} Three bill calculations + comparison
 */
export function calculateComparison(ccf, billMonth, henryHubPerMMBtu = null) {
  // Find Delta PGA for the requested month
  const deltaPGA = findPGA('delta', billMonth);
  // Find Entergy PGA for the requested month (if it exists)
  const entergyPGA = findPGA('entergy', billMonth);

  if (!deltaPGA) {
    return { error: `No Delta PGA data available for ${billMonth}` };
  }

  // 1. Delta actual bill (includes FRP rider)
  const deltaBill = calculateBill(ccf, deltaPGA.pgaRate, 'delta');

  // 2. Entergy estimate: HH price converted to CCF + $0.17 markup (no FRP rider)
  let entergyBill = null;
  let entergyPGARate = null;
  if (entergyPGA) {
    // We have actual Entergy data for this month
    entergyPGARate = entergyPGA.pgaRate;
    entergyBill = calculateBill(ccf, entergyPGARate, 'entergy');
  } else if (henryHubPerMMBtu !== null) {
    // Estimate Entergy PGA as HH price × conversion + $0.17 markup
    const hhPerCCF = henryHubPerMMBtu * rates.ccfToMMBtu;
    entergyPGARate = hhPerCCF + pgaHistory.entergyEstimatedMarkup.markupPerCCF;
    entergyBill = calculateBill(ccf, entergyPGARate, 'entergy');
  }

  // 3. Wholesale floor: HH spot price only (no markup, use Delta formula since
  //    this is a theoretical comparison against current Delta rates)
  let wholesaleBill = null;
  if (henryHubPerMMBtu !== null) {
    const hhPerCCF = henryHubPerMMBtu * rates.ccfToMMBtu;
    wholesaleBill = calculateBill(ccf, hhPerCCF, 'delta');
  }

  // Comparison metrics
  const comparison = {};
  if (entergyBill) {
    comparison.deltaVsEntergy = round(deltaBill.total - entergyBill.total);
    comparison.deltaVsEntergyPct = round(
      ((deltaBill.total - entergyBill.total) / entergyBill.total) * 100
    );
    comparison.pgaDifference = round(deltaPGA.pgaRate - entergyPGARate);
  }
  if (wholesaleBill) {
    comparison.deltaVsWholesale = round(deltaBill.total - wholesaleBill.total);
    comparison.deltaPGAMarkupOverHH = round(
      deltaPGA.pgaRate - (henryHubPerMMBtu * rates.ccfToMMBtu)
    );
  }

  return {
    billMonth,
    ccf,
    henryHubPerMMBtu,
    deltaBill,
    entergyBill,
    entergyPGARate: entergyPGARate ? round(entergyPGARate) : null,
    entergyPGASource: entergyPGA ? 'actual_bill' : (henryHubPerMMBtu ? 'estimated' : null),
    wholesaleBill,
    comparison,
    deltaPeriod: deltaPGA,
  };
}

/**
 * Find PGA rate for a given provider and billing month
 */
function findPGA(provider, billMonth) {
  const records = pgaHistory[provider] || [];
  return records.find(r => r.billMonth === billMonth) || null;
}

/**
 * Get all available billing months with PGA data
 */
export function getAvailableMonths() {
  const deltaMonths = pgaHistory.delta.map(r => ({
    billMonth: r.billMonth,
    pgaRate: r.pgaRate,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    provider: 'delta',
  }));
  const entergyMonths = pgaHistory.entergy.map(r => ({
    billMonth: r.billMonth,
    pgaRate: r.pgaRate,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    provider: 'entergy',
  }));
  return { delta: deltaMonths, entergy: entergyMonths, all: [...entergyMonths, ...deltaMonths] };
}

/**
 * Get the PGA trend data for charting
 */
export function getPGATrend() {
  const all = [
    ...pgaHistory.entergy.map(r => ({ ...r, provider: 'entergy' })),
    ...pgaHistory.delta.map(r => ({ ...r, provider: 'delta' })),
  ];
  return all.sort((a, b) => a.billMonth.localeCompare(b.billMonth));
}

function round(n) {
  return Math.round(n * 100) / 100;
}

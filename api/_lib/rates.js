/**
 * Shared rate constants and bill calculation for serverless functions.
 * Duplicates the formula from src/lib/billCalculator.js so API routes
 * don't depend on the Vite build pipeline.
 */

export const RATES = {
  customerCharge: 12.32,
  gasServicesPerCCF: 0.266,
  formulaRatePlanRiderPct: 0.7747,
  streetUseFranchiseFeePct: 0.0527,
  cityTaxPct: 0.03,
  ccfToMMBtu: 0.1037,
};

/** Residential New Orleans ZIP codes */
export const NOLA_ZIP_CODES = new Set([
  '70112', '70113', '70114', '70115', '70116', '70117', '70118', '70119',
  '70121', '70122', '70123', '70124', '70125', '70126', '70127', '70128',
  '70129', '70130', '70131',
]);

/**
 * Known PGA rates from actual bills (pgaHistory.json), used for
 * cross-reference validation of community submissions.
 */
export const KNOWN_PGA = {
  'entergy-2025-01': 0.54107,
  'entergy-2025-04': 0.57456,
  'entergy-2025-05': 0.46751,
  'entergy-2025-06': 0.51856,
  'entergy-2025-07': 0.51856,
  'delta-2025-07': 0.51868,
  'delta-2025-08': 0.48265,
  'delta-2025-09': 0.468856,
  'delta-2025-10': 0.515054,
  'delta-2025-11': 0.54853,
  'delta-2025-12': 0.67655,
  'delta-2026-01': 0.71340,
  'delta-2026-02': 1.05563,
};

/**
 * Calculate gas bill components using the New Orleans rate formula.
 *
 * Both Entergy and Delta charge the FRP (Formula Rate Plan) Rider at 77.47%.
 * Franchise fee (5.27%) and city tax (3%) are listed separately on bills
 * under "Other Charges & Credits", not in the "Gas Charges" section.
 *
 * @param {number} ccf - Gas usage in CCF
 * @param {number} pgaRate - PGA rate in $/CCF
 * @returns {{ gasCharges: number, fullTotal: number }} Gas section subtotal and fully-loaded total
 */
export function calculateBillTotal(ccf, pgaRate) {
  const { customerCharge, gasServicesPerCCF, formulaRatePlanRiderPct,
    streetUseFranchiseFeePct, cityTaxPct } = RATES;

  const gasServices = ccf * gasServicesPerCCF;
  const frpRider = (customerCharge + gasServices) * formulaRatePlanRiderPct;
  const pga = ccf * pgaRate;

  // Gas Charges subtotal (what appears on the bill as "Gas Charges")
  const gasCharges = customerCharge + gasServices + frpRider + pga;

  // Full total including franchise fee and city tax
  const franchiseFee = gasCharges * streetUseFranchiseFeePct;
  const beforeTax = gasCharges + franchiseFee;
  const cityTax = beforeTax * cityTaxPct;
  const fullTotal = beforeTax + cityTax;

  return {
    gasCharges: Math.round(gasCharges * 100) / 100,
    fullTotal: Math.round(fullTotal * 100) / 100,
  };
}

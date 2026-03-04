/**
 * Standalone validation script — run with: node src/lib/validate.mjs
 * Validates the bill calculator against all 7 actual bills.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const rates = require('../data/rates.json');
const validationBills = require('../data/validationBills.json');

function calculateBill(ccf, pgaRate) {
  const customerCharge = rates.customerCharge;
  const gasServices = ccf * rates.gasServicesPerCCF;
  const frpRider = (customerCharge + gasServices) * rates.formulaRatePlanRiderPct;
  const pga = ccf * pgaRate;
  const subtotalBeforeFees = customerCharge + gasServices + frpRider + pga;
  const franchiseFee = subtotalBeforeFees * rates.streetUseFranchiseFeePct;
  const subtotalBeforeTax = subtotalBeforeFees + franchiseFee;
  const cityTax = subtotalBeforeTax * rates.cityTaxPct;
  const total = subtotalBeforeTax + cityTax;
  return {
    subtotalBeforeFees: Math.round(subtotalBeforeFees * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

console.log('=== NOLA Utility Watch — Bill Calculator Validation ===\n');

console.log('--- FULL-MONTH DELTA BILLS (primary validation, comparing total with fees+tax) ---');
console.log('Bill ID                | CCF | PGA Rate | Actual  | Calc    | Diff   | Error% | Pass?');
console.log('-'.repeat(90));

const fullMonthBills = validationBills.bills.filter(b => b.validationType === 'total_with_fees');
const subtotalBills = validationBills.bills.filter(b => b.validationType === 'subtotal_before_fees');

let allPass = true;
for (const bill of fullMonthBills) {
  const calc = calculateBill(bill.ccf, bill.pgaRate);
  const diff = Math.round((calc.total - bill.actualGasTotal) * 100) / 100;
  const errorPct = Math.round((Math.abs(diff) / bill.actualGasTotal) * 10000) / 100;
  const pass = errorPct <= 1.0;
  if (!pass) allPass = false;
  console.log(
    `${bill.id.padEnd(22)} | ${String(bill.ccf).padStart(3)} | $${bill.pgaRate.toFixed(5)} | $${bill.actualGasTotal.toFixed(2).padStart(6)} | $${calc.total.toFixed(2).padStart(6)} | $${diff >= 0 ? '+' : ''}${diff.toFixed(2).padStart(5)} | ${errorPct.toFixed(2).padStart(5)}% | ${pass ? '✅' : '❌'}`
  );
}

console.log('\n--- ENTERGY ERA / TRANSITION BILLS (comparing against subtotal before franchise fee + city tax) ---');
console.log('Bill ID                | CCF | PGA Rate | Actual  | Subtot  | Diff   | Error% | Pass?');
console.log('-'.repeat(90));

for (const bill of subtotalBills) {
  const calc = calculateBill(bill.ccf, bill.pgaRate);
  const compareVal = calc.subtotalBeforeFees;
  const diff = Math.round((compareVal - bill.actualGasTotal) * 100) / 100;
  const errorPct = Math.round((Math.abs(diff) / bill.actualGasTotal) * 10000) / 100;
  const pass = errorPct <= 1.0;
  if (!pass) allPass = false;
  console.log(
    `${bill.id.padEnd(22)} | ${String(bill.ccf).padStart(3)} | $${bill.pgaRate.toFixed(5)} | $${bill.actualGasTotal.toFixed(2).padStart(6)} | $${compareVal.toFixed(2).padStart(6)} | $${diff >= 0 ? '+' : ''}${diff.toFixed(2).padStart(5)} | ${errorPct.toFixed(2).padStart(5)}% | ${pass ? '✅' : '❌'}`
  );
}

console.log('\n' + (allPass ? '✅ ALL BILLS PASS (within 1% tolerance)' : '❌ SOME BILLS NEED INVESTIGATION'));
console.log('\nNote: Entergy Jan 2025 "Gas Total" = subtotal before franchise fee & city tax');
console.log('(Entergy bundled gas+electric; fees/taxes may have been computed on combined total)');
console.log('Transition bills (Jul 2025) are partial-month with possible proration.\n');

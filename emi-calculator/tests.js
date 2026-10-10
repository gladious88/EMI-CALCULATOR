/**
 * EMI PRO - Test Runner (Node.js & Browser Compatible)
 */

const { calc } = (function () {
  if (typeof require !== 'undefined') {
    return require('./script.js');
  }
  return window.EMIPro;
})();

let passCount = 0;
let failCount = 0;
const testResults = [];

function assert(description, condition, details = '') {
  if (condition) {
    passCount++;
    testResults.push({ status: 'PASS', description, details });
    console.log(`✓ PASS: ${description}`);
  } else {
    failCount++;
    testResults.push({ status: 'FAIL', description, details });
    console.error(`✗ FAIL: ${description} - ${details}`);
  }
}

function assertCloseTo(description, actual, expected, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  assert(
    description,
    pass,
    `Expected ~${expected}, got ${actual} (diff: ${diff.toFixed(4)}, tolerance: ${tolerance})`
  );
}

function runAllTests() {
  console.log('\n========================================');
  console.log('      RUNNING EMI PRO ENGINE TESTS      ');
  console.log('========================================\n');

  // --- SECTION 1: REFERENCE EMI CALCULATIONS ---
  console.log('--- 1. Reference EMI Cases ---');
  // Case 1: ₹10,00,000, 8.5%, 20 yrs (240 months) -> Expected EMI ₹8,678.23
  const emi1 = calc.calculateMonthlyEMI(1000000, 8.5, 240);
  assertCloseTo('Case 1: ₹10L @ 8.5% for 20 yrs', emi1, 8678.23);

  // Case 2: ₹5,00,000, 10%, 5 yrs (60 months) -> Expected EMI ₹10,623.52
  const emi2 = calc.calculateMonthlyEMI(500000, 10, 60);
  assertCloseTo('Case 2: ₹5L @ 10% for 5 yrs', emi2, 10623.52);

  // Case 3: ₹1,00,000, 0%, 12 months -> Expected EMI ₹8,333.33
  const emi3 = calc.calculateMonthlyEMI(100000, 0, 12);
  assertCloseTo('Case 3: ₹1L @ 0% for 12 months (Zero Interest)', emi3, 8333.33);

  // Case 4: ₹25,00,000, 7.5%, 15 yrs (180 months) -> Exact float 23175.31, Table approx ₹23,175.10
  const emi4 = calc.calculateMonthlyEMI(2500000, 7.5, 180);
  assertCloseTo('Case 4: ₹25L @ 7.5% for 15 yrs (approx table matching)', emi4, 23175.10, 0.5);


  // --- SECTION 2: INPUT VALIDATION & CONVERSIONS ---
  console.log('\n--- 2. Input Validation & Boundaries ---');

  const validRes = calc.validateLoanInputs(1000000, 8.5, 20, 'years');
  assert('Valid inputs pass validation', validRes.isValid === true);

  const minRes = calc.validateLoanInputs(10000, 0, 1, 'months');
  assert('Minimum boundaries pass validation', minRes.isValid === true);

  const maxRes = calc.validateLoanInputs(10000000, 30, 480, 'months');
  assert('Maximum boundaries pass validation', maxRes.isValid === true);

  const invalidAmt = calc.validateLoanInputs(5000, 8.5, 20, 'years');
  assert('Amount below ₹10,000 is rejected', invalidAmt.isValid === false && !!invalidAmt.errors.amount);

  const invalidRate = calc.validateLoanInputs(100000, 35, 20, 'years');
  assert('Interest rate > 30% is rejected', invalidRate.isValid === false && !!invalidRate.errors.rate);

  const invalidTenure = calc.validateLoanInputs(100000, 8.5, 50, 'years');
  assert('Tenure > 40 years is rejected', invalidTenure.isValid === false && !!invalidTenure.errors.tenure);

  const nonNumeric = calc.validateLoanInputs('abc', 'xyz', 'invalid');
  assert('Non-numeric strings rejected cleanly', nonNumeric.isValid === false);

  assert('Tenure conversion 20 years = 240 months', calc.convertTenureToMonths(20, 'years') === 240);
  assert('Tenure conversion 0.58 years = 7 months', calc.convertTenureToMonths(0.58, 'years') === 7);
  assert('Tenure conversion 36 months = 36 months', calc.convertTenureToMonths(36, 'months') === 36);


  // --- SECTION 3: AMORTIZATION SCHEDULE RECONCILIATION ---
  console.log('\n--- 3. Amortization Schedule Reconciliation ---');

  const schedData = calc.generateAmortizationSchedule(1000000, 8.5, 240, '2026-11');
  assert('Schedule generated successfully', schedData !== null && schedData.schedule.length === 240);

  const lastRow = schedData.schedule[schedData.schedule.length - 1];
  assertCloseTo('Final closing balance is exactly 0', lastRow.closingBalance, 0, 0.0001);

  assertCloseTo('Sum of principal paid equals loan principal', schedData.totalPrincipalPaid, 1000000, 0.01);

  const expectedTotalInterest = calc.calculateLoanSummary(1000000, 8.5, 240, 'months').totalInterest;
  assertCloseTo('Sum of interest paid equals total interest', schedData.totalInterestPaid, expectedTotalInterest, 0.1);


  // --- SECTION 4: PREPAYMENT SIMULATOR ---
  console.log('\n--- 4. Prepayment Simulator ---');

  // No extra payment equals base case
  const prepBase = calc.simulatePrepayment(1000000, 8.5, 240, 0, 0, 1, 'reduce_tenure');
  assert('Prepayment with zero extra matches base duration', prepBase.newMonths === 240);

  // Extra monthly ₹2,000 reduces tenure
  const prepExtra = calc.simulatePrepayment(1000000, 8.5, 240, 2000, 0, 1, 'reduce_tenure');
  assert('Extra monthly payment reduces tenure', prepExtra.newMonths < 240 && prepExtra.monthsSaved > 0);
  assert('Extra monthly payment saves interest', prepExtra.interestSaved > 0);

  // One-time prepayment ₹1,00,000 in month 12
  const prepLump = calc.simulatePrepayment(1000000, 8.5, 240, 0, 100000, 12, 'reduce_tenure');
  assert('One-time prepayment reduces tenure', prepLump.newMonths < 240);

  // Mode 2: Reduce EMI
  const prepEMI = calc.simulatePrepayment(1000000, 8.5, 240, 0, 100000, 12, 'reduce_emi');
  assert('Mode 2 reduces EMI after prepayment', prepEMI.newEMI < baseSummaryEMI(1000000, 8.5, 240));

  function baseSummaryEMI(P, R, N) {
    return calc.calculateMonthlyEMI(P, R, N);
  }

  // Large lump sum exceeding remaining balance doesn't result in negative balance
  const prepLarge = calc.simulatePrepayment(100000, 8.5, 12, 0, 200000, 1, 'reduce_tenure');
  assert('Over-prepayment stops cleanly at 0 balance without negative balance', prepLarge.schedule[prepLarge.schedule.length - 1].closing === 0);


  // --- SECTION 5: FORMATTING & UTILITIES ---
  console.log('\n--- 5. Formatting & Utilities ---');

  const formattedInd = calc.formatCurrency(1000000.5, 'indian');
  assert('Indian currency format ₹10,00,000.50', formattedInd === '₹10,00,000.50');

  const formattedInt = calc.formatCurrency(1000000.5, 'international');
  assert('International currency format ₹1,000,000.50', formattedInt === '₹1,000,000.50');

  const compactVal = calc.formatCompactCurrency(1050000);
  assert('Compact format ₹10.50L', compactVal === '₹10.50 L');

  const escapedStr = calc.escapeHTML('<script>alert("xss")</script>');
  assert('HTML escaping works', escapedStr.includes('&lt;script&gt;'));


  // --- SUMMARY ---
  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('========================================\n');

  return { passCount, failCount, testResults };
}

if (typeof require !== 'undefined' && require.main === module) {
  const { failCount } = runAllTests();
  process.exit(failCount === 0 ? 0 : 1);
} else if (typeof window !== 'undefined') {
  window.runEMIProTests = runAllTests;
}

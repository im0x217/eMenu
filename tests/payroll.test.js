'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyHealthCertStatus,
  summarizeEmployeeProduction,
  computeMonthlyPayoutSummary,
} = require('../src/domain/payroll');

test('classifyHealthCertStatus classifies none, expired, approaching (<= 30 days), and valid (> 30 days)', () => {
  const ref = new Date('2026-05-01T00:00:00Z');

  assert.equal(classifyHealthCertStatus('', ref), 'none');
  assert.equal(classifyHealthCertStatus(null, ref), 'none');
  assert.equal(classifyHealthCertStatus('2026-02-30', ref), 'none'); // non-existent date
  assert.equal(classifyHealthCertStatus('not-a-date', ref), 'none');

  assert.equal(classifyHealthCertStatus('2026-04-30', ref), 'expired'); // -1 day
  assert.equal(classifyHealthCertStatus('2026-05-01', ref), 'approaching'); // 0 days (today)
  assert.equal(classifyHealthCertStatus('2026-05-31', ref), 'approaching'); // exactly 30 days
  assert.equal(classifyHealthCertStatus('2026-06-01', ref), 'valid'); // 31 days
});

test('summarizeEmployeeProduction computes sum(qty * chefCoefficient), enforces 0 baseSalary for production, and deduplicates shared products', () => {
  const chefMetrics = {
    'shop1:chefA': new Map([
      [
        'prod1',
        {
          shop: 'shop1',
          productId: 'prod1',
          productName: 'بقلاوة',
          soldQty: 10.5,
          totalSales: 525,
          chefCoefficient: 4,
        },
      ],
      [
        'prod2',
        {
          shop: 'shop1',
          productId: 'prod2',
          productName: 'مقروض',
          soldQty: 3,
          totalSales: 90,
          chefCoefficient: 2.5,
        },
      ],
    ]),
    'shop1:chefB': new Map([
      // Duplicate prod1 should not double-count
      [
        'prod1',
        {
          shop: 'shop1',
          productId: 'prod1',
          productName: 'بقلاوة',
          soldQty: 10.5,
          totalSales: 525,
          chefCoefficient: 4,
        },
      ],
    ]),
  };

  const prodEmp = {
    payType: 'production',
    salary: 999, // ignored for production payType
    linkedChefs: [
      { shop: 'shop1', chefId: 'chefA' },
      { shop: 'shop1', chefId: 'chefB' },
    ],
  };

  const summary = summarizeEmployeeProduction(prodEmp, chefMetrics);
  assert.equal(summary.baseSalary, 0);
  assert.equal(summary.productionTotalQty, 13.5);
  assert.equal(summary.productionTotalSales, 615);
  assert.equal(summary.productionGrossPay, 49.5); // (10.5 * 4) + (3 * 2.5) = 42 + 7.5
  assert.equal(summary.productBreakdown.length, 2);
  assert.equal(summary.productBreakdown[0].productId, 'prod1');

  const fixedEmp = { payType: 'fixed', salary: 1200 };
  const fixedSummary = summarizeEmployeeProduction(fixedEmp, chefMetrics);
  assert.equal(fixedSummary.baseSalary, 1200);
  assert.equal(fixedSummary.productionGrossPay, 0);
  assert.deepEqual(fixedSummary.productBreakdown, []);
});

test('computeMonthlyPayoutSummary calculates fixed & production settlements and structured rejections', () => {
  // 1. Fixed employee with unsettled adjustments and one already-settled adjustment
  const fixedResult = computeMonthlyPayoutSummary({
    employee: { payType: 'fixed', salary: 1500 },
    monthTransactions: [
      { _id: 't1', txNumber: 1001, type: 'bonus', amount: 200, date: '2026-05-05' },
      { _id: 't2', txNumber: 1002, type: 'borrowing', amount: 300, date: '2026-05-10' },
      { _id: 't3', txNumber: 1003, type: 'penalty', amount: 50.25, date: '2026-05-12' },
      {
        _id: 't4',
        txNumber: 1004,
        type: 'bonus',
        amount: 999,
        settledByPayoutId: 'prev-payout',
      },
    ],
  });

  assert.equal(fixedResult.ok, true);
  assert.equal(fixedResult.settledBaseSalary, true);
  assert.equal(fixedResult.grossPayToSettle, 1500);
  assert.equal(fixedResult.bonusesTotal, 200);
  assert.equal(fixedResult.borrowingsTotal, 300);
  assert.equal(fixedResult.penaltiesTotal, 50.25);
  assert.equal(fixedResult.deductionsTotal, 350.25);
  assert.equal(fixedResult.totalPayReceived, 1349.75); // 1500 + 200 - 350.25
  assert.equal(fixedResult.unsettledAdjustments.length, 3);

  // 2. Production employee with partial earlier payout settles only delta
  const prodResult = computeMonthlyPayoutSummary({
    employee: {
      payType: 'production',
      linkedChefs: [{ shop: 'shop2', chefId: 'c1' }],
    },
    monthTransactions: [
      {
        _id: 'p1',
        type: 'payout',
        amount: 300,
        payoutDetails: { grossPaySettled: 300, settledBaseSalary: false },
      },
      { _id: 't5', txNumber: 1005, type: 'bonus', amount: 50 },
    ],
    productionMetrics: {
      'shop2:c1': [
        { shop: 'shop2', productId: 'x1', productName: 'غريبة', soldQty: 100, totalSales: 2000, chefCoefficient: 4.5 },
      ],
    },
  });

  assert.equal(prodResult.ok, true);
  assert.equal(prodResult.settledBaseSalary, false);
  assert.equal(prodResult.alreadySettledProdGross, 300);
  assert.equal(prodResult.grossPayToSettle, 150); // 450 - 300
  assert.equal(prodResult.totalPayReceived, 200); // 150 + 50

  // 3. Nothing left to settle rejection
  const nothingLeft = computeMonthlyPayoutSummary({
    employee: { payType: 'fixed', salary: 1500 },
    monthTransactions: [
      {
        _id: 'p-full',
        type: 'payout',
        amount: 1500,
        payoutDetails: { settledBaseSalary: true, grossPaySettled: 1500 },
      },
    ],
  });
  assert.equal(nothingLeft.ok, false);
  assert.equal(nothingLeft.canSettle, false);
  assert.equal(nothingLeft.code, 'NOTHING_TO_SETTLE');
  assert.ok(nothingLeft.reason.length > 0);

  // 4. Deductions exceed due rejection
  const overDeducted = computeMonthlyPayoutSummary({
    employee: { payType: 'fixed', salary: 500 },
    monthTransactions: [
      { _id: 'b1', type: 'borrowing', amount: 450 },
      { _id: 'p1', type: 'penalty', amount: 100 },
    ],
  });
  assert.equal(overDeducted.ok, false);
  assert.equal(overDeducted.canSettle, false);
  assert.equal(overDeducted.code, 'DEDUCTIONS_EXCEED_DUE');
  assert.equal(overDeducted.totalPayReceived, -50);
});

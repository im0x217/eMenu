'use strict';

const { round2 } = require('./pricing');

const APPROACHING_EXPIRY_DAYS = 30;
const MS_PER_DAY = 86400000;

function parseIsoCalendarDate(isoStr) {
  if (typeof isoStr !== 'string') return null;
  const clean = isoStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return Date.UTC(y, m - 1, d);
}

function resolveReferenceUtcMidnightMs(referenceDate) {
  if (typeof referenceDate === 'string') {
    const parsedStr = parseIsoCalendarDate(referenceDate);
    if (parsedStr !== null) return parsedStr;
  }

  const ref = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
    ? referenceDate
    : new Date();

  const isExplicitUtcMidnight =
    referenceDate instanceof Date &&
    ref.getUTCHours() === 0 &&
    ref.getUTCMinutes() === 0 &&
    ref.getUTCSeconds() === 0 &&
    ref.getUTCMilliseconds() === 0;

  if (isExplicitUtcMidnight) {
    return Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  }

  return Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

/**
 * Classify an employee's health certificate expiry date relative to `referenceDate`.
 * Returns `'none' | 'expired' | 'approaching' | 'valid'`, with approaching threshold `<= 30` days.
 *
 * @param {string | null | undefined} expiryIso
 * @param {Date | string} [referenceDate=new Date()]
 * @returns {'none' | 'expired' | 'approaching' | 'valid'}
 */
function classifyHealthCertStatus(expiryIso, referenceDate = new Date()) {
  const expUtcMs = parseIsoCalendarDate(expiryIso);
  if (expUtcMs === null) return 'none';

  const refUtcMs = resolveReferenceUtcMidnightMs(referenceDate);
  const daysRemaining = Math.round((expUtcMs - refUtcMs) / MS_PER_DAY);

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= APPROACHING_EXPIRY_DAYS) return 'approaching';
  return 'valid';
}

/**
 * Summarize monthly chef production earnings for an employee (`sum(qty * chefCoefficient)`).
 * Employees with `payType === 'production'` always have `baseSalary: 0`.
 *
 * @param {Record<string, any>} employee
 * @param {Record<string, Map<string, any> | Array<any> | Record<string, any>>} [chefProductMetrics={}]
 */
function summarizeEmployeeProduction(employee, chefProductMetrics = {}) {
  const isProduction = employee?.payType === 'production';
  const baseSalary = isProduction ? 0 : Math.max(0, round2(employee?.salary));

  let productionTotalQty = 0;
  let productionTotalSales = 0;
  let productionGrossPay = 0;
  const productBreakdown = [];

  if (isProduction) {
    const seenProds = new Set();
    const links = Array.isArray(employee?.linkedChefs) ? employee.linkedChefs : [];

    for (const link of links) {
      if (!link || !link.chefId) continue;
      const shopKey = link.shop === 'shop2' ? 'shop2' : 'shop1';
      const cKey = `${shopKey}:${String(link.chefId)}`;
      const metricEntry = chefProductMetrics ? chefProductMetrics[cKey] : null;
      if (!metricEntry) continue;

      let records;
      if (metricEntry instanceof Map) {
        records = metricEntry.values();
      } else if (Array.isArray(metricEntry)) {
        records = metricEntry;
      } else if (typeof metricEntry === 'object') {
        records = Object.values(metricEntry);
      } else {
        continue;
      }

      for (const rec of records) {
        if (!rec || typeof rec !== 'object') continue;
        const recShop = rec.shop === 'shop2' ? 'shop2' : shopKey;
        const recPid = String(rec.productId || rec.productName || '');
        const uniqueKey = `${recShop}:${recPid}`;
        if (seenProds.has(uniqueKey)) continue;
        seenProds.add(uniqueKey);

        const qtyRounded = round2(rec.soldQty);
        const salesRounded = round2(rec.totalSales);
        const unitRate = Math.max(0, Number(rec.chefCoefficient) || 0);
        const earningsRounded = round2(qtyRounded * unitRate);

        productionTotalQty += qtyRounded;
        productionTotalSales += salesRounded;
        productionGrossPay += earningsRounded;

        productBreakdown.push({
          ...rec,
          shop: recShop,
          soldQty: qtyRounded,
          totalSales: salesRounded,
          chefEarnings: earningsRounded,
        });
      }
    }

    productBreakdown.sort(
      (a, b) =>
        b.soldQty - a.soldQty ||
        b.totalSales - a.totalSales ||
        String(a.productName || '').localeCompare(String(b.productName || ''), 'ar')
    );
  }

  return {
    baseSalary,
    productionTotalQty: round2(productionTotalQty),
    productionTotalSales: round2(productionTotalSales),
    productionGrossPay: round2(productionGrossPay),
    productBreakdown,
  };
}

/**
 * Pure calculation of an employee's monthly settlement/payout summary, including
 * structured rejection reasons when nothing remains to settle or deductions exceed due.
 *
 * @param {{
 *   employee: Record<string, any>,
 *   monthTransactions?: Array<Record<string, any>>,
 *   productionMetrics?: Record<string, any>
 * }} params
 */
function computeMonthlyPayoutSummary({
  employee,
  monthTransactions = [],
  productionMetrics = {},
} = {}) {
  const safeTxs = Array.isArray(monthTransactions) ? monthTransactions : [];
  const unsettledAdjustments = safeTxs.filter(
    (tx) => tx && ['bonus', 'borrowing', 'penalty'].includes(tx.type) && !tx.settledByPayoutId
  );
  const priorPayouts = safeTxs.filter((tx) => tx && tx.type === 'payout');

  let bonusesTotal = 0;
  let borrowingsTotal = 0;
  let penaltiesTotal = 0;
  const settledTransactions = [];

  for (const t of unsettledAdjustments) {
    const amt = round2(t.amount);
    if (t.type === 'bonus') bonusesTotal += amt;
    else if (t.type === 'borrowing') borrowingsTotal += amt;
    else if (t.type === 'penalty') penaltiesTotal += amt;

    settledTransactions.push({
      _id: t._id,
      txNumber: t.txNumber,
      date: t.date || '',
      type: t.type,
      amount: amt,
      reason: t.reason || '',
    });
  }

  bonusesTotal = round2(bonusesTotal);
  borrowingsTotal = round2(borrowingsTotal);
  penaltiesTotal = round2(penaltiesTotal);
  const deductionsTotal = round2(borrowingsTotal + penaltiesTotal);

  const alreadySettledBase = priorPayouts.some((p) => Boolean(p?.payoutDetails?.settledBaseSalary));
  const alreadySettledProdGross = round2(
    priorPayouts.reduce((s, p) => s + (Number(p?.payoutDetails?.grossPaySettled) || 0), 0)
  );

  const isProduction = employee?.payType === 'production';
  const configuredBaseSalary = isProduction ? 0 : Math.max(0, round2(employee?.salary));

  let grossPayToSettle = 0;
  let productionTotalQty = 0;

  if (isProduction) {
    const prodSummary =
      productionMetrics && typeof productionMetrics.productionGrossPay === 'number'
        ? productionMetrics
        : summarizeEmployeeProduction(employee, productionMetrics || {});
    grossPayToSettle = Math.max(0, round2(prodSummary.productionGrossPay - alreadySettledProdGross));
    productionTotalQty = round2(prodSummary.productionTotalQty);
  } else {
    grossPayToSettle = alreadySettledBase ? 0 : configuredBaseSalary;
  }

  const settledBaseSalary = !isProduction && !alreadySettledBase;
  const totalPayReceived = round2(grossPayToSettle + bonusesTotal - deductionsTotal);

  if (grossPayToSettle <= 0 && unsettledAdjustments.length === 0) {
    return {
      ok: false,
      canSettle: false,
      code: 'NOTHING_TO_SETTLE',
      reason: 'تم صرف وتصفية مستحقات هذا الموظف لهذا الشهر مسبقاً ولا توجد مبالغ جديدة',
      isProduction,
      configuredBaseSalary,
      settledBaseSalary,
      alreadySettledBase,
      alreadySettledProdGross,
      grossPayToSettle,
      productionTotalQty,
      bonusesTotal,
      borrowingsTotal,
      penaltiesTotal,
      deductionsTotal,
      totalPayReceived,
      unsettledAdjustments,
      settledTransactions,
    };
  }

  if (totalPayReceived < 0) {
    return {
      ok: false,
      canSettle: false,
      code: 'DEDUCTIONS_EXCEED_DUE',
      reason: 'إجمالي السلف والخصومات يتجاوز المستحق؛ يرجى مراجعة الحساب قبل الصرف',
      isProduction,
      configuredBaseSalary,
      settledBaseSalary,
      alreadySettledBase,
      alreadySettledProdGross,
      grossPayToSettle,
      productionTotalQty,
      bonusesTotal,
      borrowingsTotal,
      penaltiesTotal,
      deductionsTotal,
      totalPayReceived,
      unsettledAdjustments,
      settledTransactions,
    };
  }

  return {
    ok: true,
    canSettle: true,
    code: null,
    reason: null,
    isProduction,
    configuredBaseSalary,
    settledBaseSalary,
    alreadySettledBase,
    alreadySettledProdGross,
    grossPayToSettle,
    productionTotalQty,
    bonusesTotal,
    borrowingsTotal,
    penaltiesTotal,
    deductionsTotal,
    totalPayReceived,
    unsettledAdjustments,
    settledTransactions,
  };
}

module.exports = {
  APPROACHING_EXPIRY_DAYS,
  classifyHealthCertStatus,
  summarizeEmployeeProduction,
  computeMonthlyPayoutSummary,
};

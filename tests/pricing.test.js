'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  round2,
  resolveEffectiveUnitPrice,
  computeOrderLineTotal,
  computeOrderTotals,
  computeStockReservationDelta,
} = require('../src/domain/pricing');

test('round2 handles IEEE-754 decimals and avoids -0', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(12.345), 12.35);
  assert.equal(Object.is(round2(-0), 0), true);
  assert.equal(round2('not-a-number'), 0);
  assert.equal(round2(null), 0);
});

test('resolveEffectiveUnitPrice isolates retail (regular) vs bulk modes', () => {
  const prod = { price_regular: 45, price_bulk: 36, price: 40 };
  assert.equal(resolveEffectiveUnitPrice(prod, 'regular'), 45);
  assert.equal(resolveEffectiveUnitPrice(prod, 'retail'), 45);
  assert.equal(resolveEffectiveUnitPrice(prod, 'bulk'), 36);

  // Bulk falls back to price_regular when price_bulk is absent/empty
  assert.equal(resolveEffectiveUnitPrice({ price_regular: 22, price_bulk: '' }, 'bulk'), 22);
  // Retail falls back to price_bulk/legacy price only if price_regular is missing
  assert.equal(resolveEffectiveUnitPrice({ price_bulk: 18 }, 'regular'), 18);
  assert.equal(resolveEffectiveUnitPrice({ price: 15 }, 'regular'), 15);
  assert.equal(resolveEffectiveUnitPrice(null, 'regular'), 0);
});

test('computeOrderLineTotal and computeOrderTotals enforce fractional kilo vs integer piece math and retail/bulk isolation', () => {
  // Fractional kilo item (allowFloat: true)
  const kiloLine = computeOrderLineTotal(
    { price_regular: 50, price_bulk: 40, allowFloat: true, quantity: 0.75 },
    'regular'
  );
  assert.equal(kiloLine, 37.5);

  const kiloMinClamp = computeOrderLineTotal(
    { price_regular: 40, allowFloat: true, quantity: 0.01 },
    'regular'
  );
  assert.equal(kiloMinClamp, 2); // 0.05 * 40

  // Integer piece item (allowFloat: false) rounds fractional input and clamps to min 1
  const pieceRounded = computeOrderLineTotal(
    { price_regular: 12, price_bulk: 10, allowFloat: false, quantity: 2.6 },
    'bulk'
  );
  assert.equal(pieceRounded, 30); // round(2.6) = 3 * bulk 10

  const pieceSmall = computeOrderLineTotal(
    { price_regular: 12, allowFloat: false, quantity: 0.4 },
    'regular'
  );
  assert.equal(pieceSmall, 12); // max(1, round(0.4)) = 1 * 12

  // Order totals isolation between regular and bulk
  const cart = [
    { name: 'بقلاوة', price_regular: 60, price_bulk: 48, allowFloat: true, quantity: 1.5 },
    { name: 'علبة كعك', price_regular: 25, price_bulk: 20, allowFloat: false, quantity: 2 },
  ];

  const retailSummary = computeOrderTotals(cart, 'regular');
  assert.equal(retailSummary.priceMode, 'regular');
  assert.equal(retailSummary.totalPrice, 140); // 90 + 50
  assert.equal(retailSummary.totalQuantity, 3.5);
  assert.equal(retailSummary.itemCount, 2);

  const bulkSummary = computeOrderTotals(cart, 'bulk');
  assert.equal(bulkSummary.priceMode, 'bulk');
  assert.equal(bulkSummary.totalPrice, 112); // 72 + 40

  const emptySummary = computeOrderTotals([], 'regular');
  assert.equal(emptySummary.totalPrice, 0);
  assert.equal(emptySummary.itemCount, 0);
});

test('computeStockReservationDelta calculates additions, reductions, removals, scaling, and ignores unchanged/non-storage items', () => {
  const oldItems = [
    { productId: 'p1', name: 'A', quantity: 3, conversionFactor: 1 },
    { productId: 'p2', name: 'B', quantity: 5, conversionFactor: 2 }, // 10 units
    { productId: 'p3', name: 'C', quantity: 2, conversionFactor: 1 },
    { productId: 'p4', name: 'D', quantity: 4, conversionFactor: 1 }, // unchanged
  ];
  const newItems = [
    { productId: 'p1', name: 'A', quantity: 5, conversionFactor: 1 }, // +2
    { productId: 'p2', name: 'B', quantity: 3, conversionFactor: 2 }, // 6 units -> -4
    { productId: 'p4', name: 'D', quantity: 4, conversionFactor: 1 }, // 0 (unchanged)
    { productId: 'p5', name: 'E', quantity: 2.5, conversionFactor: 1 }, // +2.5
    { productId: 'p6', name: 'NoStorage', quantity: 10, hasStorage: false }, // excluded
  ];

  const result = computeStockReservationDelta(oldItems, newItems);

  assert.equal(result.unchanged.length, 1);
  assert.equal(result.unchanged[0].productId, 'p4');

  assert.deepEqual(
    result.toReserve.map((x) => ({ productId: x.productId, qty: x.qty })),
    [
      { productId: 'p1', qty: 2 },
      { productId: 'p5', qty: 2.5 },
    ]
  );

  assert.deepEqual(
    result.toReturn.map((x) => ({ productId: x.productId, qty: x.qty })),
    [
      { productId: 'p2', qty: 4 },
      { productId: 'p3', qty: 2 },
    ]
  );

  // net: old = 3 + 10 + 2 + 4 = 19, new = 5 + 6 + 4 + 2.5 = 17.5 -> -1.5
  assert.equal(result.netDelta, -1.5);
});

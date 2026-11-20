'use strict';

/**
 * Round a numeric value safely to 2 decimal places, normalizing -0 to 0.
 * @param {number | string | null | undefined} n
 * @returns {number}
 */
function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Parse piecesPerUnit metadata safely (positive finite number rounded to 2 decimals, or null).
 * @param {unknown} val
 * @returns {number | null}
 */
function parsePiecesPerUnit(val) {
  if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined' || val === 'none') {
    return null;
  }
  const parsed = Number(val);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return round2(parsed);
}

function isUsablePrice(val) {
  if (val === null || val === undefined || val === '') return false;
  const num = Number(val);
  return Number.isFinite(num) && num >= 0;
}

/**
 * Resolve effective unit price for a product respecting retail (`regular`) vs `bulk` isolation.
 * In `bulk` mode, uses `price_bulk` when valid, otherwise falls back to `price_regular` / `price`.
 * In retail (`regular`) mode, uses `price_regular` when valid, never leaking `price_bulk` unless `price_regular` is missing.
 *
 * @param {{ price_regular?: unknown, price_bulk?: unknown, price?: unknown } | null | undefined} product
 * @param {'regular' | 'retail' | 'bulk' | string} [priceMode='regular']
 * @returns {number}
 */
function resolveEffectiveUnitPrice(product, priceMode = 'regular') {
  if (!product || typeof product !== 'object') return 0;

  const isBulk = priceMode === 'bulk';
  if (isBulk && isUsablePrice(product.price_bulk)) {
    return round2(Number(product.price_bulk));
  }
  if (isUsablePrice(product.price_regular)) {
    return round2(Number(product.price_regular));
  }
  if (isUsablePrice(product.price_bulk)) {
    return round2(Number(product.price_bulk));
  }
  if (isUsablePrice(product.price)) {
    return round2(Number(product.price));
  }
  return 0;
}

/**
 * Normalize order line quantity: fractional kilos (`allowFloat: true`, min 0.05) vs integer pieces (`allowFloat: false`, min 1).
 * @param {unknown} rawQuantity
 * @param {boolean} [allowFloat=false]
 * @returns {number}
 */
function normalizeOrderQuantity(rawQuantity, allowFloat = false) {
  const canFloat = Boolean(allowFloat);
  const rawNumericQty = Number(rawQuantity);
  const normalizedQty =
    Number.isFinite(rawNumericQty) && rawNumericQty > 0
      ? canFloat
        ? rawNumericQty
        : Math.round(rawNumericQty)
      : 1;
  const clamped = Math.max(canFloat ? 0.05 : 1, normalizedQty);
  return round2(clamped);
}

/**
 * Compute line total (`round2(unitPrice * normalizedQty)`) for a single order item.
 * @param {Record<string, any>} item
 * @param {'regular' | 'retail' | 'bulk' | string} [priceMode='regular']
 * @returns {number}
 */
function computeOrderLineTotal(item, priceMode = 'regular') {
  if (!item || typeof item !== 'object') return 0;
  const source = item.product && typeof item.product === 'object' ? item.product : item;
  const allowFloat = Boolean(item.allowFloat ?? source.allowFloat);
  const qty = normalizeOrderQuantity(item.quantity, allowFloat);

  let unitPrice;
  if (typeof item.overridePrice === 'number' && Number.isFinite(item.overridePrice) && item.overridePrice >= 0) {
    unitPrice = round2(item.overridePrice);
  } else {
    unitPrice = resolveEffectiveUnitPrice(source, priceMode);
  }

  return round2(unitPrice * qty);
}

/**
 * Compute normalized line items and authoritative order totals with retail/bulk isolation
 * and fractional kilo vs integer piece rules.
 *
 * @param {Array<Record<string, any>>} items
 * @param {'regular' | 'retail' | 'bulk' | string} [priceMode='regular']
 * @returns {{ items: Array<Record<string, any>>, totalPrice: number, subtotal: number, totalQuantity: number, itemCount: number, priceMode: 'regular' | 'bulk' }}
 */
function computeOrderTotals(items, priceMode = 'regular') {
  const normalizedMode = priceMode === 'bulk' ? 'bulk' : 'regular';
  if (!Array.isArray(items) || items.length === 0) {
    return {
      items: [],
      totalPrice: 0,
      subtotal: 0,
      totalQuantity: 0,
      itemCount: 0,
      priceMode: normalizedMode,
    };
  }

  let rawTotal = 0;
  let totalQuantity = 0;

  const computedItems = items.map((item) => {
    const safeItem = item && typeof item === 'object' ? item : {};
    const source = safeItem.product && typeof safeItem.product === 'object' ? safeItem.product : safeItem;
    const allowFloat = Boolean(safeItem.allowFloat ?? source.allowFloat);
    const quantity = normalizeOrderQuantity(safeItem.quantity, allowFloat);

    let unitPrice;
    if (
      typeof safeItem.overridePrice === 'number' &&
      Number.isFinite(safeItem.overridePrice) &&
      safeItem.overridePrice >= 0
    ) {
      unitPrice = round2(safeItem.overridePrice);
    } else {
      unitPrice = resolveEffectiveUnitPrice(source, normalizedMode);
    }

    const lineTotal = round2(unitPrice * quantity);
    rawTotal += unitPrice * quantity;
    totalQuantity += quantity;

    return {
      ...safeItem,
      unitPrice,
      price: unitPrice,
      quantity,
      allowFloat,
      lineTotal,
    };
  });

  const totalPrice = round2(rawTotal);

  return {
    items: computedItems,
    totalPrice,
    subtotal: totalPrice,
    totalQuantity: round2(totalQuantity),
    itemCount: computedItems.length,
    priceMode: normalizedMode,
  };
}

function getStockKey(item) {
  if (!item || typeof item !== 'object') return '';
  if (item.inventoryRecordId) return `inv:${String(item.inventoryRecordId)}`;
  if (item.productId) return `prod:${String(item.productId)}`;
  if (item.name) return `name:${String(item.name).trim().toLowerCase()}`;
  return '';
}

function extractEffectiveStockQty(item) {
  if (!item || typeof item !== 'object') return 0;
  if (item.hasStorage === false) return 0;

  if (
    item.reservedQty !== undefined &&
    item.quantity === undefined &&
    item.orderedQty === undefined
  ) {
    const r = Number(item.reservedQty);
    return Number.isFinite(r) && r > 0 ? r : 0;
  }

  const rawQty = Number(item.quantity ?? item.orderedQty ?? 0);
  if (!Number.isFinite(rawQty) || rawQty <= 0) return 0;

  const factor = Number(item.conversionFactor);
  const effectiveFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return rawQty * effectiveFactor;
}

/**
 * Compute per-SKU stock reservation deltas between an existing item list and a replacement item list.
 * Positive `delta` indicates additional units to reserve/deduct; negative `delta` indicates units to return.
 *
 * @param {Array<Record<string, any>>} [oldItems=[]]
 * @param {Array<Record<string, any>>} [newItems=[]]
 */
function computeStockReservationDelta(oldItems = [], newItems = []) {
  const aggregateByKey = (list) => {
    const map = new Map();
    if (!Array.isArray(list)) return map;
    for (const item of list) {
      if (!item || typeof item !== 'object' || item.hasStorage === false) continue;
      const key = getStockKey(item);
      if (!key) continue;
      const qty = extractEffectiveStockQty(item);
      const prev = map.get(key) || {
        key,
        productId: item.productId ? String(item.productId) : null,
        inventoryRecordId: item.inventoryRecordId ? String(item.inventoryRecordId) : null,
        name: item.productName || item.name || '',
        qty: 0,
      };
      prev.qty += qty;
      if (!prev.productId && item.productId) prev.productId = String(item.productId);
      if (!prev.inventoryRecordId && item.inventoryRecordId) {
        prev.inventoryRecordId = String(item.inventoryRecordId);
      }
      if (!prev.name && (item.productName || item.name)) {
        prev.name = item.productName || item.name;
      }
      map.set(key, prev);
    }
    return map;
  };

  const oldMap = aggregateByKey(oldItems);
  const newMap = aggregateByKey(newItems);
  const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

  const deltas = [];
  const toReserve = [];
  const toReturn = [];
  const unchanged = [];
  let totalOld = 0;
  let totalNew = 0;

  for (const key of allKeys) {
    const oldEntry = oldMap.get(key);
    const newEntry = newMap.get(key);
    const oldQty = round2(oldEntry ? oldEntry.qty : 0);
    const newQty = round2(newEntry ? newEntry.qty : 0);
    const delta = round2(newQty - oldQty);

    totalOld += oldQty;
    totalNew += newQty;

    const record = {
      key,
      productId: newEntry?.productId || oldEntry?.productId || null,
      inventoryRecordId: newEntry?.inventoryRecordId || oldEntry?.inventoryRecordId || null,
      name: newEntry?.name || oldEntry?.name || '',
      oldQty,
      newQty,
      delta,
    };

    if (delta > 0) {
      deltas.push(record);
      toReserve.push({ ...record, qty: delta });
    } else if (delta < 0) {
      deltas.push(record);
      toReturn.push({ ...record, qty: round2(Math.abs(delta)) });
    } else {
      unchanged.push(record);
    }
  }

  return {
    deltas,
    toReserve,
    toReturn,
    unchanged,
    netDelta: round2(totalNew - totalOld),
  };
}

module.exports = {
  round2,
  parsePiecesPerUnit,
  resolveEffectiveUnitPrice,
  normalizeOrderQuantity,
  computeOrderLineTotal,
  computeOrderTotals,
  computeStockReservationDelta,
};

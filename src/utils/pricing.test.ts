import { describe, expect, it } from 'vitest';
import {
  computeTotals,
  formatMoney,
  lineOriginalTotal,
  lineTotal,
  unitOriginalPrice,
  unitPrice,
} from './pricing';
import { resolveLineProduct } from './selectors';
import { getProduct } from '../data/catalog';
import type { Product } from '../types';

function mustGet(id: string): Product {
  const product = getProduct(id);
  if (!product) throw new Error(`missing product ${id}`);
  return product;
}

describe('unit prices', () => {
  it('uses the authoritative per-unit price from product data', () => {
    expect(unitPrice(mustGet('wyze-cam-v4'))).toBe(2798);
    expect(unitOriginalPrice(mustGet('wyze-cam-v4'))).toBe(3598);
  });

  it('falls back to price when a product has no discount', () => {
    const doorbell = mustGet('wyze-duo-cam-doorbell');
    expect(unitOriginalPrice(doorbell)).toBe(unitPrice(doorbell));
  });

  it('supports free products with a non-free original price (Sense Hub)', () => {
    const hub = mustGet('wyze-sense-hub');
    expect(unitPrice(hub)).toBe(0);
    expect(unitOriginalPrice(hub)).toBe(2992);
  });
});

describe('line totals', () => {
  it('multiplies unit prices by quantity', () => {
    const pan = mustGet('wyze-cam-pan-v3');
    // Review panel reference: qty 2 → $47.98 current / $57.98 original.
    expect(lineTotal(pan, 2)).toBe(4798);
    expect(lineOriginalTotal(pan, 2)).toBe(5798);
  });

  it('is zero for zero quantity', () => {
    expect(lineTotal(mustGet('wyze-cam-v4'), 0)).toBe(0);
  });
});

describe('computeTotals', () => {
  // The seeded design state, expressed as line items.
  const seededQuantities = {
    'wyze-cam-v4:white': 1,
    'wyze-cam-pan-v3:white': 2,
    'cam-unlimited': 1,
    'wyze-sense-motion-sensor': 2,
    'wyze-sense-hub': 1,
    'wyze-microsd-256gb': 2,
  };

  it('reproduces the reference totals: $187.89 current, $238.81 original, $50.92 savings', () => {
    const totals = computeTotals(seededQuantities, resolveLineProduct);
    expect(totals.currentTotal).toBe(18789);
    expect(totals.originalTotal).toBe(23881);
    expect(totals.savings).toBe(5092);
  });

  it('includes the plan fee and responds to quantity changes', () => {
    const totals = computeTotals(
      { ...seededQuantities, 'wyze-cam-v4:white': 2 },
      resolveLineProduct,
    );
    expect(totals.currentTotal).toBe(18789 + 2798);
    expect(totals.savings).toBe(5092 + 800); // extra unit saves 35.98 − 27.98
  });

  it('counts independent variant lines of the same product separately', () => {
    const totals = computeTotals(
      { 'wyze-cam-v4:white': 2, 'wyze-cam-v4:black': 1 },
      resolveLineProduct,
    );
    expect(totals.currentTotal).toBe(3 * 2798);
  });

  it('ignores unknown line items and non-positive quantities', () => {
    const totals = computeTotals(
      { 'discontinued-product': 3, 'wyze-cam-v4:white': 0, 'wyze-cam-v4:grey': 1 },
      resolveLineProduct,
    );
    expect(totals.currentTotal).toBe(2798);
  });
});

describe('formatMoney', () => {
  it('formats cents as dollars', () => {
    expect(formatMoney(2798)).toBe('$27.98');
    expect(formatMoney(18789)).toBe('$187.89');
    expect(formatMoney(23881)).toBe('$238.81');
  });

  it('pads cents and handles zero and thousands', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(500)).toBe('$5.00');
    expect(formatMoney(5)).toBe('$0.05');
    expect(formatMoney(123456)).toBe('$1,234.56');
  });
});

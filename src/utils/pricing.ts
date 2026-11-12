import type { LineItemId, Product } from '../types';

/**
 * Pure pricing functions. All inputs/outputs are integer cents; formatting to
 * dollars happens only at the display boundary via formatMoney.
 */

export function unitPrice(product: Product): number {
  return product.price;
}

/** Original per-unit price; products without a discount fall back to price. */
export function unitOriginalPrice(product: Product): number {
  return product.originalPrice ?? product.price;
}

export function lineTotal(product: Product, quantity: number): number {
  return unitPrice(product) * quantity;
}

export function lineOriginalTotal(product: Product, quantity: number): number {
  return unitOriginalPrice(product) * quantity;
}

export interface BundleTotals {
  /** Σ price × qty over every selected line (plan included, shipping excluded). */
  currentTotal: number;
  /** Σ originalPrice × qty over the same lines. */
  originalTotal: number;
  /** originalTotal − currentTotal. */
  savings: number;
}

export function computeTotals(
  quantities: Record<LineItemId, number>,
  resolveProduct: (lineItemId: LineItemId) => Product | undefined,
): BundleTotals {
  let currentTotal = 0;
  let originalTotal = 0;
  for (const [lineItemId, qty] of Object.entries(quantities)) {
    if (qty <= 0) continue;
    const product = resolveProduct(lineItemId);
    if (!product) continue;
    currentTotal += lineTotal(product, qty);
    originalTotal += lineOriginalTotal(product, qty);
  }
  return { currentTotal, originalTotal, savings: originalTotal - currentTotal };
}

/** 2798 → "$27.98"; 23881 → "$238.81". */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars.toLocaleString('en-US')}.${remainder}`;
}

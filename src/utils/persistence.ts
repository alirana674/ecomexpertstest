import type { LineItemId } from '../types';
import { config, productsById } from '../data/catalog';
import { parseLineItemId, makeLineItemId, defaultVariantId } from './lineItems';
import { DEFAULT_MAX_QUANTITY } from './constants';

/**
 * Explicit "Save my system for later" persistence.
 *
 * Deliberately NOT auto-sync (e.g. zustand/persist): the design treats saving
 * as a user action, and auto-persisting every click could silently overwrite a
 * deliberately saved configuration. Loading never writes back to storage.
 */

export interface SavedSystemV1 {
  version: number;
  savedAt: string;
  quantities: Record<LineItemId, number>;
  activeVariant: Record<string, string>;
}

export interface RestoredState {
  quantities: Record<LineItemId, number>;
  activeVariant: Record<string, string>;
  savedAt: string;
}

export function saveSystem(
  quantities: Record<LineItemId, number>,
  activeVariant: Record<string, string>,
): boolean {
  const payload: SavedSystemV1 = {
    version: config.storageVersion,
    savedAt: new Date().toISOString(),
    quantities,
    activeVariant,
  };
  try {
    localStorage.setItem(config.storageKey, JSON.stringify(payload));
    return true;
  } catch {
    // Storage unavailable (private mode, quota, disabled) — saving fails
    // gracefully; the app keeps working without persistence.
    return false;
  }
}

/**
 * Loads and validates a saved system. Returns null when nothing valid is
 * stored, so the caller falls back to seeded defaults. Validation against the
 * live catalog protects against stale data from older product sets:
 *  - unknown products/variants are dropped
 *  - quantities are coerced to integers and clamped to [min, max]
 *  - required products are restored to at least their minimum quantity
 */
export function loadSavedSystem(): RestoredState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(config.storageKey);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const data = parsed as Partial<SavedSystemV1>;
  if (data.version !== config.storageVersion) return null;
  if (typeof data.quantities !== 'object' || data.quantities === null) return null;

  const quantities: Record<LineItemId, number> = {};
  for (const [lineItemId, value] of Object.entries(data.quantities)) {
    const { productId, variantId } = parseLineItemId(lineItemId);
    const product = productsById.get(productId);
    if (!product) continue;
    if (variantId) {
      if (!product.variants?.some((v) => v.id === variantId)) continue;
    } else if (product.variants) {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const max = product.maxQuantity ?? DEFAULT_MAX_QUANTITY;
    const qty = Math.min(Math.max(Math.floor(value), 0), max);
    if (qty > 0) quantities[lineItemId] = qty;
  }

  // Required products must survive restoration even if the saved data lost them.
  for (const product of productsById.values()) {
    const min = product.minQuantity ?? 0;
    if (!product.required || min <= 0) continue;
    const id = makeLineItemId(product.id, defaultVariantId(product));
    if ((quantities[id] ?? 0) < min) quantities[id] = min;
  }

  const activeVariant: Record<string, string> = {};
  if (typeof data.activeVariant === 'object' && data.activeVariant !== null) {
    for (const [productId, variantId] of Object.entries(data.activeVariant)) {
      const product = productsById.get(productId);
      if (
        product?.variants?.some((v) => v.id === variantId) &&
        typeof variantId === 'string'
      ) {
        activeVariant[productId] = variantId;
      }
    }
  }

  return {
    quantities,
    activeVariant,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
  };
}

export function clearSavedSystem(): void {
  try {
    localStorage.removeItem(config.storageKey);
  } catch {
    // ignore — nothing to clear if storage is unavailable
  }
}

export function hasSavedSystem(): boolean {
  try {
    return localStorage.getItem(config.storageKey) !== null;
  } catch {
    return false;
  }
}

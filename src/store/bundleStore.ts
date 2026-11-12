import { create } from 'zustand';
import type { LineItemId, Product, StepId } from '../types';
import { config, products, productsById } from '../data/catalog';
import { defaultVariantId, makeLineItemId, parseLineItemId } from '../utils/lineItems';
import { DEFAULT_MAX_QUANTITY } from '../utils/constants';
import * as persistence from '../utils/persistence';

/**
 * Single source of truth for the bundle. Holds only user intent — quantities,
 * variant choices, accordion position. Everything else (line totals, grouping,
 * counts, savings) is derived in utils/selectors.ts and utils/pricing.ts so a
 * value can never be stored twice and drift.
 */

export interface BundleState {
  /** Quantity per line item. Only entries > 0 are kept. */
  quantities: Record<LineItemId, number>;
  /** Variant each product's card currently displays (productId → variantId). */
  activeVariant: Record<string, string>;
  /** Expanded accordion step; null = all collapsed (mobile initial state). */
  activeStep: StepId | null;
  /** ISO timestamp of the last explicit save, null when never saved. */
  lastSavedAt: string | null;

  setQuantity: (lineItemId: LineItemId, quantity: number) => void;
  increment: (lineItemId: LineItemId) => void;
  decrement: (lineItemId: LineItemId) => void;
  /** Changes which variant a card displays. Never touches any quantity. */
  selectVariant: (productId: string, variantId: string) => void;
  /** Radio-like selection: selects this product, deselects same-mode siblings in its step. */
  selectSingle: (productId: string) => void;
  setActiveStep: (step: StepId | null) => void;
  /** Expands the step, or collapses it when it is already expanded. */
  toggleStep: (step: StepId) => void;
  /** Advances to the step after the currently expanded one. */
  goToNextStep: () => void;
  /** Explicit "Save my system for later". Returns false when storage failed. */
  saveSystem: () => boolean;
  /** Restores a valid saved system if present. Never writes to storage. */
  hydrateFromStorage: () => boolean;
  resetToDefaults: () => void;
}

function clampQuantity(product: Product, requested: number): number {
  const min = product.minQuantity ?? 0;
  const max = product.maxQuantity ?? DEFAULT_MAX_QUANTITY;
  return Math.min(Math.max(Math.floor(requested), min), max);
}

/** Seeds quantities and card variants from products.json (the initial design state). */
function buildDefaults(): {
  quantities: Record<LineItemId, number>;
  activeVariant: Record<string, string>;
} {
  const quantities: Record<LineItemId, number> = {};
  const activeVariant: Record<string, string> = {};
  for (const product of products) {
    const defVariant = defaultVariantId(product);
    if (defVariant) activeVariant[product.id] = defVariant;
    const initial = product.initialQuantity;
    if (typeof initial === 'number' && initial > 0) {
      quantities[makeLineItemId(product.id)] = initial;
    } else if (typeof initial === 'object') {
      for (const [variantId, qty] of Object.entries(initial)) {
        if (qty > 0) quantities[makeLineItemId(product.id, variantId)] = qty;
      }
    }
  }
  return { quantities, activeVariant };
}

function applyQuantity(
  quantities: Record<LineItemId, number>,
  lineItemId: LineItemId,
  requested: number,
): Record<LineItemId, number> {
  const { productId } = parseLineItemId(lineItemId);
  const product = productsById.get(productId);
  if (!product) return quantities;
  const next = { ...quantities };
  const clamped = clampQuantity(product, requested);
  if (clamped <= 0) {
    delete next[lineItemId];
  } else {
    next[lineItemId] = clamped;
  }
  return next;
}

export const useBundleStore = create<BundleState>()((set, get) => ({
  ...buildDefaults(),
  activeStep: 'cameras',
  lastSavedAt: null,

  setQuantity: (lineItemId, quantity) =>
    set((state) => ({
      quantities: applyQuantity(state.quantities, lineItemId, quantity),
    })),

  increment: (lineItemId) =>
    set((state) => ({
      quantities: applyQuantity(
        state.quantities,
        lineItemId,
        (state.quantities[lineItemId] ?? 0) + 1,
      ),
    })),

  decrement: (lineItemId) =>
    set((state) => ({
      quantities: applyQuantity(
        state.quantities,
        lineItemId,
        (state.quantities[lineItemId] ?? 0) - 1,
      ),
    })),

  selectVariant: (productId, variantId) => {
    const product = productsById.get(productId);
    if (!product?.variants?.some((v) => v.id === variantId)) return;
    set((state) => ({
      activeVariant: { ...state.activeVariant, [productId]: variantId },
    }));
  },

  selectSingle: (productId) => {
    const product = productsById.get(productId);
    if (!product || product.selectionMode !== 'single') return;
    set((state) => {
      const quantities = { ...state.quantities };
      for (const sibling of products) {
        if (sibling.step === product.step && sibling.selectionMode === 'single') {
          delete quantities[makeLineItemId(sibling.id)];
        }
      }
      quantities[makeLineItemId(product.id)] = 1;
      return { quantities };
    });
  },

  setActiveStep: (step) => set({ activeStep: step }),

  toggleStep: (step) =>
    set((state) => ({ activeStep: state.activeStep === step ? null : step })),

  goToNextStep: () => {
    const { activeStep } = get();
    if (!activeStep) return;
    const index = config.steps.findIndex((s) => s.id === activeStep);
    const next = config.steps[index + 1];
    if (next) set({ activeStep: next.id });
  },

  saveSystem: () => {
    const { quantities, activeVariant } = get();
    const ok = persistence.saveSystem(quantities, activeVariant);
    if (ok) set({ lastSavedAt: new Date().toISOString() });
    return ok;
  },

  hydrateFromStorage: () => {
    const restored = persistence.loadSavedSystem();
    if (!restored) return false;
    set((state) => ({
      quantities: restored.quantities,
      // Restored choices win; catalog defaults fill any products the save predates.
      activeVariant: { ...state.activeVariant, ...restored.activeVariant },
      lastSavedAt: restored.savedAt || null,
    }));
    return true;
  },

  resetToDefaults: () =>
    set({ ...buildDefaults(), activeStep: 'cameras', lastSavedAt: null }),
}));

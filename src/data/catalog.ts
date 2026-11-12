import type { BundleConfig, Product, StepId } from '../types';
import productsJson from './products.json';
import configJson from './config.json';

const STEP_IDS: readonly StepId[] = ['cameras', 'plan', 'sensors', 'protection'];
const CATEGORIES = ['cameras', 'sensors', 'accessories', 'plan'] as const;

function fail(productId: string, reason: string): never {
  throw new Error(`Invalid product data for "${productId}": ${reason}`);
}

/**
 * Validates raw JSON into typed products at module load. Fails fast and loudly
 * on malformed data so mistakes surface in development, not as NaN totals.
 */
function validateProduct(raw: unknown): Product {
  const p = raw as Product;
  if (!p.id || typeof p.id !== 'string') fail(String(p.id), 'missing id');
  if (!STEP_IDS.includes(p.step)) fail(p.id, `unknown step "${p.step}"`);
  if (!CATEGORIES.includes(p.category)) fail(p.id, `unknown category "${p.category}"`);
  if (!p.title) fail(p.id, 'missing title');
  if (!Number.isInteger(p.price) || p.price < 0) {
    fail(p.id, 'price must be non-negative integer cents');
  }
  if (
    p.originalPrice !== undefined &&
    (!Number.isInteger(p.originalPrice) || p.originalPrice < p.price)
  ) {
    fail(p.id, 'originalPrice must be integer cents and >= price');
  }
  if (p.selectionMode !== 'quantity' && p.selectionMode !== 'single') {
    fail(p.id, `unknown selectionMode "${p.selectionMode}"`);
  }
  if (p.variants !== undefined) {
    if (p.variants.length === 0) fail(p.id, 'variants array may not be empty');
    const ids = new Set(p.variants.map((v) => v.id));
    if (ids.size !== p.variants.length) fail(p.id, 'duplicate variant ids');
    if (p.defaultVariantId !== undefined && !ids.has(p.defaultVariantId)) {
      fail(p.id, `defaultVariantId "${p.defaultVariantId}" not in variants`);
    }
    if (typeof p.initialQuantity === 'number' && p.initialQuantity !== 0) {
      fail(p.id, 'variant products must seed quantities per variant');
    }
    if (typeof p.initialQuantity === 'object') {
      for (const vid of Object.keys(p.initialQuantity)) {
        if (!ids.has(vid))
          fail(p.id, `initialQuantity references unknown variant "${vid}"`);
      }
    }
  } else if (typeof p.initialQuantity === 'object') {
    fail(p.id, 'variant-keyed initialQuantity on a product without variants');
  }
  const min = p.minQuantity ?? 0;
  if (p.required && min < 1) fail(p.id, 'required products need minQuantity >= 1');
  return p;
}

/** Catalog products in display order (order in products.json is authoritative). */
export const products: Product[] = (productsJson.products as unknown[]).map(
  validateProduct,
);

export const productsById: ReadonlyMap<string, Product> = new Map(
  products.map((p) => [p.id, p]),
);

export const config: BundleConfig = configJson as BundleConfig;

export function getProduct(id: string): Product | undefined {
  return productsById.get(id);
}

export function productsForStep(step: StepId): Product[] {
  return products.filter((p) => p.step === step);
}

import type { LineItemId, Product } from '../types';

const SEPARATOR = ':';

/**
 * Line-item identity is the keystone of variant-independent quantities:
 * every (product, variant) pair owns exactly one entry in the quantities map.
 */
export function makeLineItemId(productId: string, variantId?: string): LineItemId {
  return variantId ? `${productId}${SEPARATOR}${variantId}` : productId;
}

export function parseLineItemId(lineItemId: LineItemId): {
  productId: string;
  variantId?: string;
} {
  const sep = lineItemId.indexOf(SEPARATOR);
  if (sep === -1) return { productId: lineItemId };
  return {
    productId: lineItemId.slice(0, sep),
    variantId: lineItemId.slice(sep + 1),
  };
}

/** All line-item ids a product can produce (one per variant, or just itself). */
export function lineItemIdsForProduct(product: Product): LineItemId[] {
  if (product.variants) {
    return product.variants.map((v) => makeLineItemId(product.id, v.id));
  }
  return [makeLineItemId(product.id)];
}

/** The variant a product's card should show when no explicit choice was made. */
export function defaultVariantId(product: Product): string | undefined {
  if (!product.variants || product.variants.length === 0) return undefined;
  return product.defaultVariantId ?? product.variants[0]?.id;
}

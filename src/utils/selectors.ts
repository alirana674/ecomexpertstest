import type {
  LineItemId,
  Product,
  ReviewCategory,
  SelectedLineItem,
  StepId,
} from '../types';
import { products, productsById } from '../data/catalog';
import { lineOriginalTotal, lineTotal } from './pricing';
import { makeLineItemId, parseLineItemId } from './lineItems';

/**
 * Pure derivation functions over (catalog, quantities). The builder cards and
 * the review panel both read through these, which is what guarantees the two
 * columns can never disagree: there is no second copy of any value to drift.
 */

export function resolveLineProduct(lineItemId: LineItemId): Product | undefined {
  const { productId, variantId } = parseLineItemId(lineItemId);
  const product = productsById.get(productId);
  if (!product) return undefined;
  if (variantId && !product.variants?.some((v) => v.id === variantId)) {
    return undefined;
  }
  if (!variantId && product.variants) return undefined;
  return product;
}

/**
 * Every selected line (qty > 0) resolved against the catalog, in catalog order
 * with each product's variants in variant order — so Red and Blue of the same
 * camera appear as separate adjacent review rows.
 */
export function selectedLineItems(
  quantities: Record<LineItemId, number>,
): SelectedLineItem[] {
  const items: SelectedLineItem[] = [];
  for (const product of products) {
    const variantIds = product.variants?.map((v) => v.id) ?? [undefined];
    for (const variantId of variantIds) {
      const lineItemId = makeLineItemId(product.id, variantId);
      const quantity = quantities[lineItemId] ?? 0;
      if (quantity <= 0) continue;
      items.push({
        lineItemId,
        product,
        variant: product.variants?.find((v) => v.id === variantId),
        quantity,
        lineTotal: lineTotal(product, quantity),
        lineOriginalTotal: lineOriginalTotal(product, quantity),
      });
    }
  }
  return items;
}

export const CATEGORY_ORDER: readonly ReviewCategory[] = [
  'cameras',
  'sensors',
  'accessories',
  'plan',
];

export function groupByCategory(
  items: SelectedLineItem[],
): { category: ReviewCategory; items: SelectedLineItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.product.category === category),
  })).filter((group) => group.items.length > 0);
}

/**
 * Distinct selected products per step (NOT summed quantities): a camera with
 * two variants selected still counts once, matching the reference "2 selected".
 */
export function selectedCountForStep(
  step: StepId,
  quantities: Record<LineItemId, number>,
): number {
  const selectedProductIds = new Set<string>();
  for (const [lineItemId, qty] of Object.entries(quantities)) {
    if (qty <= 0) continue;
    const product = resolveLineProduct(lineItemId);
    if (product?.step === step) selectedProductIds.add(product.id);
  }
  return selectedProductIds.size;
}

/** Quantity the card's stepper should display for its currently shown variant. */
export function cardQuantity(
  product: Product,
  activeVariantId: string | undefined,
  quantities: Record<LineItemId, number>,
): number {
  return quantities[makeLineItemId(product.id, activeVariantId)] ?? 0;
}

/** A product is "selected" when any of its lines has quantity > 0. */
export function isProductSelected(
  product: Product,
  quantities: Record<LineItemId, number>,
): boolean {
  const variantIds = product.variants?.map((v) => v.id) ?? [undefined];
  return variantIds.some((vid) => (quantities[makeLineItemId(product.id, vid)] ?? 0) > 0);
}

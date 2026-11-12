/**
 * Core data models for the bundle builder.
 *
 * All monetary values are integer cents (e.g. $27.98 → 2798) so totals never
 * suffer floating-point drift. Formatting happens at the display boundary only.
 */

/** Builder accordion steps, in order. */
export type StepId = 'cameras' | 'plan' | 'sensors' | 'protection';

/** Review panel grouping, in display order. */
export type ReviewCategory = 'cameras' | 'sensors' | 'accessories' | 'plan';

export interface ProductVariant {
  id: string;
  /** Display name, e.g. "White". */
  name: string;
  /**
   * Full-size variant image shown in the product card and review panel;
   * falls back to the product image when absent.
   */
  image?: string;
  /** Small chip/swatch thumbnail (supplied 48px assets); falls back to image. */
  thumb?: string;
}

export interface Product {
  id: string;
  step: StepId;
  category: ReviewCategory;
  title: string;
  /** Overrides `title` in the review panel, e.g. "Wyze Sense Hub (Required)". */
  reviewTitle?: string;
  description?: string;
  /** Public path to the product image; absent when no asset was supplied. */
  image?: string;
  /**
   * Rendered size (px) of the card image area for this product. Lets small
   * logo-style assets (e.g. the plan shield) render at a sensible size
   * without product-specific component logic. Defaults to the standard size.
   */
  cardImageSize?: number;
  learnMoreUrl?: string;
  /** Discount badge text, e.g. "Save 22%". Omitted products show no badge. */
  badge?: string;
  /** Authoritative per-unit current price in cents. Drives ALL calculations. */
  price: number;
  /** Per-unit original price in cents; when present it renders struck through. */
  originalPrice?: number;
  /** Suffix displayed after prices, e.g. "/mo" for subscription plans. */
  priceNote?: string;
  /**
   * 'quantity': stepper-controlled multi-quantity product.
   * 'single': radio-like selection within its step (e.g. plans).
   */
  selectionMode: 'quantity' | 'single';
  /** Required products cannot drop below `minQuantity`. */
  required?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  variants?: ProductVariant[];
  /** Variant shown on the card initially; defaults to the first variant. */
  defaultVariantId?: string;
  /**
   * Seeded starting quantity. A plain number for variant-less products; an
   * object keyed by variant id for products with variants.
   */
  initialQuantity?: number | Record<string, number>;
  /** Data-level documentation (e.g. known design discrepancies). Not rendered. */
  dataNotes?: string;
}

export interface StepConfig {
  id: StepId;
  title: string;
  /** Icon key resolved by the UI layer (kept out of data components). */
  icon: string;
}

export interface ShippingConfig {
  label: string;
  originalPrice: number;
  price: number;
}

export interface BundleConfig {
  steps: StepConfig[];
  shipping: ShippingConfig;
  /**
   * Literal financing text from the design. The calculation rule behind
   * "$19.19/mo" is unconfirmed, so this is static configuration by design.
   */
  financingLabel: string;
  storageKey: string;
  storageVersion: number;
}

/**
 * Identifies one orderable line: `productId` for variant-less products,
 * `productId:variantId` for a specific variant. Every line item carries its
 * own independent quantity.
 */
export type LineItemId = string;

/** A selected line resolved against the catalog. */
export interface SelectedLineItem {
  lineItemId: LineItemId;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  /** price × quantity, cents */
  lineTotal: number;
  /** originalPrice (or price) × quantity, cents */
  lineOriginalTotal: number;
}

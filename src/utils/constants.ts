/**
 * Upper bound for any line quantity. The design shows no maximum; this cap
 * exists to keep totals sane and steppers bounded. Products may override it
 * via maxQuantity in products.json.
 */
export const DEFAULT_MAX_QUANTITY = 99;

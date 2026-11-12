import type { SelectedLineItem } from '../../types';
import { useBundleStore } from '../../store/bundleStore';
import { DEFAULT_MAX_QUANTITY } from '../../utils/constants';
import { QuantityStepper } from '../common/QuantityStepper';
import { PriceDisplay } from '../common/PriceDisplay';
import { ProductThumb } from '../common/ProductThumb';
import styles from './ReviewItem.module.css';

interface ReviewItemProps {
  item: SelectedLineItem;
  /** Append the variant name when several variants of one product are selected. */
  disambiguateVariant: boolean;
}

/**
 * One selected line in the review panel. Its stepper drives the SAME store
 * line item as the product card's stepper, so changes propagate both ways.
 */
export function ReviewItem({ item, disambiguateVariant }: ReviewItemProps) {
  const increment = useBundleStore((s) => s.increment);
  const decrement = useBundleStore((s) => s.decrement);
  const { product, variant, quantity, lineItemId } = item;

  const name = product.reviewTitle ?? product.title;
  const label = variant && disambiguateVariant ? `${name} – ${variant.name}` : name;

  return (
    <div className={styles.item}>
      {/* Full-size imagery only: per-color image when supplied, else the base
          product shot (the 48px chip thumbs are for variant chips only —
          ReviewMobile.png shows the full product image in review rows). */}
      <ProductThumb src={variant?.image ?? product.image} alt={label} size={48} />
      <span className={styles.name}>{label}</span>
      <QuantityStepper
        quantity={quantity}
        min={product.minQuantity ?? 0}
        max={product.maxQuantity ?? DEFAULT_MAX_QUANTITY}
        onIncrement={() => increment(lineItemId)}
        onDecrement={() => decrement(lineItemId)}
        itemLabel={label}
        size="compact"
      />
      <PriceDisplay
        price={item.lineTotal}
        originalPrice={item.lineOriginalTotal}
        context="review"
        freeLabel
      />
    </div>
  );
}

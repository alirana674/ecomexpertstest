import type { Product } from '../../types';
import styles from './VariantSelector.module.css';

interface VariantSelectorProps {
  product: Product;
  activeVariantId: string | undefined;
  onSelect: (variantId: string) => void;
}

/**
 * Color/variant chips. Selecting a chip only changes which variant the card
 * DISPLAYS — quantities always live per (product, variant) line in the store,
 * so switching never resets or transfers another variant's quantity.
 *
 * Chip thumbnails use the supplied per-color chip assets (variant.thumb),
 * falling back to the variant's full image, then the base product image.
 */
export function VariantSelector({
  product,
  activeVariantId,
  onSelect,
}: VariantSelectorProps) {
  if (!product.variants || product.variants.length === 0) return null;
  return (
    <div
      className={styles.variants}
      role="radiogroup"
      aria-label={`${product.title} color`}
    >
      {product.variants.map((variant) => {
        const selected = variant.id === activeVariantId;
        const thumb = variant.thumb ?? variant.image ?? product.image;
        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.chip} ${selected ? styles.selected : ''}`}
            onClick={() => onSelect(variant.id)}
          >
            {thumb && <img src={thumb} alt="" aria-hidden className={styles.thumb} />}
            <span>{variant.name}</span>
          </button>
        );
      })}
    </div>
  );
}

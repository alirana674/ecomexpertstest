import type { Product } from '../../types';
import { useBundleStore } from '../../store/bundleStore';
import { cardQuantity, isProductSelected } from '../../utils/selectors';
import { makeLineItemId } from '../../utils/lineItems';
import { DEFAULT_MAX_QUANTITY } from '../../utils/constants';
import { QuantityStepper } from '../common/QuantityStepper';
import { PriceDisplay } from '../common/PriceDisplay';
import { ProductThumb } from '../common/ProductThumb';
import { VariantSelector } from './VariantSelector';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

/**
 * Data-driven product card: every element (badge, description, Learn More,
 * variants, stepper, prices) renders conditionally from product data. The
 * stepper operates on the line item of the card's ACTIVE variant only.
 */
export function ProductCard({ product }: ProductCardProps) {
  const quantities = useBundleStore((s) => s.quantities);
  const activeVariantId = useBundleStore((s) => s.activeVariant[product.id]);
  const increment = useBundleStore((s) => s.increment);
  const decrement = useBundleStore((s) => s.decrement);
  const selectVariant = useBundleStore((s) => s.selectVariant);
  const selectSingle = useBundleStore((s) => s.selectSingle);

  const lineItemId = makeLineItemId(product.id, activeVariantId);
  const quantity = cardQuantity(product, activeVariantId, quantities);
  const selected = isProductSelected(product, quantities);
  const isSingle = product.selectionMode === 'single';
  // The card image follows the selected variant when a full-size per-color
  // asset exists; otherwise it keeps the base product image (documented).
  const activeVariant = product.variants?.find((v) => v.id === activeVariantId);
  const cardImage = activeVariant?.image ?? product.image;

  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      aria-label={product.title}
    >
      {product.badge && <span className={styles.badge}>{product.badge}</span>}

      <div className={styles.imageWrap}>
        <ProductThumb
          src={cardImage}
          alt={product.title}
          size={product.cardImageSize ?? 88}
        />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{product.title}</h3>

        {product.description && (
          <p className={styles.description}>
            {product.description}{' '}
            {product.learnMoreUrl && (
              <a className={styles.learnMore} href={product.learnMoreUrl}>
                Learn More
              </a>
            )}
          </p>
        )}

        <VariantSelector
          product={product}
          activeVariantId={activeVariantId}
          onSelect={(variantId) => selectVariant(product.id, variantId)}
        />

        <div className={styles.footer}>
          {isSingle ? (
            <button
              type="button"
              className={`${styles.selectButton} ${selected ? styles.selectButtonActive : ''}`}
              aria-pressed={selected}
              onClick={() => selectSingle(product.id)}
            >
              {selected ? 'Selected' : 'Select'}
            </button>
          ) : (
            <QuantityStepper
              quantity={quantity}
              min={product.minQuantity ?? 0}
              max={product.maxQuantity ?? DEFAULT_MAX_QUANTITY}
              onIncrement={() => increment(lineItemId)}
              onDecrement={() => decrement(lineItemId)}
              itemLabel={product.title}
            />
          )}
          <PriceDisplay
            price={product.price}
            originalPrice={product.originalPrice}
            priceNote={product.priceNote}
            context="card"
            freeLabel
          />
        </div>
      </div>
    </article>
  );
}

import { formatMoney } from '../../utils/pricing';
import styles from './PriceDisplay.module.css';

interface PriceDisplayProps {
  /** Current price in cents. */
  price: number;
  /** Original price in cents; struck through when greater than price. */
  originalPrice?: number;
  /** Suffix like "/mo". */
  priceNote?: string;
  /**
   * 'card'   — red strikethrough, dark current (product cards).
   * 'review' — gray strikethrough, purple current (review panel).
   */
  context: 'card' | 'review';
  /** Renders "FREE" instead of $0.00 for zero prices (shipping, Sense Hub). */
  freeLabel?: boolean;
  /** Stacks original above current (desktop card/review style) vs inline. */
  layout?: 'stacked' | 'inline';
}

export function PriceDisplay({
  price,
  originalPrice,
  priceNote = '',
  context,
  freeLabel = false,
  layout = 'stacked',
}: PriceDisplayProps) {
  const hasDiscount = originalPrice !== undefined && originalPrice > price;
  const current = price === 0 && freeLabel ? 'FREE' : `${formatMoney(price)}${priceNote}`;
  return (
    <span
      className={`${styles.prices} ${layout === 'inline' ? styles.inline : ''} ${
        context === 'review' ? styles.review : styles.card
      }`}
    >
      {hasDiscount && (
        <s className={styles.original}>
          {formatMoney(originalPrice)}
          {priceNote}
        </s>
      )}
      <span className={styles.current}>{current}</span>
    </span>
  );
}

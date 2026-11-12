import { Minus, Plus } from 'lucide-react';
import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Accessible context, e.g. the product name. */
  itemLabel: string;
  /** Lower bound; the minus button disables at it (0 default, 1 for required). */
  min?: number;
  max?: number;
  /** Compact review-panel sizing. */
  size?: 'default' | 'compact';
}

/**
 * The single stepper used by BOTH product cards and review rows. Sharing the
 * component (and the store actions behind it) is what keeps the two columns
 * structurally synchronized.
 */
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  itemLabel,
  min = 0,
  max = 99,
  size = 'default',
}: QuantityStepperProps) {
  const atMin = quantity <= min;
  const atMax = quantity >= max;
  return (
    <div
      className={`${styles.stepper} ${size === 'compact' ? styles.compact : ''}`}
      role="group"
      aria-label={`Quantity of ${itemLabel}`}
    >
      <button
        type="button"
        className={styles.button}
        onClick={onDecrement}
        disabled={atMin}
        aria-label={`Decrease quantity of ${itemLabel}`}
      >
        <Minus aria-hidden size={14} strokeWidth={2.5} />
      </button>
      <span className={styles.value} aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={onIncrement}
        disabled={atMax}
        aria-label={`Increase quantity of ${itemLabel}`}
      >
        <Plus aria-hidden size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

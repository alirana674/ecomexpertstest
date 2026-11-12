import { useEffect, useRef } from 'react';
import { formatMoney } from '../../utils/pricing';
import styles from './CheckoutDialog.module.css';

interface CheckoutDialogProps {
  total: number;
  onClose: () => void;
}

/**
 * Checkout confirmation only — payment processing is outside the assignment
 * scope (per requirements).
 */
export function CheckoutDialog({ total, onClose }: CheckoutDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="checkout-dialog-title" className={styles.title}>
          Checkout
        </h2>
        <p className={styles.body}>
          Your security bundle total is <strong>{formatMoney(total)}</strong>.
        </p>
        <p className={styles.note}>
          This demo does not process payments — checkout is outside the scope of this
          assignment.
        </p>
        <button
          ref={closeRef}
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

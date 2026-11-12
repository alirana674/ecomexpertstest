import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

/** Transient confirmation (e.g. after "Save my system for later"). */
export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <output className={styles.toast} aria-live="polite">
      {message}
    </output>
  );
}

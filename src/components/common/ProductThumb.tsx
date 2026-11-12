import { Package } from 'lucide-react';
import styles from './ProductThumb.module.css';

interface ProductThumbProps {
  /** Public path to the image. Undefined → clean neutral placeholder. */
  src?: string;
  alt: string;
  size?: number;
}

/**
 * Product imagery with a consistent placeholder for products whose assets were
 * not supplied (Motion Sensor, Sense Hub, MicroSD — see README). Swapping a
 * placeholder for a real image is a products.json change only.
 */
export function ProductThumb({ src, alt, size = 48 }: ProductThumbProps) {
  if (src) {
    return (
      <span className={styles.thumb} style={{ width: size, height: size }}>
        <img src={src} alt={alt} loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className={`${styles.thumb} ${styles.placeholder}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${alt} (image unavailable)`}
    >
      <Package aria-hidden size={Math.round(size * 0.45)} strokeWidth={1.5} />
    </span>
  );
}

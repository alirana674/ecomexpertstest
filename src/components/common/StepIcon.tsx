import styles from './StepIcon.module.css';

interface StepIconProps {
  /** Public path of the supplied step icon asset (from config.json). */
  icon: string;
}

/** Step heading icon — supplied design assets, sized responsively via CSS. */
export function StepIcon({ icon }: StepIconProps) {
  return <img className={styles.icon} src={icon} alt="" aria-hidden />;
}

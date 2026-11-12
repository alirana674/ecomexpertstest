import { config } from '../../data/catalog';
import { BuilderStep } from './BuilderStep';
import styles from './BuilderAccordion.module.css';

/** The four-step builder, driven entirely by config.json step definitions. */
export function BuilderAccordion() {
  return (
    <div className={styles.accordion}>
      {config.steps.map((step, index) => (
        <BuilderStep key={step.id} step={step} index={index} />
      ))}
    </div>
  );
}

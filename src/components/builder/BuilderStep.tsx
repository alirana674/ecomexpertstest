import type { StepConfig } from '../../types';
import { config, productsForStep } from '../../data/catalog';
import { useBundleStore } from '../../store/bundleStore';
import { selectedCountForStep } from '../../utils/selectors';
import { StepIcon } from '../common/StepIcon';
import { ProductCard } from '../products/ProductCard';
import styles from './BuilderStep.module.css';

interface BuilderStepProps {
  step: StepConfig;
  index: number;
}

export function BuilderStep({ step, index }: BuilderStepProps) {
  const quantities = useBundleStore((s) => s.quantities);
  const activeStep = useBundleStore((s) => s.activeStep);
  const toggleStep = useBundleStore((s) => s.toggleStep);
  const goToNextStep = useBundleStore((s) => s.goToNextStep);

  const expanded = activeStep === step.id;
  const count = selectedCountForStep(step.id, quantities);
  const stepProducts = productsForStep(step.id);
  const nextStep = config.steps[index + 1];
  const headerId = `step-header-${step.id}`;
  const panelId = `step-panel-${step.id}`;

  return (
    <section className={`${styles.step} ${expanded ? styles.expanded : ''}`}>
      <p className={styles.stepLabel}>
        STEP {index + 1} OF {config.steps.length}
      </p>

      <h2 className={styles.headerWrap}>
        <button
          type="button"
          id={headerId}
          className={styles.header}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggleStep(step.id)}
        >
          <StepIcon icon={step.icon} />
          <span className={styles.title}>{step.title}</span>
          <span className={styles.headerRight}>
            <span className={`${styles.count} ${!expanded ? styles.countCollapsed : ''}`}>
              {count} selected
            </span>
            <span className={styles.chevron} aria-hidden>
              {expanded ? '▴' : '▾'}
            </span>
          </span>
        </button>
      </h2>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className={styles.body}
        >
          <div className={styles.grid}>
            {stepProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {nextStep && (
            <button type="button" className={styles.nextButton} onClick={goToNextStep}>
              Next: {nextStep.title}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

import { useEffect } from 'react';
import { BuilderAccordion } from './components/builder/BuilderAccordion';
import { ReviewPanel } from './components/review/ReviewPanel';
import { useBundleStore } from './store/bundleStore';
import styles from './App.module.css';

const MOBILE_BREAKPOINT = 700;

function App() {
  // Mobile artboard shows every step collapsed initially; desktop/tablet
  // start with Step 1 expanded (store default). Applied once on mount.
  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      useBundleStore.getState().setActiveStep(null);
    }
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.mobileHeading}>Let&rsquo;s get started!</h1>
      <main className={styles.layout}>
        <div className={styles.builderColumn}>
          <BuilderAccordion />
        </div>
        <aside className={styles.reviewColumn}>
          <ReviewPanel />
        </aside>
      </main>
    </div>
  );
}

export default App;

import { beforeEach, describe, expect, it } from 'vitest';
import { useBundleStore } from './bundleStore';
import { selectedCountForStep } from '../utils/selectors';
import { computeTotals } from '../utils/pricing';
import { resolveLineProduct } from '../utils/selectors';

/**
 * The critical scenario from the assignment: every variant keeps its own
 * quantity; switching the card's displayed variant never moves quantities.
 */

beforeEach(() => {
  localStorage.clear();
  useBundleStore.getState().resetToDefaults();
});

const state = () => useBundleStore.getState();

describe('initial seeded state', () => {
  it('matches the reference design selections', () => {
    expect(state().quantities).toEqual({
      'wyze-cam-v4:white': 1,
      'wyze-cam-pan-v3:white': 2,
      'cam-unlimited': 1,
      'wyze-sense-motion-sensor': 2,
      'wyze-sense-hub': 1,
      'wyze-microsd-256gb': 2,
    });
    expect(state().activeStep).toBe('cameras');
  });

  it('seeds each variant product with its default display variant', () => {
    expect(state().activeVariant['wyze-cam-v4']).toBe('white');
    expect(state().activeVariant['wyze-cam-pan-v3']).toBe('white');
  });

  it('produces the reference totals from seeded data', () => {
    const totals = computeTotals(state().quantities, resolveLineProduct);
    expect(totals.currentTotal).toBe(18789);
    expect(totals.originalTotal).toBe(23881);
    expect(totals.savings).toBe(5092);
  });
});

describe('quantity actions', () => {
  it('increments and decrements a line', () => {
    state().increment('wyze-cam-v4:white');
    expect(state().quantities['wyze-cam-v4:white']).toBe(2);
    state().decrement('wyze-cam-v4:white');
    expect(state().quantities['wyze-cam-v4:white']).toBe(1);
  });

  it('removes the entry when a line reaches zero', () => {
    state().decrement('wyze-cam-v4:white');
    expect(state().quantities).not.toHaveProperty('wyze-cam-v4:white');
  });

  it('never goes below zero', () => {
    state().setQuantity('wyze-duo-cam-doorbell', -5);
    expect(state().quantities).not.toHaveProperty('wyze-duo-cam-doorbell');
  });

  it('clamps to the maximum quantity', () => {
    state().setQuantity('wyze-cam-v4:white', 500);
    expect(state().quantities['wyze-cam-v4:white']).toBe(99);
  });

  it('ignores unknown products and unknown variants', () => {
    state().setQuantity('not-a-product', 3);
    state().increment('not-a-product');
    expect(state().quantities).not.toHaveProperty('not-a-product');
  });
});

describe('required product minimum (Wyze Sense Hub)', () => {
  it('cannot be decremented below its minimum of 1', () => {
    state().decrement('wyze-sense-hub');
    expect(state().quantities['wyze-sense-hub']).toBe(1);
  });

  it('cannot be removed via setQuantity(0)', () => {
    state().setQuantity('wyze-sense-hub', 0);
    expect(state().quantities['wyze-sense-hub']).toBe(1);
  });

  it('can still be increased and decreased back down to the minimum', () => {
    state().increment('wyze-sense-hub');
    expect(state().quantities['wyze-sense-hub']).toBe(2);
    state().decrement('wyze-sense-hub');
    expect(state().quantities['wyze-sense-hub']).toBe(1);
  });
});

describe('variant-independent quantities (critical requirement)', () => {
  it('each variant keeps its own quantity; switching variants moves nothing', () => {
    // White starts at 1; add another → 2 (the "Red: 2" of the spec example).
    state().increment('wyze-cam-v4:white');
    expect(state().quantities['wyze-cam-v4:white']).toBe(2);

    // Switch the card to Black and add 1 (the "Blue: 1").
    state().selectVariant('wyze-cam-v4', 'black');
    state().increment('wyze-cam-v4:black');

    // Both lines coexist, untouched by the switch.
    expect(state().quantities['wyze-cam-v4:white']).toBe(2);
    expect(state().quantities['wyze-cam-v4:black']).toBe(1);

    // Switching back changes only the displayed variant, not quantities.
    state().selectVariant('wyze-cam-v4', 'white');
    expect(state().activeVariant['wyze-cam-v4']).toBe('white');
    expect(state().quantities['wyze-cam-v4:white']).toBe(2);
    expect(state().quantities['wyze-cam-v4:black']).toBe(1);
  });

  it('rejects variants that do not exist on the product', () => {
    state().selectVariant('wyze-cam-v4', 'purple');
    expect(state().activeVariant['wyze-cam-v4']).toBe('white');
  });
});

describe('single-select products (plan)', () => {
  it('selectSingle keeps exactly one plan selected', () => {
    state().selectSingle('cam-unlimited');
    expect(state().quantities['cam-unlimited']).toBe(1);
    // Selecting again is idempotent.
    state().selectSingle('cam-unlimited');
    expect(state().quantities['cam-unlimited']).toBe(1);
  });

  it('ignores selectSingle on quantity-mode products', () => {
    state().selectSingle('wyze-cam-v4');
    expect(state().quantities).not.toHaveProperty('wyze-cam-v4');
  });
});

describe('selection counts', () => {
  it('counts distinct products per step from live state', () => {
    expect(selectedCountForStep('cameras', state().quantities)).toBe(2);
    expect(selectedCountForStep('sensors', state().quantities)).toBe(2);
    expect(selectedCountForStep('protection', state().quantities)).toBe(1);
    expect(selectedCountForStep('plan', state().quantities)).toBe(1);

    // A second variant of an already-selected camera does not raise the count…
    state().increment('wyze-cam-v4:black');
    expect(selectedCountForStep('cameras', state().quantities)).toBe(2);
    // …but a new product does.
    state().increment('wyze-duo-cam-doorbell');
    expect(selectedCountForStep('cameras', state().quantities)).toBe(3);
  });
});

describe('accordion state', () => {
  it('toggleStep expands a collapsed step and collapses an expanded one', () => {
    state().toggleStep('sensors');
    expect(state().activeStep).toBe('sensors');
    state().toggleStep('sensors');
    expect(state().activeStep).toBeNull();
  });

  it('goToNextStep follows the configured step order and stops at the end', () => {
    expect(state().activeStep).toBe('cameras');
    state().goToNextStep();
    expect(state().activeStep).toBe('plan');
    state().goToNextStep();
    expect(state().activeStep).toBe('sensors');
    state().goToNextStep();
    expect(state().activeStep).toBe('protection');
    state().goToNextStep();
    expect(state().activeStep).toBe('protection');
  });

  it('selections survive switching steps', () => {
    state().increment('wyze-cam-v4:white');
    state().setActiveStep('sensors');
    state().setActiveStep('cameras');
    expect(state().quantities['wyze-cam-v4:white']).toBe(2);
  });
});

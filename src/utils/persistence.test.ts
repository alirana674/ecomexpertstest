import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../data/catalog';
import {
  clearSavedSystem,
  hasSavedSystem,
  loadSavedSystem,
  saveSystem,
} from './persistence';
import { useBundleStore } from '../store/bundleStore';

beforeEach(() => {
  localStorage.clear();
  useBundleStore.getState().resetToDefaults();
});

describe('save/load round trip', () => {
  it('restores exactly what was saved', () => {
    const quantities = {
      'wyze-cam-v4:white': 2,
      'wyze-cam-v4:black': 1,
      'wyze-sense-hub': 1,
    };
    const activeVariant = { 'wyze-cam-v4': 'black' };
    expect(saveSystem(quantities, activeVariant)).toBe(true);

    const restored = loadSavedSystem();
    expect(restored).not.toBeNull();
    expect(restored?.quantities).toEqual(quantities);
    expect(restored?.activeVariant).toEqual(activeVariant);
    expect(restored?.savedAt).toBeTruthy();
  });

  it('returns null when nothing is saved', () => {
    expect(loadSavedSystem()).toBeNull();
    expect(hasSavedSystem()).toBe(false);
  });
});

describe('validation of stored data', () => {
  it('rejects corrupt JSON', () => {
    localStorage.setItem(config.storageKey, '{not json!!');
    expect(loadSavedSystem()).toBeNull();
  });

  it('rejects non-object payloads and wrong versions', () => {
    localStorage.setItem(config.storageKey, JSON.stringify('hello'));
    expect(loadSavedSystem()).toBeNull();
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({ version: 999, savedAt: '', quantities: {}, activeVariant: {} }),
    );
    expect(loadSavedSystem()).toBeNull();
  });

  it('drops unknown products, unknown variants and malformed quantities', () => {
    saveSystem(
      {
        'wyze-cam-v4:white': 1,
        'discontinued-cam': 2, // unknown product
        'wyze-cam-v4:neon': 3, // unknown variant
        'wyze-cam-v4': 1, // variant product without variant part
      },
      { 'wyze-cam-v4': 'neon', ghost: 'white' },
    );
    const restored = loadSavedSystem();
    expect(restored?.quantities).toEqual({
      'wyze-cam-v4:white': 1,
      'wyze-sense-hub': 1, // required minimum re-enforced
    });
    expect(restored?.activeVariant).toEqual({});
  });

  it('clamps quantities and floors fractional values', () => {
    localStorage.setItem(
      config.storageKey,
      JSON.stringify({
        version: config.storageVersion,
        savedAt: new Date().toISOString(),
        quantities: {
          'wyze-cam-v4:white': 500,
          'wyze-microsd-256gb': 2.9,
          'wyze-duo-cam-doorbell': -3,
          'wyze-cam-pan-v3:white': 'two',
        },
        activeVariant: {},
      }),
    );
    const restored = loadSavedSystem();
    expect(restored?.quantities['wyze-cam-v4:white']).toBe(99);
    expect(restored?.quantities['wyze-microsd-256gb']).toBe(2);
    expect(restored?.quantities).not.toHaveProperty('wyze-duo-cam-doorbell');
    expect(restored?.quantities).not.toHaveProperty('wyze-cam-pan-v3:white');
  });

  it('re-enforces required product minimums lost from saved data', () => {
    saveSystem({ 'wyze-cam-v4:white': 1 }, {});
    const restored = loadSavedSystem();
    expect(restored?.quantities['wyze-sense-hub']).toBe(1);
  });
});

describe('store integration', () => {
  it('saveSystem → hydrateFromStorage restores the configured bundle', () => {
    const store = useBundleStore.getState();
    store.increment('wyze-cam-v4:white');
    store.selectVariant('wyze-cam-v4', 'black');
    store.increment('wyze-cam-v4:black');
    expect(useBundleStore.getState().saveSystem()).toBe(true);

    // Simulate leaving: state reverts to defaults (storage untouched).
    useBundleStore.getState().resetToDefaults();
    expect(useBundleStore.getState().quantities['wyze-cam-v4:white']).toBe(1);
    expect(hasSavedSystem()).toBe(true);

    // Returning: hydrate restores the saved configuration exactly.
    expect(useBundleStore.getState().hydrateFromStorage()).toBe(true);
    const state = useBundleStore.getState();
    expect(state.quantities['wyze-cam-v4:white']).toBe(2);
    expect(state.quantities['wyze-cam-v4:black']).toBe(1);
    expect(state.activeVariant['wyze-cam-v4']).toBe('black');
    expect(state.lastSavedAt).toBeTruthy();
  });

  it('hydrateFromStorage returns false and keeps defaults when nothing is saved', () => {
    expect(useBundleStore.getState().hydrateFromStorage()).toBe(false);
    expect(useBundleStore.getState().quantities['wyze-cam-v4:white']).toBe(1);
  });

  it('hydration never writes to storage (defaults cannot overwrite a save)', () => {
    useBundleStore.getState().hydrateFromStorage();
    expect(hasSavedSystem()).toBe(false);
  });

  it('clearSavedSystem removes the stored payload', () => {
    useBundleStore.getState().saveSystem();
    expect(hasSavedSystem()).toBe(true);
    clearSavedSystem();
    expect(hasSavedSystem()).toBe(false);
  });
});

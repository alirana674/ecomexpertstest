import '@testing-library/jest-dom/vitest';

/*
 * Node 26 defines an experimental global `localStorage` getter that returns
 * undefined unless Node is started with --localstorage-file, and it shadows
 * jsdom's storage in Vitest's merged realm (window.localStorage is undefined
 * here too). The property is configurable, so install a spec-shaped in-memory
 * Storage for tests. Cleared between tests by the suites that use it.
 */
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store = new Map();
    },
  };
}

if (typeof localStorage === 'undefined' || localStorage == null) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}

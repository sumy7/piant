import { describe, expect, it } from 'vitest';
import { createStore } from '../src/createStore';
import { combine } from '../src/middleware/combine';
import { persist } from '../src/middleware/persist';
import type { StorageAdapter } from '../src/types';

// ---------------------------------------------------------------------------
// In-memory StorageAdapter for tests
// ---------------------------------------------------------------------------

function createMemoryStorage(): StorageAdapter & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Basic persistence
// ---------------------------------------------------------------------------

describe('persist middleware – basic', () => {
  it('returns the creator initial state when storage is empty', () => {
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist(() => ({ count: 0 }), { name: 'test', storage }),
    );
    expect(useStore.getState().count).toBe(0);
  });

  it('saves state to storage on setState', () => {
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist(() => ({ count: 0 }), { name: 'counter', storage }),
    );

    useStore.setState({ count: 5 });

    const raw = storage.getItem('counter');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.count).toBe(5);
  });

  it('saves state to storage when actions call set()', () => {
    interface S {
      count: number;
      increment: () => void;
    }
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist<S>(
        (set) => ({
          count: 0,
          increment: () => set((s) => ({ count: s.count + 1 })),
        }),
        { name: 'counter', storage },
      ),
    );

    useStore.getState().increment();
    useStore.getState().increment();

    const raw = storage.getItem('counter');
    expect(JSON.parse(raw!).count).toBe(2);
  });

  it('rehydrates state from storage on store creation', () => {
    const storage = createMemoryStorage();
    // Pre-populate storage
    storage.setItem('counter', JSON.stringify({ count: 42 }));

    const useStore = createStore(
      persist(() => ({ count: 0 }), { name: 'counter', storage }),
    );

    expect(useStore.getState().count).toBe(42);
  });

  it('subsequent stores using the same storage key share persisted state', () => {
    const storage = createMemoryStorage();

    const useStoreA = createStore(
      persist(() => ({ count: 0 }), { name: 'shared', storage }),
    );
    useStoreA.setState({ count: 7 });

    // A second store created with the same key should rehydrate A's value
    const useStoreB = createStore(
      persist(() => ({ count: 0 }), { name: 'shared', storage }),
    );
    expect(useStoreB.getState().count).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// partialize
// ---------------------------------------------------------------------------

describe('persist middleware – partialize', () => {
  it('only persists the selected subset of state', () => {
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist(
        () => ({ token: 'abc', tempData: { ts: 1 } }),
        {
          name: 'auth',
          storage,
          partialize: (s) => ({ token: s.token }),
        },
      ),
    );

    useStore.setState({ token: 'xyz' });

    const raw = storage.getItem('auth');
    const parsed = JSON.parse(raw!);
    expect(parsed.token).toBe('xyz');
    expect(Object.keys(parsed)).not.toContain('tempData');
  });

  it('rehydrates only the persisted subset', () => {
    const storage = createMemoryStorage();
    // Only token is stored
    storage.setItem('auth', JSON.stringify({ token: 'restored' }));

    const useStore = createStore(
      persist(
        () => ({ token: '', tempData: { ts: 99 } }),
        {
          name: 'auth',
          storage,
          partialize: (s) => ({ token: s.token }),
        },
      ),
    );

    expect(useStore.getState().token).toBe('restored');
    // tempData comes from the creator, not storage
    expect(useStore.getState().tempData.ts).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Custom serialize / deserialize
// ---------------------------------------------------------------------------

describe('persist middleware – custom serialize/deserialize', () => {
  it('uses custom serializer when saving', () => {
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist(
        () => ({ count: 0 }),
        {
          name: 'custom',
          storage,
          serialize: (s) => `count=${(s as { count: number }).count}`,
          deserialize: (raw) => ({ count: Number(raw.split('=')[1]) }),
        },
      ),
    );

    useStore.setState({ count: 3 });
    expect(storage.getItem('custom')).toBe('count=3');
  });

  it('uses custom deserializer when rehydrating', () => {
    const storage = createMemoryStorage();
    storage.setItem('custom', 'count=99');

    const useStore = createStore(
      persist(
        () => ({ count: 0 }),
        {
          name: 'custom',
          storage,
          serialize: (s) => `count=${(s as { count: number }).count}`,
          deserialize: (raw) => ({ count: Number(raw.split('=')[1]) }),
        },
      ),
    );

    expect(useStore.getState().count).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// skipHydration
// ---------------------------------------------------------------------------

describe('persist middleware – skipHydration', () => {
  it('does not load from storage when skipHydration is true', () => {
    const storage = createMemoryStorage();
    storage.setItem('skip-test', JSON.stringify({ count: 100 }));

    const useStore = createStore(
      persist(() => ({ count: 0 }), {
        name: 'skip-test',
        storage,
        skipHydration: true,
      }),
    );

    // Should use creator default, not storage value
    expect(useStore.getState().count).toBe(0);
  });

  it('still saves to storage even when skipHydration is true', () => {
    const storage = createMemoryStorage();
    const useStore = createStore(
      persist(() => ({ count: 0 }), {
        name: 'skip-save',
        storage,
        skipHydration: true,
      }),
    );

    useStore.setState({ count: 7 });
    expect(JSON.parse(storage.getItem('skip-save')!).count).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// onRehydrateStorage callback
// ---------------------------------------------------------------------------

describe('persist middleware – onRehydrateStorage', () => {
  it('calls onRehydrateStorage after merging stored state', () => {
    const storage = createMemoryStorage();
    storage.setItem('cb-test', JSON.stringify({ count: 5 }));

    let callbackState: unknown;
    const useStore = createStore(
      persist(() => ({ count: 0 }), {
        name: 'cb-test',
        storage,
        onRehydrateStorage: (s) => {
          callbackState = s.count;
        },
      }),
    );

    expect(useStore.getState().count).toBe(5);
    expect(callbackState).toBe(5);
  });

  it('does not call onRehydrateStorage when storage is empty', () => {
    const storage = createMemoryStorage();
    let called = false;

    createStore(
      persist(() => ({ count: 0 }), {
        name: 'empty',
        storage,
        onRehydrateStorage: () => {
          called = true;
        },
      }),
    );

    expect(called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Resilience
// ---------------------------------------------------------------------------

describe('persist middleware – resilience', () => {
  it('falls back to creator defaults when storage is undefined', () => {
    const useStore = createStore(
      persist(() => ({ count: 42 }), {
        name: 'no-storage',
        storage: undefined,
      }),
    );

    expect(useStore.getState().count).toBe(42);
    // setState should not throw even without storage
    expect(() => useStore.setState({ count: 99 })).not.toThrow();
  });

  it('falls back gracefully when stored JSON is corrupt', () => {
    const storage = createMemoryStorage();
    storage.setItem('corrupt', 'not-valid-json{{{');

    const useStore = createStore(
      persist(() => ({ count: 0 }), { name: 'corrupt', storage }),
    );

    // Should fall back to creator default, not throw
    expect(useStore.getState().count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Compose: persist + combine
// ---------------------------------------------------------------------------

describe('persist + combine composed', () => {
  it('persists state created with combine', () => {
    const storage = createMemoryStorage();

    const useStore = createStore(
      persist(
        combine({ count: 0 }, (set) => ({
          increment: () => set((s) => ({ count: s.count + 1 })),
        })),
        { name: 'combined', storage },
      ),
    );

    useStore.getState().increment();
    expect(useStore.getState().count).toBe(1);
    expect(JSON.parse(storage.getItem('combined')!).count).toBe(1);
  });

  it('rehydrates combined store state', () => {
    const storage = createMemoryStorage();
    storage.setItem('combined-rehydrate', JSON.stringify({ count: 10 }));

    const useStore = createStore(
      persist(
        combine({ count: 0 }, (set) => ({
          increment: () => set((s) => ({ count: s.count + 1 })),
        })),
        { name: 'combined-rehydrate', storage },
      ),
    );

    expect(useStore.getState().count).toBe(10);
    useStore.getState().increment();
    expect(useStore.getState().count).toBe(11);
  });
});

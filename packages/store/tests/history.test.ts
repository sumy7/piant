import { autorun, observable, runInAction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';
import type { StoreApi } from '../src';
import { combine, createStore, createStoreHistory, persist } from '../src';

function counter(maxEntries?: number) {
  const store = createStore(
    combine({ count: 0 }, (set) => ({
      increment: () => set((s) => ({ count: s.count + 1 })),
    })),
  );
  const history = createStoreHistory(store, {
    enabled: true,
    maxEntries,
    name: 'Counter',
  });
  if (!history) throw new Error('Expected history');
  return { store, history };
}

describe('createStoreHistory', () => {
  it('requires explicit opt-in without reading or subscribing', () => {
    const store = { getState: vi.fn(), subscribe: vi.fn(), setState: vi.fn() };
    expect(createStoreHistory(store)).toBeNull();
    expect(createStoreHistory(store, { enabled: false })).toBeNull();
    expect(store.getState).not.toHaveBeenCalled();
    expect(store.subscribe).not.toHaveBeenCalled();
  });

  it('records immutable initial and changed data, excludes actions, and caches snapshots', () => {
    const { store, history } = counter();
    const first = history.snapshot();
    expect(history.name).toBe('Counter');
    expect(first.entries[0]).toMatchObject({
      id: 1,
      state: { count: 0 },
      restorable: true,
    });
    expect(first.entries[0]?.timestamp).toBeGreaterThan(0);
    expect(history.snapshot()).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.entries)).toBe(true);
    expect(Object.isFrozen(first.entries[0]?.state)).toBe(true);
    store.getState().increment();
    store.setState({ count: 1 });
    expect(history.snapshot().entries).toHaveLength(2);
    expect(first.entries[0]?.state).toEqual({ count: 0 });
    expect(Object.isFrozen(store.getState())).toBe(false);
    history.dispose();
  });

  it('restores in one reactive batch while preserving root identity and actions', () => {
    const store = createStore<{
      count: number;
      list: { value: number }[];
      extra?: number;
      increment(): void;
    }>((set) => ({
      count: 0,
      list: [{ value: 1 }],
      increment: () => set((s) => ({ count: s.count + 1 })),
    }));
    const history = createStoreHistory(store, { enabled: true });
    if (!history) throw new Error();
    const state = store.getState();
    const action = state.increment;
    const seen: unknown[] = [];
    const stop = autorun(() => {
      seen.push([state.count, state.list[0]?.value, state.extra]);
    });
    store.setState({ count: 8, list: [{ value: 9 }], extra: 4 });
    expect(history.restore(1)).toBe(true);
    expect(store.getState()).toBe(state);
    expect(state.increment).toBe(action);
    expect(seen).toEqual([
      [0, 1, undefined],
      [8, 9, 4],
      [0, 1, undefined],
    ]);
    expect(Object.hasOwn(state, 'extra')).toBe(false);
    expect(history.snapshot().entries).toHaveLength(2);
    expect(history.restore(2)).toBe(true);
    expect(state.extra).toBe(4);
    expect(history.restore(1)).toBe(true);
    state.increment();
    expect(state.count).toBe(1);
    expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([1, 3]);
    stop();
    history.dispose();
  });

  it('bounds entries, rejects missing IDs, clears without reusing IDs', () => {
    const { store, history } = counter(2);
    store.getState().increment();
    store.getState().increment();
    expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([2, 3]);
    for (const id of [1, -1, NaN, 2.1, Infinity, 90])
      expect(history.restore(id)).toBe(false);
    history.clear();
    expect(history.snapshot().entries).toHaveLength(1);
    expect(history.snapshot().entries[0]).toMatchObject({
      id: 4,
      state: { count: 2 },
    });
    history.dispose();
  });

  it('preserves nested data snapshots independently of source changes', () => {
    const store = createStore(() => ({
      nested: { values: [1, { text: 'old' }] },
    }));
    const history = createStoreHistory(store, { enabled: true });
    if (!history) throw new Error();
    const first = history.snapshot().entries[0];
    store.setState({ nested: { values: [2, { text: 'new' }] } });
    expect(first?.state).toEqual({ nested: { values: [1, { text: 'old' }] } });
    expect(history.restore(1)).toBe(true);
    runInAction(() => {
      store.getState().nested.values[0] = 5;
    });
    expect(first?.state).toEqual({ nested: { values: [1, { text: 'old' }] } });
    history.dispose();
  });

  it('restores through persist partialize and serializer', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const store = createStore(
      persist(
        combine({ count: 0, other: 'keep' }, (set) => ({
          increment: () => set((s) => ({ count: s.count + 1 })),
        })),
        {
          name: 'counter',
          storage,
          partialize: (state) => ({ count: state.count }),
          serialize: (value) => `saved:${JSON.stringify(value)}`,
        },
      ),
    );
    const history = createStoreHistory(store, { enabled: true });
    if (!history) throw new Error();
    store.getState().increment();
    expect(history.restore(1)).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'counter',
      'saved:{"count":0}',
    );
    expect(history.snapshot().entries).toHaveLength(2);
    store.getState().increment();
    expect(store.getState().count).toBe(1);
    history.dispose();
  });

  it.each([
    undefined,
    NaN,
    Infinity,
    new Date(),
    new Map([['x', 1]]),
    new Set([1]),
    new (class Data {
      value = 1;
    })(),
    { nested: () => 1 },
    // biome-ignore lint/suspicious/noSparseArray: Regression fixture for unsupported sparse arrays.
    [1, , 3],
    Symbol('data'),
    1n,
  ])('marks unsupported values as non-restorable (%s)', (value) => {
    const store = createStore(() => ({ value }));
    const history = createStoreHistory(store, { enabled: true });
    if (!history) throw new Error();
    expect(history.snapshot().entries[0]?.restorable).toBe(false);
    expect(history.snapshot().entries[0]?.reason).toBeTruthy();
    expect(history.restore(1)).toBe(false);
    history.dispose();
  });

  it('does not evaluate plain or computed getters, including during subscription', () => {
    const getter = vi.fn(() => 'secret');
    const nested = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: getter,
    });
    // A shallow observable keeps the accessor intact instead of createStore's initial Object.assign.
    const state = observable.object({ nested, count: 0 }, {}, { deep: false });
    const base = createStore(() => ({ count: 0 }));
    const store: StoreApi<typeof state> = {
      getState: () => state,
      setState: (update) =>
        runInAction(() =>
          Object.assign(
            state,
            typeof update === 'function' ? update(state) : update,
          ),
        ),
      subscribe: base.subscribe as unknown as StoreApi<
        typeof state
      >['subscribe'],
    };
    const history = createStoreHistory(store, { enabled: true });
    expect(getter).not.toHaveBeenCalled();
    expect(history?.snapshot().entries[0]?.reason).toMatch(/accessor/);
    history?.dispose();
    const computedGetter = vi.fn(() => 1);
    const computedState = observable({
      get derived() {
        return computedGetter();
      },
    });
    const computedHistory = createStoreHistory(
      { ...store, getState: () => computedState } as unknown as StoreApi<
        typeof computedState
      >,
      { enabled: true },
    );
    expect(computedGetter).not.toHaveBeenCalled();
    expect(computedHistory?.snapshot().entries[0]?.restorable).toBe(false);
    computedHistory?.dispose();
  });

  it('bounds cyclic, deep, large, and long string data without freezing originals', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    let deep: unknown = 0;
    for (let i = 0; i < 30; i++) deep = { deep };
    for (const value of [
      cycle,
      deep,
      Array.from({ length: 10_001 }, () => 0),
      'x'.repeat(10_001),
    ]) {
      const base = createStore(() => ({ count: 0 }));
      const state = observable.object({ value }, {}, { deep: false });
      const history = createStoreHistory(
        { ...base, getState: () => state } as unknown as StoreApi<typeof state>,
        { enabled: true },
      );
      expect(history?.snapshot().entries[0]?.restorable).toBe(false);
      if (typeof value === 'object') expect(Object.isFrozen(value)).toBe(false);
      history?.dispose();
    }
  });

  it('rejects symbol and prototype-sensitive keys without polluting objects', () => {
    for (const value of [
      { [Symbol('secret')]: 1 },
      JSON.parse('{"__proto__":{"polluted":true}}'),
      { constructor: 2 },
    ]) {
      const store = createStore(() => ({ value }));
      const history = createStoreHistory(store, { enabled: true });
      expect(history?.snapshot().entries[0]?.restorable).toBe(false);
      expect(history?.restore(1)).toBe(false);
      history?.dispose();
    }
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it('refuses restore when current data or action schema becomes unsupported', () => {
    const store = createStore<Record<string, unknown>>(() => ({
      count: 0,
      action: () => 1,
    }));
    const history = createStoreHistory(store, { enabled: true });
    store.setState({ unsupported: new Date() });
    expect(history?.restore(1)).toBe(false);
    runInAction(() => {
      delete store.getState().unsupported;
    });
    store.setState({ newAction: () => 1 });
    expect(history?.restore(1)).toBe(false);
    expect(store.getState().count).toBe(0);
    history?.dispose();
  });

  it('contains observer failures and unsubscribes on disposal', () => {
    const { store, history } = counter();
    const listener = vi.fn();
    const stop = history.subscribe(listener);
    history.subscribe(() => {
      throw new Error('observer');
    });
    expect(() => store.getState().increment()).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    history.dispose();
    const snapshot = history.snapshot();
    expect(snapshot.disposed).toBe(true);
    history.dispose();
    history.clear();
    expect(history.restore(1)).toBe(false);
    store.getState().increment();
    expect(history.snapshot()).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('history safety boundaries', () => {
  it('reports unreadable sources without throwing or writing marker state', () => {
    const base = createStore(() => ({ count: 0 }));
    const setState = vi.fn();
    const history = createStoreHistory(
      {
        ...base,
        getState: () => {
          throw new Error('source');
        },
        setState,
      },
      { enabled: true },
    );
    expect(history?.snapshot().entries[0]).toMatchObject({
      restorable: false,
      reason: 'Unreadable state',
    });
    expect(history?.restore(1)).toBe(false);
    expect(setState).not.toHaveBeenCalled();
    history?.dispose();
  });

  it('does not read or retain subscribers after disposal', () => {
    const store = createStore(
      combine({ count: 0 }, (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
      })),
    );
    const getState = vi.fn(store.getState);
    const history = createStoreHistory(
      { ...store, getState },
      { enabled: true },
    );
    const listener = vi.fn();
    history?.subscribe(listener);
    history?.dispose();
    getState.mockClear();
    listener.mockClear();
    const snapshot = history?.snapshot();
    history?.subscribe(listener);
    store.getState().increment();
    history?.clear();
    history?.restore(1);
    history?.dispose();
    expect(history?.snapshot()).toBe(snapshot);
    expect(getState).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

it.each([
  [1, 2],
  [undefined, 100],
  [2000, 1000],
  [NaN, 100],
  [Infinity, 100],
])('normalizes history capacity %s to %s', (requested, expected) => {
  const { store, history } = counter(requested);
  for (let i = 0; i < (expected ?? 0) + 2; i++) store.getState().increment();
  expect(history.snapshot().entries).toHaveLength(expected ?? 100);
  history.dispose();
});

describe('restores nested in business actions', () => {
  it('does not record a restore whose reaction is deferred by an outer action', () => {
    const { store, history } = counter();
    store.getState().increment();
    store.getState().increment();
    const entries = history.snapshot().entries;
    runInAction(() => {
      expect(history.restore(1)).toBe(true);
    });
    expect(store.getState().count).toBe(0);
    expect(history.snapshot().entries).toBe(entries);
    expect(history.snapshot().currentId).toBe(1);
    expect(history.restore(3)).toBe(true);
    expect(store.getState().count).toBe(2);
    history.dispose();
  });

  it('supports consecutive deferred restores without pruning retained future entries', () => {
    const { store, history } = counter();
    store.getState().increment();
    store.getState().increment();
    const entries = history.snapshot().entries;
    runInAction(() => {
      history.restore(1);
      history.restore(2);
    });
    expect(store.getState().count).toBe(1);
    expect(history.snapshot().currentId).toBe(2);
    expect(history.snapshot().entries).toBe(entries);
    expect(history.restore(3)).toBe(true);
    history.dispose();
  });

  it('records a subsequent business update in the same outer action as a new branch', () => {
    const { store, history } = counter();
    store.getState().increment();
    store.getState().increment();
    runInAction(() => {
      history.restore(1);
      store.getState().increment();
    });
    expect(store.getState().count).toBe(1);
    expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([1, 4]);
    expect(history.snapshot().entries[1]?.state).toEqual({ count: 1 });
    history.dispose();
  });
});

it('clears to current live state even when called inside an unfinished action', () => {
  const { store, history } = counter();
  runInAction(() => {
    store.getState().increment();
    history.clear();
  });
  expect(history.snapshot().entries).toHaveLength(1);
  expect(history.snapshot().entries[0]).toMatchObject({
    id: 2,
    state: { count: 1 },
  });
  store.getState().increment();
  expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([2, 3]);
  history.dispose();
});

it.each([true, false])(
  'records business reactions caused by restore (history registered first: %s)',
  (historyFirst) => {
    const store = createStore(() => ({ count: 0 }));
    let activated = false;
    const observe = () =>
      autorun(() => {
        const count = store.getState().count;
        if (activated && count === 0) store.setState({ count: 100 });
      });
    let stop = historyFirst ? undefined : observe();
    const history = createStoreHistory(store, { enabled: true });
    if (!history) throw new Error('Expected history');
    stop ??= observe();
    store.setState({ count: 1 });
    activated = true;
    expect(history.restore(1)).toBe(true);
    expect(store.getState().count).toBe(100);
    const snapshot = history.snapshot();
    expect(snapshot.entries.map((entry) => entry.id)).toEqual([1, 3]);
    expect(snapshot.entries.map((entry) => entry.state)).toEqual([
      { count: 0 },
      { count: 100 },
    ]);
    expect(snapshot.currentId).toBe(3);
    stop();
    history.dispose();
  },
);

it('records a restored branch even when its final state equals the outer action starting state', () => {
  const { store, history } = counter();
  store.getState().increment();
  runInAction(() => {
    history.restore(1);
    store.getState().increment();
  });
  expect(store.getState().count).toBe(1);
  expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([1, 3]);
  expect(history.snapshot().entries.map((entry) => entry.state)).toEqual([
    { count: 0 },
    { count: 1 },
  ]);
  expect(history.snapshot().currentId).toBe(3);
  history.dispose();
});

it('records a clear branch even when its final state equals the outer action starting state', () => {
  const { store, history } = counter();
  store.getState().increment();
  runInAction(() => {
    store.setState({ count: 0 });
    history.clear();
    store.getState().increment();
  });
  expect(store.getState().count).toBe(1);
  expect(history.snapshot().entries.map((entry) => entry.id)).toEqual([3, 4]);
  expect(history.snapshot().entries.map((entry) => entry.state)).toEqual([
    { count: 0 },
    { count: 1 },
  ]);
  expect(history.snapshot().currentId).toBe(4);
  history.dispose();
});

import {
  $mobx,
  comparer,
  isComputedProp,
  isObservableProp,
  runInAction,
} from 'mobx';
import type {
  StoreApi,
  StoreHistory,
  StoreHistoryOptions,
  StoreHistorySnapshot,
  StoreSnapshotValue,
} from './types';

type Capture = {
  state: StoreSnapshotValue;
  reason?: string;
  actions: string[];
};
const MAX_DEPTH = 20;
const MAX_VALUES = 1_000;
const MAX_STRING = 10_000;
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

/** Copies only losslessly restorable JSON data, without evaluating business accessors. */
function capture(source: object): Capture {
  let reason: string | undefined;
  let remaining = MAX_VALUES;
  let characters = 100_000;
  const ancestors = new Set<object>();
  const actions: string[] = [];
  const unsupported = (message: string): string => {
    reason ??= message;
    return `[${message}]`;
  };
  const copy = (value: unknown, depth: number): StoreSnapshotValue => {
    if (--remaining < 0 || depth > MAX_DEPTH)
      return unsupported('Truncated snapshot');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const length = Math.min(MAX_STRING, Math.max(0, characters));
      characters -= Math.min(value.length, length);
      if (value.length > length) {
        unsupported('Truncated string');
        return `${value.slice(0, length)}…`;
      }
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'object')
      return unsupported(`Unsupported ${typeof value}`);
    if (ancestors.has(value)) return unsupported('Circular reference');
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (!array && prototype !== Object.prototype && prototype !== null) {
      return unsupported('Unsupported object type');
    }
    ancestors.add(value);
    const result: StoreSnapshotValue[] | Record<string, StoreSnapshotValue> =
      array ? [] : {};
    const keys = Reflect.ownKeys(value);
    if (array && value.length > MAX_VALUES) {
      ancestors.delete(value);
      return unsupported('Truncated array');
    }
    for (const key of keys) {
      if (remaining <= 0) {
        unsupported('Truncated snapshot');
        break;
      }
      remaining--;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if (array && key === 'length') continue;
      if (typeof key === 'symbol') {
        // MobX's internal administration is non-enumerable.
        if (key !== $mobx) unsupported('Unsupported symbol key');
        continue;
      }
      if (key.length > MAX_STRING || key.length > characters) {
        unsupported('Truncated property key');
        continue;
      }
      characters -= key.length;
      if (unsafeKeys.has(key)) {
        unsupported('Unsafe property key');
        continue;
      }
      if (!descriptor.enumerable) {
        unsupported('Unsupported non-enumerable property');
        continue;
      }
      if (array && !/^(0|[1-9]\d*)$/.test(key)) {
        unsupported('Unsupported array property');
        continue;
      }
      let child: unknown;
      if ('value' in descriptor) child = descriptor.value;
      else if (isObservableProp(value, key) && !isComputedProp(value, key)) {
        child = Reflect.get(value, key);
      } else {
        Object.defineProperty(result, key, {
          value: unsupported('Unsupported accessor'),
          enumerable: true,
          configurable: true,
        });
        continue;
      }
      if (depth === 0 && typeof child === 'function') {
        actions.push(key);
        continue;
      }
      Object.defineProperty(result, key, {
        value: copy(child, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    if (array && Object.keys(result).length !== value.length)
      unsupported('Sparse array');
    ancestors.delete(value);
    return Object.freeze(result);
  };
  try {
    return { state: copy(source, 0), reason, actions };
  } catch {
    return {
      state: '[Unreadable state]',
      reason: 'Unreadable state',
      actions: [],
    };
  }
}

function mutableCopy(value: StoreSnapshotValue): unknown {
  if (Array.isArray(value)) return value.map(mutableCopy);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, mutableCopy(child)]),
    );
  }
  return value;
}

/** Explicit, opt-in bounded history. Creating a store alone never records history. */
export function createStoreHistory<T extends object>(
  store: StoreApi<T>,
  options: StoreHistoryOptions = {},
): StoreHistory | null {
  if (options.enabled !== true) return null;
  const requested = options.maxEntries ?? 100;
  const maxEntries = Number.isFinite(requested)
    ? Math.min(1000, Math.max(2, Math.floor(requested)))
    : 100;
  const listeners = new Set<() => void>();
  let nextId = 1;
  let revision = 0;
  let restoredCapture: Capture | undefined;
  const read = (): Capture => {
    try {
      return capture(store.getState());
    } catch {
      return {
        state: '[Unreadable state]',
        reason: 'Unreadable state',
        actions: [],
      };
    }
  };
  let lastCapture = read();
  const actionKeys = lastCapture.actions;
  let cached: StoreHistorySnapshot = Object.freeze({
    entries: Object.freeze([]),
    currentId: null,
    disposed: false,
  });
  const notify = () => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        /* Observers must not break business updates. */
      }
    }
  };
  const append = (value: Capture, reset = false) => {
    const currentIndex = cached.entries.findIndex(
      (entry) => entry.id === cached.currentId,
    );
    const previous = reset ? [] : cached.entries.slice(0, currentIndex + 1);
    const entry = Object.freeze({
      id: nextId++,
      timestamp: Date.now(),
      state: value.state,
      restorable: value.reason === undefined,
      ...(value.reason ? { reason: value.reason } : {}),
    });
    cached = Object.freeze({
      entries: Object.freeze([...previous, entry].slice(-maxEntries)),
      currentId: entry.id,
      disposed: false,
    });
    notify();
  };
  append(lastCapture);
  const unsubscribe = store.subscribe(
    // A restore/clear can change the history position inside an outer action
    // whose final data equals its starting data. Include that position change
    // so structural equality cannot hide a genuine new branch.
    () => ({ value: read(), revision }),
    ({ value }) => {
      if (cached.disposed) return;
      // An enclosing business action can delay this reaction beyond restore().
      if (restoredCapture && comparer.structural(value, restoredCapture)) {
        restoredCapture = undefined;
        return;
      }
      restoredCapture = undefined;
      lastCapture = value;
      append(value);
    },
    { equals: comparer.structural },
  );
  return {
    name: options.name ?? 'Store',
    snapshot: () => cached,
    subscribe(listener) {
      if (cached.disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore(id) {
      if (cached.disposed || !Number.isSafeInteger(id)) return false;
      const entry = cached.entries.find((item) => item.id === id);
      if (!entry?.restorable) return false;
      const current = read();
      if (current.reason || !comparer.structural(current.actions, actionKeys))
        return false;
      revision++;
      runInAction(() => {
        store.setState((state) => {
          const data = mutableCopy(entry.state) as Record<string, unknown>;
          for (const key of Object.keys(state)) {
            if (!actionKeys.includes(key) && !Object.hasOwn(data, key))
              Reflect.deleteProperty(state, key);
          }
          return data as Partial<T>;
        });
        restoredCapture = read();
        // Reactions flushed at this batch boundary can perform genuine business
        // updates. Those updates must branch from the restored entry, and their
        // appended currentId must not be overwritten after the batch completes.
        cached = Object.freeze({ ...cached, currentId: id });
      });
      notify();
      return true;
    },
    clear() {
      if (cached.disposed) return;
      revision++;
      lastCapture = read();
      restoredCapture = lastCapture;
      append(lastCapture, true);
    },
    dispose() {
      if (cached.disposed) return;
      unsubscribe();
      cached = Object.freeze({ ...cached, disposed: true });
      notify();
      listeners.clear();
      restoredCapture = undefined;
    },
  };
}

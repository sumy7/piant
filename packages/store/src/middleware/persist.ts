import type { GetState, PersistOptions, SetState, StateCreator, StoreApi } from '../types';

/**
 * Middleware that persists (and rehydrates) the store state to/from a
 * synchronous key-value storage (e.g. `localStorage`, `sessionStorage`, or any
 * object that satisfies {@link StorageAdapter}).
 *
 * The middleware:
 * 1. Overrides `api.setState` so that **every** state update — including
 *    external `useStore.setState` calls — is also serialised and saved to the
 *    storage backend.
 * 2. During store creation, loads any previously saved state from storage and
 *    merges it over the creator's initial state.
 *
 * @example
 * ```ts
 * const useStore = createStore(
 *   persist(
 *     (set) => ({
 *       count: 0,
 *       increment: () => set((s) => ({ count: s.count + 1 })),
 *     }),
 *     { name: 'counter' },
 *   ),
 * );
 * ```
 *
 * @example Persist only a subset of the state
 * ```ts
 * const useStore = createStore(
 *   persist(
 *     (set) => ({
 *       token: '',
 *       tempData: {},
 *       setToken: (token: string) => set({ token }),
 *     }),
 *     {
 *       name: 'auth',
 *       partialize: (s) => ({ token: s.token }),
 *     },
 *   ),
 * );
 * ```
 *
 * @example Custom storage (e.g. sessionStorage)
 * ```ts
 * const useStore = createStore(
 *   persist(
 *     (set) => ({ count: 0 }),
 *     { name: 'session-counter', storage: sessionStorage },
 *   ),
 * );
 * ```
 */
export function persist<T extends object>(
  creator: StateCreator<T>,
  options: PersistOptions<T>,
): StateCreator<T> {
  const {
    name,
    partialize = (s: T) => s as Partial<T>,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onRehydrateStorage,
    skipHydration = false,
  } = options;

  // Resolve storage lazily so this works in SSR / non-browser environments.
  const getStorage = (): typeof options.storage => {
    if (options.storage !== undefined) return options.storage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return undefined;
  };

  const saveToStorage = (getState: GetState<T>) => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const toSave = partialize(getState());
      storage.setItem(name, serialize(toSave));
    } catch {
      // Silently ignore quota/access errors so they never crash the app.
    }
  };

  return (baseSet, get, api: StoreApi<T>) => {
    // Replace api.setState so that ALL state updates — including external
    // calls to useStore.setState — go through our persistence logic.
    const originalSetState = baseSet;
    const patchedSetState: SetState<T> = (partial) => {
      originalSetState(partial);
      saveToStorage(get);
    };
    api.setState = patchedSetState;

    // Build the initial state with the original creator.
    const initialState = creator(patchedSetState, get, api);

    // Rehydrate from storage synchronously during store creation.
    if (!skipHydration) {
      const storage = getStorage();
      if (storage) {
        try {
          const raw = storage.getItem(name);
          if (raw !== null) {
            const restored = deserialize(raw);
            Object.assign(initialState, restored);
            onRehydrateStorage?.(initialState);
          }
        } catch {
          // Corrupt / missing storage – start with creator's defaults.
        }
      }
    }

    return initialState;
  };
}

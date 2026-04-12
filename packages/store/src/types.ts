/**
 * A function to update the store state.
 * Accepts either a partial state object or an updater function.
 */
export type SetState<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>),
) => void;

/**
 * A function that returns the current store state.
 */
export type GetState<T> = () => T;

/**
 * Subscribe to store state changes.
 * Returns an unsubscribe function.
 */
export type Subscribe<T> = (
  listener: (state: T, prevState: T) => void,
) => () => void;

/**
 * The store API object, available as static methods on the store hook.
 */
export interface StoreApi<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: Subscribe<T>;
}

/**
 * The initializer function passed to `createStore`.
 * Receives `set`, `get` and the shared mutable store `api`.
 * Middleware may override `api.setState` before the creator returns so that
 * all subsequent state updates — including external `useStore.setState` calls —
 * go through the middleware pipeline.
 */
export type StateCreator<T extends object> = (
  set: SetState<T>,
  get: GetState<T>,
  api: StoreApi<T>,
) => T;

/**
 * The store hook returned by `createStore`.
 * Calling it returns the reactive state object.
 * Static methods `getState`, `setState`, and `subscribe` are also available.
 */
export type UseStore<T extends object> = (() => T) & StoreApi<T>;

// ---------------------------------------------------------------------------
// Middleware types
// ---------------------------------------------------------------------------

/**
 * A minimal storage adapter interface compatible with the browser's
 * `localStorage` / `sessionStorage`.
 */
export interface StorageAdapter {
  getItem(name: string): string | null;
  setItem(name: string, value: string): void;
  removeItem(name: string): void;
}

/**
 * Options for the `persist` middleware.
 */
export interface PersistOptions<T> {
  /** The storage key under which the state is saved. */
  name: string;
  /**
   * Storage backend to use.
   * Defaults to `window.localStorage` when available, otherwise no-op.
   */
  storage?: StorageAdapter;
  /**
   * Pick which parts of the state to persist.
   * Receives the full state and returns the subset to store.
   * Defaults to the entire state.
   */
  partialize?: (state: T) => Partial<T>;
  /**
   * Custom serializer. Defaults to `JSON.stringify`.
   */
  serialize?: (state: Partial<T>) => string;
  /**
   * Custom deserializer. Defaults to `JSON.parse`.
   */
  deserialize?: (raw: string) => Partial<T>;
  /**
   * Called after the persisted state has been merged into the initial state.
   */
  onRehydrateStorage?: (state: T) => void;
  /**
   * When `true`, skip loading from storage during initialisation.
   * Defaults to `false`.
   */
  skipHydration?: boolean;
}

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
 * Receives `set` and `get` utilities to define the initial state and actions.
 */
export type StateCreator<T extends object> = (
  set: SetState<T>,
  get: GetState<T>,
) => T;

/**
 * The store hook returned by `createStore`.
 * Calling it returns the reactive state object.
 * Static methods `getState`, `setState`, and `subscribe` are also available.
 */
export type UseStore<T extends object> = (() => T) & StoreApi<T>;

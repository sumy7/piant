import { comparer, observable, reaction, runInAction, toJS } from 'mobx';
import type {
  GetState,
  SetState,
  StateCreator,
  StoreApi,
  Subscribe,
  UseStore,
} from './types';

/**
 * Creates a MobX-backed store with a zustand-style API.
 *
 * @param creator - Initializer function that receives `set`, `get`, and the
 *   shared store `api`. Middleware may replace `api.setState` before the
 *   creator returns so that all future state updates go through the middleware.
 * @returns A store hook that returns the reactive state object when called.
 *   The hook also exposes `getState`, `setState`, and `subscribe` as static methods.
 *
 * @example
 * ```ts
 * interface CounterState {
 *   count: number;
 *   increment: () => void;
 *   decrement: () => void;
 * }
 *
 * const useCounter = createStore<CounterState>((set) => ({
 *   count: 0,
 *   increment: () => set((s) => ({ count: s.count + 1 })),
 *   decrement: () => set((s) => ({ count: s.count - 1 })),
 * }));
 *
 * // In a piant component:
 * const state = useCounter();
 * state.count;       // reactive observable access
 * state.increment(); // triggers reactive updates
 * ```
 */
export function createStore<T extends object>(
  creator: StateCreator<T>,
): UseStore<T> {
  // Pre-initialize `state` to an empty observable so that `set` and `get`
  // calls inside the creator (e.g. for derived defaults or side effects)
  // are safe and never operate on `undefined`.
  let state = observable({}) as unknown as T;

  // Build a shared mutable api object so middleware can override setState.
  // Using `as` here because subscribe is wired up after `state` is initialised.
  const api = {} as StoreApi<T>;

  const coreSetState: SetState<T> = (partial) => {
    const update =
      typeof partial === 'function' ? partial(state) : partial;
    runInAction(() => {
      Object.assign(state, update);
    });
  };

  const getState: GetState<T> = () => state;

  // Expose setState via the shared api. Middleware may replace api.setState
  // before the creator returns; createStore will use whichever version is
  // present in api after the creator has run.
  api.setState = coreSetState;
  api.getState = getState;

  // Run creator to get initial state (may contain data + action functions).
  // Because `state` is already an observable, any `set`/`get` calls during
  // creator execution are safe.
  //
  // MobX's `observable()` automatically:
  //   - makes plain data properties observable
  //   - wraps functions as MobX actions (batched, no strict-mode warnings)
  //   - makes getter properties computed
  const initialState = creator(api.setState, getState, api);
  // Merge the creator's initial values into the pre-initialized observable.
  // Properties added to an MobX observable object are automatically observed.
  runInAction(() => {
    Object.assign(state, initialState);
  });

  const subscribe: Subscribe<T> = <U>(
    selectorOrListener:
      | ((state: T) => U)
      | ((state: T, prevState: T) => void),
    listenerOrUndefined?: (selected: U, prev: U) => void,
    options?: { equals?: (a: U, b: U) => boolean },
  ): (() => void) => {
    if (typeof listenerOrUndefined === 'function') {
      // Selector-based form — tracks only the selected slice.
      // Avoids the full toJS deep-clone cost of the whole-state form.
      const selector = selectorOrListener as (state: T) => U;
      const listener = listenerOrUndefined;
      const equals = options?.equals ?? comparer.structural;
      return reaction(
        () => selector(state),
        (curr, prev) => listener(curr, prev),
        { equals },
      );
    }
    // Whole-state form — deep snapshot via toJS for structural comparison.
    const listener = selectorOrListener as (state: T, prevState: T) => void;
    return reaction(
      () => toJS(state) as T,
      (curr, prev) => listener(curr, prev),
      { equals: comparer.structural },
    );
  };

  api.subscribe = subscribe;

  function useStore(): T {
    return state;
  }

  // Snapshot current api values (middleware may have overridden setState).
  useStore.getState = api.getState;
  useStore.setState = api.setState;
  useStore.subscribe = api.subscribe;

  return useStore as UseStore<T>;
}

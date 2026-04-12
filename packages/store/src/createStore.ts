import { comparer, observable, reaction, runInAction, toJS } from 'mobx';
import type {
  GetState,
  SetState,
  StateCreator,
  Subscribe,
  UseStore,
} from './types';

/**
 * Creates a MobX-backed store with a zustand-style API.
 *
 * @param creator - Initializer function that receives `set` and `get` helpers
 *   and returns the initial state (data + actions).
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
  // `state` is assigned after creator runs; captured via closure in set/get
  let state: T;

  const setState: SetState<T> = (partial) => {
    const update =
      typeof partial === 'function' ? partial(state) : partial;
    runInAction(() => {
      Object.assign(state, update);
    });
  };

  const getState: GetState<T> = () => state;

  // Run creator to get initial state (may contain data + action functions).
  // MobX's `observable()` automatically:
  //   - makes plain data properties observable
  //   - wraps functions as MobX actions (batched, no strict-mode warnings)
  //   - makes getter properties computed
  const initialState = creator(setState, getState);
  state = observable(initialState) as T;

  const subscribe: Subscribe<T> = (listener) => {
    return reaction(
      // Access all observable properties to establish tracking.
      // `toJS` does a deep plain-object snapshot for comparison.
      () => toJS(state) as T,
      (curr, prev) => listener(curr, prev),
      { equals: comparer.structural },
    );
  };

  function useStore(): T {
    return state;
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore as UseStore<T>;
}

import type { GetState, SetState, StateCreator, StoreApi } from '../types';

/**
 * Combines a plain initial state object with an actions creator into a single
 * `StateCreator`.
 *
 * This is the most common middleware pattern: keep data and actions separate
 * for clarity while still merging them into one store.
 *
 * @example
 * ```ts
 * const useStore = createStore(
 *   combine(
 *     { count: 0, text: 'hello' },
 *     (set, get) => ({
 *       increment: () => set((s) => ({ count: s.count + 1 })),
 *       getText: () => get().text,
 *     }),
 *   ),
 * );
 * ```
 */
export function combine<T extends object, A extends object>(
  initialState: T,
  actionsCreator: (
    set: SetState<T & A>,
    get: GetState<T & A>,
    api: StoreApi<T & A>,
  ) => A,
): StateCreator<T & A> {
  // `set`, `get`, `api` are all typed as `T & A` in the returned StateCreator,
  // so no unsafe casts are needed here.
  return (set, get, api) =>
    Object.assign({}, initialState, actionsCreator(set, get, api)) as T & A;
}

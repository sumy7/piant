import type { IObservableValue } from 'mobx';
import { observable, runInAction, untracked } from 'mobx';
import { cleanup, effect, memo } from './effects';
import { SYMBOL_ERRORS } from './errors';
import { getOwner } from './owner';
import type { Fn, Getter, Setter, UpdateFn } from './types';

export function createState<T>(
  initialValue: T,
): readonly [Getter<T>, Setter<T>];
export function createState<T = undefined>(): readonly [
  Getter<T | undefined>,
  Setter<T | undefined>,
];
export function createState<T>(initialValue?: T) {
  const value = observable.box<T | undefined>(initialValue);
  const getter: Getter<T | undefined> = () => value.get();
  const setter: Setter<T | undefined> = (v) => {
    const valueNext =
      typeof v === 'function' ? (v as UpdateFn<T | undefined>)(value.get()) : v;
    runInAction(() => {
      value.set(valueNext);
    });
    return valueNext;
  };
  return [getter as Getter<T>, setter as Setter<T>] as const;
}

export const createEffect = effect;

export const createMemo = memo;

export function onCleanup(fn: Fn) {
  cleanup(() => untracked(() => fn()));
}

export function onMount(fn: Fn) {
  effect(() => untracked(() => fn()));
}

export function onError(fn: (error: any) => void) {
  const currentOwner = getOwner();
  if (!currentOwner) return;
  currentOwner.context[SYMBOL_ERRORS] ||= [];
  currentOwner.context[SYMBOL_ERRORS].push(fn);
}

export function createSelector<T, U extends T>(
  source: () => T,
  fn: (a: U, b: T) => boolean = (a, b) => a === b,
) {
  let subs = new Map();
  let v: T;
  effect((p?: U) => {
    v = source();
    const keys = [...subs.keys()];
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      if (fn(key, v) || (p !== undefined && fn(key, p))) {
        const o = subs.get(key);
        o.set(null);
      }
    }
    return v as U;
  });
  return (key: U) => {
    let l: IObservableValue<U> & { _count?: number } = subs.get(key);
    if (!l) {
      l = observable.box<U>() as IObservableValue<U> & { _count?: number };
      subs.set(key, l);
    }
    l.get();
    if (l._count) {
      l._count++;
    } else {
      l._count = 1;
    }
    cleanup(() => (l._count! > 1 ? l._count!-- : subs.delete(key)));
    return fn(key, v);
  };
}

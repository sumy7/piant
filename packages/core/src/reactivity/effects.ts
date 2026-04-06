import { action, autorun, observable, untracked } from 'mobx';
import { createOwner, getOwner, runWithOwner } from './owner';
import type { EffectFn, Fn, Getter, MemoOptions, RootFn } from './types';

export function root<T>(fn: RootFn<T>) {
  const owner = createOwner();
  return runWithOwner(owner, () =>
    untracked(() =>
      fn(() => {
        const d = owner.disposables;
        const len = d.length;
        for (let k = 0; k < len; k++) d[k]();
        owner.disposables = [];
      }),
    ),
  );
}

export function cleanup(fn: () => void) {
  const owner = getOwner();
  if (!owner) return;
  owner.disposables.push(fn);
}

const eq = (a: unknown, b: unknown) => a === b;

export function effect<Next extends Prev, Prev = Next>(
  fn: EffectFn<undefined | NoInfer<Prev>, Next>,
): void;
export function effect<Next extends Prev, Init = Next, Prev = Next>(
  fn: EffectFn<Init | Prev, Next>,
  value: Init,
): void;
export function effect<Next extends Prev, Init, Prev>(
  fn: EffectFn<Init | Prev, Next>,
  value?: Init,
): void {
  const owner = createOwner();
  let currentValue: Next = value as unknown as Next;
  const cleanupFn = (final: boolean) => {
    const d = owner.disposables;
    owner.disposables = [];
    for (let k = 0; k < d.length; k++) d[k]();
    if (final) {
      dispose();
    }
  };

  const dispose = autorun(() => {
    cleanupFn(false);
    runWithOwner(owner, () => {
      currentValue = fn(currentValue);
    });
  });

  cleanup(() => cleanupFn(true));
}

export function memo<Next extends Prev, Prev = Next>(
  fn: EffectFn<undefined | NoInfer<Prev>, Next>,
): Getter<Next>;
export function memo<Next extends Prev, Init = Next, Prev = Next>(
  fn: EffectFn<Init | Prev, Next>,
  value: Init,
  options?: MemoOptions<Prev, Next>,
): Getter<Next>;
export function memo<Next extends Prev, Init, Prev>(
  fn: EffectFn<Init | Prev, Next>,
  value?: Init,
  options?: MemoOptions<Prev, Next>,
): Getter<Next> {
  const o = observable.box<Next>(value as unknown as Next);
  const update = action((r: Next) => o.set(r));
  effect<Next, Init>(
    (prev) => {
      const res = fn(prev);
      const equals = untrack(() => {
        const eqFn = options?.equals ?? eq;
        if (typeof eqFn === 'function') {
          return eqFn(prev as Prev, res);
        } else {
          return eqFn ?? false;
        }
      });
      !equals && update(res);
      return res;
    },
    value as unknown as Init,
  );
  return () => o.get()!;
}

export const untrack = untracked;

function resolveChildren(children: any): unknown {
  // `!children.length` avoids running functions that arent signals
  if (typeof children === 'function' && !children.length) {
    return memo(children);
  }
  if (Array.isArray(children)) {
    const results: any[] = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result)
        ? results.push.apply(results, result)
        : results.push(result);
    }
    return results;
  }
  return children;
}

type ChildrenReturn = Getter<any> & {
  toArray: () => any[];
};

export function children(fn: Fn<any>): ChildrenReturn {
  const memoChildren = memo(() => resolveChildren(fn()));
  (memoChildren as ChildrenReturn).toArray = () => {
    const c = memoChildren();
    return Array.isArray(c) ? c : c != null ? [c] : [];
  };
  return memoChildren as ChildrenReturn;
}

import type { Getter } from '../reactivity';
import { children as $children, memo, untrack } from '../reactivity/effects';

export type MatchProps<T> = {
  when?: T | false | null;
  keyed?: boolean;
  children?: JSX.Element;
};

export function Match<T>(props: MatchProps<T>) {
  return props as unknown;
}

export type SwitchProps = {
  fallback?: JSX.Element;
  children?: JSX.Element;
};

type MatchedCondition = readonly [number, Getter<unknown>, MatchProps<unknown>];

const eq = <T, K>(a: T, b: K) => Boolean(a) === Boolean(b);

export function Switch(props: SwitchProps) {
  const children = $children(() => props.children);
  const resolvedChildren = memo(() => {
    const flattenedChildren = [];
    const stack = [children()];
    do {
      const child = stack.pop();
      if (typeof child === 'function' && !(child as Getter<any>).length) {
        stack.push((child as Getter<any>)());
        continue;
      }
      if (Array.isArray(child)) {
        for (let i = child.length - 1; i >= 0; --i) {
          stack.push(child[i]);
        }
        continue;
      }
      flattenedChildren.push(child);
    } while (stack.length);
    return flattenedChildren;
  });
  const switchFn = memo(() => {
    const matches = resolvedChildren() as unknown as MatchProps<unknown>[];

    let fn: Getter<MatchedCondition | null> = () => null;
    for (let i = 0; i < matches.length; ++i) {
      const index = i;
      const prevFn = fn;
      const matchProps = matches[i];
      const when = memo(() => (prevFn() ? null : matchProps.when));
      const condition = matchProps.keyed
        ? when
        : memo(when, undefined, { equals: eq });
      fn = () => prevFn() ?? (condition() ? [index, when, matchProps] : null);
    }
    return fn;
  });

  return memo(() => {
    const selection = switchFn()();
    if (!selection) return props.fallback;
    const [index, condition, matchProps] = selection;
    const child = matchProps.children;
    return typeof child === 'function' && child.length
      ? untrack(() =>
          child(
            matchProps.keyed
              ? condition()
              : () => {
                  if (untrack(switchFn)()?.[0] === index) return condition();
                  throw new Error('Stale value access in <Match>');
                },
          ),
        )
      : child;
  });
}

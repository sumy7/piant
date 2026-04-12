import type { Getter } from '../reactivity';
import { children as $children, memo, untrack } from '../reactivity/effects';
import type { ComponentChild, ComponentValue } from './types';

export type MatchChildren<T> =
  | JSX.Element
  | ((value: T) => JSX.Element)
  | ((value: Getter<T | false | null>) => JSX.Element);

export type MatchProps<T extends ComponentValue> = {
  when?: T | false | null;
  keyed?: boolean;
  children?: MatchChildren<T>;
};

export function Match<T extends ComponentValue>(props: MatchProps<T>) {
  return props as MatchProps<T> & JSX.Element;
}

export type SwitchProps = {
  fallback?: JSX.Element;
  children?: ComponentChild;
};

type MatchedCondition = readonly [
  number,
  Getter<ComponentValue | false | null>,
  MatchProps<ComponentValue>,
];

const isZeroArgGetter = (
  value: ComponentChild,
): value is Getter<ComponentChild> =>
  typeof value === 'function' && !value.length;

const isMatchProps = (
  value: ComponentChild,
): value is MatchProps<ComponentValue> =>
  !!value &&
  typeof value === 'object' &&
  ('when' in value || 'keyed' in value || 'children' in value);

const eq = <T, K>(a: T, b: K) => Boolean(a) === Boolean(b);

export function Switch(props: SwitchProps) {
  const children = $children(() => props.children);
  const resolvedChildren = memo(() => {
    const flattenedChildren: MatchProps<ComponentValue>[] = [];
    const stack: ComponentChild[] = [children()];
    do {
      const child = stack.pop();
      if (child === undefined) {
        continue;
      }
      if (isZeroArgGetter(child)) {
        stack.push(child());
        continue;
      }
      if (Array.isArray(child)) {
        for (let i = child.length - 1; i >= 0; --i) {
          stack.push(child[i]);
        }
        continue;
      }
      if (isMatchProps(child)) {
        flattenedChildren.push(child);
      }
    } while (stack.length);
    return flattenedChildren;
  });
  const switchFn = memo(() => {
    const matches = resolvedChildren();

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
    if (typeof child === 'function' && child.length) {
      if (matchProps.keyed) {
        return untrack(() =>
          (child as (value: ComponentValue) => JSX.Element)(
            condition() as ComponentValue,
          ),
        );
      }

      return untrack(() =>
        (
          child as (value: Getter<ComponentValue | false | null>) => JSX.Element
        )(() => {
          if (untrack(switchFn)()?.[0] === index) return condition();
          throw new Error('Stale value access in <Match>');
        }),
      );
    }

    return child;
  });
}

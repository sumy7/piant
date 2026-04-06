import { untracked } from 'mobx';
import { memo } from '../reactivity';

export type ShowProps<T> = {
  when: T;
  children?: JSX.Element;
  fallback?: JSX.Element;
};

export function Show<T>(props: ShowProps<T>) {
  const condition = memo(() => props.when);
  return memo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      const fn = typeof child === 'function' && child.length > 0;
      return fn ? untracked(() => child(() => props.when)) : child;
    } else return props?.fallback || [];
  });
}

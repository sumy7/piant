import { type Getter, memo } from '../reactivity';
import { indexArray, mapArray } from '../reactivity/array';

export function For<T>(props: {
  each: T[];
  fallback?: JSX.Element;
  children: (item: T, index: Getter<number>) => JSX.Element;
}) {
  return memo(
    mapArray(
      () => props.each,
      props.children,
      'fallback' in props ? () => props.fallback : undefined,
    ),
  ) as unknown as JSX.Element;
}

export function Index<T>(props: {
  each: T[];
  fallback?: JSX.Element;
  children: (item: Getter<T>, index: number) => JSX.Element;
}) {
  return memo(
    indexArray(
      () => props.each,
      props.children,
      'fallback' in props ? () => props.fallback : undefined,
    ),
  ) as unknown as JSX.Element;
}

import { type Getter, memo } from '../reactivity';
import { indexArray, mapArray } from '../reactivity/array';

export type ForProps<T> = {
  each: T[];
  fallback?: JSX.Element;
  children: (item: T, index: Getter<number>) => JSX.Element;
};

export function For<T>(props: ForProps<T>) {
  return memo(
    mapArray(
      () => props.each,
      props.children,
      'fallback' in props ? () => props.fallback : undefined,
    ),
  ) as JSX.Element;
}

export type IndexProps<T> = {
  each: T[];
  fallback?: JSX.Element;
  children: (item: Getter<T>, index: number) => JSX.Element;
};

export function Index<T>(props: IndexProps<T>) {
  return memo(
    indexArray(
      () => props.each,
      props.children,
      'fallback' in props ? () => props.fallback : undefined,
    ),
  ) as JSX.Element;
}

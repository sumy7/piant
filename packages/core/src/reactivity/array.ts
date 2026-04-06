import { cleanup, root, untrack } from './effects';
import { createState } from './hooks';
import type { Getter, Setter } from './types';

type MapArrayEntry<T, U> = {
  value: U;
  rawValue: T;
  set: Setter<number>;
  dispose: () => void;
};
type IndexArrayEntry<T, U> = {
  value: U;
  set: Setter<T>;
  dispose: () => void;
};

const disposeMapArray = <T, U>(cache: MapArrayEntry<T, U>[]): void => {
  for (let i = 0; i < cache.length; ++i) cache[i].dispose();
};

function disposeIndexArray<T, U>(
  cache: IndexArrayEntry<T, U>[],
  start = 0,
): void {
  const length = start;
  while (start < cache.length) {
    cache[start++].dispose();
  }
  cache.length = length;
}

function createMapArrayEntry<T, U>(
  list: readonly T[],
  index: number,
  mapFn: (v: T, i: Getter<number>) => U,
): MapArrayEntry<T, U> {
  return root((disposer) => {
    const [getIndex, setIndex] = createState(index);
    return {
      set: setIndex,
      dispose: disposer,
      rawValue: list[index],
      value: mapFn(list[index], getIndex),
    };
  });
}

function createIndexArrayEntry<T, U>(
  list: readonly T[],
  index: number,
  mapFn: (v: Getter<T>, i: number) => U,
): IndexArrayEntry<T, U> {
  return root((disposer) => {
    const [getValue, setValue] = createState(list[index]);
    return {
      set: setValue,
      dispose: disposer,
      value: mapFn(getValue, index),
    };
  });
}

export function mapArray<T, U>(
  list: Getter<readonly T[] | false | null | undefined>,
  mapFn: (v: T, i: Getter<number>) => U,
  fallback?: Getter<any>,
): Getter<U[]> {
  const cache: MapArrayEntry<T, U>[] = [];
  let disposeFallback: (() => void) | undefined;
  cleanup(() => {
    disposeFallback ? disposeFallback() : disposeMapArray(cache);
  });
  return () => {
    const items = list() || [];
    return untrack(() => {
      if (!items.length) {
        if (cache.length) {
          disposeMapArray(cache);
          cache.length = 0;
        }
        if (fallback) {
          return [
            root((disposer) => {
              disposeFallback = disposer;
              return fallback();
            }),
          ];
        }
        return [];
      }
      const mapped: U[] = Array(items.length);
      if (disposeFallback) {
        disposeFallback();
        disposeFallback = undefined;
      }
      if (cache.length) {
        let start = 0;
        let end = items.length - 1;
        let prevEnd = cache.length - 1;
        const length = Math.min(cache.length, items.length);
        const temp: MapArrayEntry<T, U>[] = Array(items.length);
        while (start < length && cache[start].rawValue === items[start]) {
          mapped[start] = cache[start].value;
          start++;
        }
        while (
          start <= prevEnd &&
          start <= end &&
          cache[prevEnd].rawValue === items[end]
        ) {
          temp[end] = cache[prevEnd];
          prevEnd--;
          end--;
        }
        let entry: MapArrayEntry<T, U>;
        const indices = Array(end + 1);
        const keyToIndexMap = new Map<T, number>();
        for (let i = end; i >= start; --i) {
          const item = items[i];
          indices[i] = keyToIndexMap.get(item) ?? -1;
          keyToIndexMap.set(item, i);
        }
        for (let i = start; i <= prevEnd; ++i) {
          const { rawValue } = cache[i];
          const j = keyToIndexMap.get(rawValue)!;
          if (j > -1) {
            temp[j] = cache[i];
            keyToIndexMap.set(rawValue, indices[j]);
          } else {
            cache[i].dispose();
          }
        }
        for (let i = start; i < items.length; ++i) {
          if (temp[i]) {
            entry = temp[i];
            entry.set(i);
          } else {
            entry = createMapArrayEntry(items, i, mapFn);
          }
          mapped[i] = entry.value;
          cache[i] = entry;
        }
        cache.length = items.length;
      } else {
        for (let i = 0; i < items.length; ++i) {
          const entry = createMapArrayEntry(items, i, mapFn);
          mapped[i] = entry.value;
          cache.push(entry);
        }
      }
      return mapped;
    });
  };
}

export function indexArray<T, U>(
  list: Getter<readonly T[] | false | null | undefined>,
  mapFn: (v: Getter<T>, i: number) => U,
  fallback?: Getter<any>,
): Getter<U[]> {
  const cache: IndexArrayEntry<T, U>[] = [];
  let disposeFallback: (() => void) | undefined;
  cleanup(() => {
    disposeFallback ? disposeFallback() : disposeIndexArray(cache);
  });
  return () => {
    const items = list() || [];
    return untrack(() => {
      if (!items.length) {
        disposeIndexArray(cache);
        if (fallback) {
          return [
            root((disposer) => {
              disposeFallback = disposer;
              return fallback();
            }),
          ];
        }
        return [];
      }
      if (disposeFallback) {
        disposeFallback();
        disposeFallback = undefined;
      }
      let i = 0;
      let entry: IndexArrayEntry<T, U>;
      const mapped: U[] = Array(items.length);
      do {
        if (i < cache.length) {
          entry = cache[i];
          entry.set(() => items[i]);
        } else {
          entry = createIndexArrayEntry(items, i, mapFn);
          cache.push(entry);
        }
        mapped[i] = entry.value;
      } while (++i < items.length);
      disposeIndexArray(cache, i);
      return mapped;
    });
  };
}

import { describe, expect, it } from 'vitest';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';
import { indexArray, mapArray } from '../src/reactivity/array';

describe('mapArray', () => {
  it('maps an array of items', () => {
    root(() => {
      const [get] = createState([1, 2, 3]);
      const mapped = mapArray(get, (v) => v * 2);
      expect(mapped()).toEqual([2, 4, 6]);
    });
  });

  it('returns empty array for empty input', () => {
    root(() => {
      const [get] = createState<number[]>([]);
      const mapped = mapArray(get, (v) => v * 2);
      expect(mapped()).toEqual([]);
    });
  });

  it('returns fallback for empty list', () => {
    root(() => {
      const [get] = createState<number[]>([]);
      const mapped = mapArray(get, (v) => v, () => 'empty');
      expect(mapped()).toEqual(['empty']);
    });
  });

  it('updates reactively when list changes', () => {
    root(() => {
      const [get, set] = createState([1, 2, 3]);
      const mapped = mapArray(get, (v) => v * 10);
      expect(mapped()).toEqual([10, 20, 30]);
      set([4, 5]);
      expect(mapped()).toEqual([40, 50]);
    });
  });

  it('reuses mapped entries for unchanged items', () => {
    root(() => {
      const [get, set] = createState(['a', 'b', 'c']);
      const results: string[] = [];
      const mapped = mapArray(get, (v) => {
        results.push(v);
        return v.toUpperCase();
      });
      mapped();
      const countAfterFirst = results.length;
      // Change only the last item
      set(['a', 'b', 'd']);
      mapped();
      // 'a' and 'b' should be reused, only 'd' is new
      expect(results.length).toBe(countAfterFirst + 1);
      expect(results[results.length - 1]).toBe('d');
    });
  });

  it('transitions from non-empty to empty and shows fallback', () => {
    root(() => {
      const [get, set] = createState<string[]>(['x']);
      const mapped = mapArray(get, (v) => v, () => 'fallback');
      expect(mapped()).toEqual(['x']);
      set([]);
      expect(mapped()).toEqual(['fallback']);
    });
  });

  it('transitions from empty (fallback) back to non-empty', () => {
    root(() => {
      const [get, set] = createState<number[]>([]);
      const mapped = mapArray(get, (v) => v * 2, () => -1);
      expect(mapped()).toEqual([-1]);
      set([5]);
      expect(mapped()).toEqual([10]);
    });
  });

  it('returns empty array for null/undefined/false list', () => {
    root(() => {
      const [get] = createState<null>(null);
      const mapped = mapArray(get as any, (v: any) => v);
      expect(mapped()).toEqual([]);
    });
  });

  it('provides reactive index getter to mapFn', () => {
    root(() => {
      const [get, set] = createState(['a', 'b', 'c']);
      const indices: number[] = [];
      const mapped = mapArray(get, (_v, getIdx) => {
        return getIdx();
      });
      mapped();
      // Indices should be 0, 1, 2 initially
      expect(mapped()).toEqual([0, 1, 2]);
    });
  });
});

describe('indexArray', () => {
  it('maps an array with index-based entries', () => {
    root(() => {
      const [get] = createState([10, 20, 30]);
      const mapped = indexArray(get, (getV) => getV() * 2);
      expect(mapped()).toEqual([20, 40, 60]);
    });
  });

  it('returns empty array for empty input', () => {
    root(() => {
      const [get] = createState<number[]>([]);
      const mapped = indexArray(get, (getV) => getV());
      expect(mapped()).toEqual([]);
    });
  });

  it('returns fallback for empty list', () => {
    root(() => {
      const [get] = createState<number[]>([]);
      const mapped = indexArray(get, (getV) => getV(), () => 'empty');
      expect(mapped()).toEqual(['empty']);
    });
  });

  it('updates reactively as list grows', () => {
    root(() => {
      const [get, set] = createState([1, 2]);
      const mapped = indexArray(get, (getV) => getV() * 3);
      expect(mapped()).toEqual([3, 6]);
      set([1, 2, 3]);
      expect(mapped()).toEqual([3, 6, 9]);
    });
  });

  it('updates reactively as list shrinks', () => {
    root(() => {
      const [get, set] = createState([1, 2, 3]);
      const mapped = indexArray(get, (getV) => getV() * 3);
      expect(mapped()).toEqual([3, 6, 9]);
      set([1]);
      expect(mapped()).toEqual([3]);
    });
  });

  it('transitions from empty (fallback) back to non-empty', () => {
    root(() => {
      const [get, set] = createState<number[]>([]);
      const mapped = indexArray(get, (getV) => getV(), () => 'fb');
      expect(mapped()).toEqual(['fb']);
      set([7]);
      expect(mapped()).toEqual([7]);
    });
  });

  it('provides index to mapFn', () => {
    root(() => {
      const [get] = createState(['a', 'b', 'c']);
      const mapped = indexArray(get, (_getV, idx) => idx);
      expect(mapped()).toEqual([0, 1, 2]);
    });
  });
});

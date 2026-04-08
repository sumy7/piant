import { describe, expect, it } from 'vitest';
import { For, Index } from '../src/components/For';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('For', () => {
  it('maps each item to a child element', () => {
    root(() => {
      const result = For({
        each: [1, 2, 3],
        children: (item) => item * 10 as any,
      });
      expect((result as any)()).toEqual([10, 20, 30]);
    });
  });

  it('returns empty array for empty input', () => {
    root(() => {
      const result = For({
        each: [],
        children: (item: any) => item as any,
      });
      expect((result as any)()).toEqual([]);
    });
  });

  it('renders fallback when list is empty', () => {
    root(() => {
      const result = For({
        each: [],
        fallback: 'no items' as any,
        children: (item: any) => item as any,
      });
      expect((result as any)()).toEqual(['no items']);
    });
  });

  it('provides reactive index getter to children', () => {
    root(() => {
      const indices: number[] = [];
      For({
        each: ['a', 'b', 'c'],
        children: (_item, getIdx) => {
          indices.push(getIdx());
          return '' as any;
        },
      });
      expect(indices).toEqual([0, 1, 2]);
    });
  });

  it('reacts to array changes via reactive each prop', () => {
    root(() => {
      const [get, set] = createState([1, 2, 3]);
      const result = For({
        get each() { return get() as number[]; },
        children: (item) => item * 2 as any,
      });
      expect((result as any)()).toEqual([2, 4, 6]);
      set([4, 5]);
      expect((result as any)()).toEqual([8, 10]);
    });
  });
});

describe('Index', () => {
  it('maps each item with index-based getter', () => {
    root(() => {
      const result = Index({
        each: [10, 20, 30],
        children: (getItem) => getItem() as any,
      });
      expect((result as any)()).toEqual([10, 20, 30]);
    });
  });

  it('returns empty array for empty input', () => {
    root(() => {
      const result = Index({
        each: [],
        children: (getItem) => getItem() as any,
      });
      expect((result as any)()).toEqual([]);
    });
  });

  it('renders fallback when list is empty', () => {
    root(() => {
      const result = Index({
        each: [],
        fallback: 'empty' as any,
        children: (getItem) => getItem() as any,
      });
      expect((result as any)()).toEqual(['empty']);
    });
  });

  it('provides index to children', () => {
    root(() => {
      const indices: number[] = [];
      Index({
        each: ['a', 'b', 'c'],
        children: (_getItem, idx) => {
          indices.push(idx);
          return '' as any;
        },
      });
      expect(indices).toEqual([0, 1, 2]);
    });
  });
});

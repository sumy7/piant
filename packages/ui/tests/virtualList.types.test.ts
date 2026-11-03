import type { Getter, PScrollView } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import type {
  VirtualAlignment,
  VirtualListHandle,
  VirtualListProps,
  VirtualRange,
} from '../dist/components/VirtualList.js';

it('exposes keyed row getters, a public scroll node and complete collection positioning', () => {
  type Item = { key: string; name: string };
  expectTypeOf<NonNullable<VirtualListProps<Item>['children']>>()
    .parameter(0)
    .toEqualTypeOf<Getter<Item>>();
  expectTypeOf<NonNullable<VirtualListProps<Item>['children']>>()
    .parameter(1)
    .toEqualTypeOf<Getter<number>>();
  expectTypeOf<VirtualListHandle['node']>().toEqualTypeOf<PScrollView>();
  expectTypeOf<VirtualListHandle['range']>().toEqualTypeOf<
    Getter<VirtualRange>
  >();
  expectTypeOf<VirtualListHandle['scrollToKey']>().toEqualTypeOf<
    (key: string, align?: VirtualAlignment) => void
  >();
  expectTypeOf<VirtualListHandle['scrollToOffset']>().toEqualTypeOf<
    (offset: number) => void
  >();
});

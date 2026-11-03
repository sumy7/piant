import type { View } from '@piant/core';
import {
  createVirtualCollection,
  type VirtualCollectionProps,
} from './internal/virtualCollection';

export type {
  VirtualAlignment,
  VirtualListHandle,
  VirtualRange,
} from './internal/virtualCollection';
export interface VirtualListProps<T> extends VirtualCollectionProps<T> {}
/** A keyed, vertical, viewport-sized collection with estimated and measured rows. */
export function VirtualList<T>(
  props: VirtualListProps<T>,
): ReturnType<typeof View> {
  return createVirtualCollection(props);
}

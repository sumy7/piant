import {
  createMemo,
  type Getter,
  onCleanup,
  type PNode,
  root,
  untrack,
  type View,
} from '@piant/core';

/** Couple an independent reactive scope to both its parent owner and retained node. */
export function componentRoot(
  factory: () => PNode,
  ref?: Parameters<typeof View>[0]['ref'],
): Getter<PNode> {
  let stop = () => {};
  let removeDestroy = () => {};
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  };
  const result = root((cleanup) => {
    stop = cleanup;
    return createMemo(() =>
      untrack(() => {
        try {
          const node = factory();
          removeDestroy = node.onDestroy(dispose);
          ref?.(node as Parameters<NonNullable<typeof ref>>[0]);
          return node;
        } catch (error) {
          dispose();
          throw error;
        }
      }),
    );
  });
  onCleanup(dispose);
  return result;
}

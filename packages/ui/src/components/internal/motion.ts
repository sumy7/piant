import {
  createEffect,
  createState,
  onCleanup,
  onTick,
  type PNode,
  root,
} from '@piant/core';

/** A local clock; no ticker is registered for static, hidden or reduced-motion UI. */
export function motionPhase(node: PNode, period: () => number) {
  const [phase, setPhase] = createState(0);
  const [visible, setVisible] = createState(node.isVisible);
  let disposed = false;
  let removeDestroy = () => {};
  const stopLayout = node.observeLayout(() => setVisible(node.isVisible));
  const stop = root((dispose) => {
    createEffect(() => {
      const duration = period();
      if (!visible() || !Number.isFinite(duration) || duration <= 0) {
        setPhase(0);
        return;
      }
      let elapsed = 0;
      onTick((ticker) => {
        elapsed = (elapsed + ticker.deltaMS) % duration;
        setPhase(elapsed / duration);
      });
    });
    return dispose;
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    stopLayout();
    removeDestroy();
  }
  removeDestroy = node.onDestroy(dispose);
  onCleanup(dispose);
  return phase;
}

export function nonnegative(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

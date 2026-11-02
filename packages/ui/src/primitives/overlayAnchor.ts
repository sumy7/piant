import { attachDOMElement, onCleanup, type PNode } from '@piant/core';

export interface OverlayAnchor {
  /** Use getBoundingClientRect() to obtain viewport CSS-pixel geometry. */
  readonly element: HTMLElement;
  /** False while detached, hidden, fully clipped, or disposed. */
  readonly available: boolean;
  /** Observe retained-node layout/visibility changes while the overlay is open. */
  observe(listener: () => void): () => void;
  dispose(): void;
}

/** A noninteractive DOM geometry bridge attached through core's public API. */
export function createOverlayAnchor(node: PNode): OverlayAnchor {
  const element = document.createElement('span');
  element.style.cssText = 'opacity:0;pointer-events:none;';
  element.setAttribute('aria-hidden', 'true');
  const binding = attachDOMElement(node, element);
  const observers = new Set<() => void>();
  let disposed = false;
  let stopDestroy = () => {};
  const anchor: OverlayAnchor = {
    element,
    get available() {
      return (
        !disposed &&
        binding.visible &&
        !binding.hostElement.hidden &&
        element.isConnected
      );
    },
    observe(listener) {
      if (disposed || node.isDestroyed) return () => {};
      const stopLayout = node.observeLayout(listener);
      let active = true;
      const stop = () => {
        if (!active) return;
        active = false;
        stopLayout();
        observers.delete(stop);
      };
      observers.add(stop);
      return stop;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const stop of observers) stop();
      stopDestroy();
      binding.dispose();
    },
  };
  stopDestroy = node.onDestroy(anchor.dispose);
  onCleanup(anchor.dispose);
  return anchor;
}

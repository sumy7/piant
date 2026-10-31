import { DOMContainer } from 'pixi.js';
import { onCleanup } from '../reactivity/hooks';
import type { PNode } from './PNode';

export interface DOMElementBinding<T extends HTMLElement = HTMLElement> {
  readonly element: T;
  /** Zero-size positioned host used by Pixi's existing DOM render pipe. */
  readonly hostElement: HTMLDivElement;
  readonly container: DOMContainer;
  readonly visible: boolean;
  sync(): void;
  dispose(): void;
}

/** Attach one real DOM element to a retained node without owning its semantics. */
export function attachDOMElement<T extends HTMLElement>(
  node: PNode,
  element: T,
): DOMElementBinding<T> {
  const hostElement = element.ownerDocument.createElement('div');
  // DOMPipe changes its host to pointer-events:auto. A zero-area host prevents
  // semantic children with pointer-events:none from blocking Canvas hit testing.
  hostElement.style.cssText =
    'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none';
  hostElement.hidden = true;
  const geometry = ['position', 'left', 'top', 'width', 'height'] as const;
  const previous = geometry.map((name) => [
    name,
    element.style.getPropertyValue(name),
    element.style.getPropertyPriority(name),
  ]);
  element.style.position = 'absolute';
  element.style.left = '0';
  element.style.top = '0';
  hostElement.append(element);
  const container = new DOMContainer({ element: hostElement });
  let disposed = false;
  let stopLayout = () => {};
  let stopDestroy = () => {};
  const binding: DOMElementBinding<T> = {
    element,
    hostElement,
    container,
    get visible() {
      return !disposed && !container.destroyed && node.isVisible;
    },
    sync() {
      if (disposed || container.destroyed || node.isDestroyed) return;
      hostElement.hidden = !node.isVisible;
      element.style.width = `${node._layoutNode.getComputedWidth()}px`;
      element.style.height = `${node._layoutNode.getComputedHeight()}px`;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopLayout();
      stopDestroy();
      container.off('destroyed', binding.dispose);
      hostElement.hidden = true;
      if (!container.destroyed) container.destroy();
      element.remove();
      for (const [name, value, priority] of previous) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    },
  };
  if (node.isDestroyed) {
    binding.dispose();
    return binding;
  }
  const contentIndex = node._view.children.indexOf(node._viewContent);
  node._view.addChildAt(
    container,
    contentIndex < 0 ? node._view.children.length : contentIndex,
  );
  container.on('destroyed', binding.dispose);
  stopLayout = node.observeLayout(binding.sync);
  stopDestroy = node.onDestroy(binding.dispose);
  onCleanup(binding.dispose);
  binding.sync();
  return binding;
}

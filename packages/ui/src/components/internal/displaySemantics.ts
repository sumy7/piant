import {
  attachDOMElement,
  createEffect,
  createMemo,
  onCleanup,
  type PNode,
  root,
} from '@piant/core';

/** Optional display semantics, deliberately outside the interactive focus scope. */
export function displaySemantics(
  node: PNode,
  attributes: () => Record<string, string | number | undefined>,
) {
  let disposed = false;
  let removeDestroy = () => {};
  const stop = root((dispose) => {
    const labelled = createMemo(() => Boolean(attributes()['aria-label']));
    createEffect(() => {
      if (!labelled() || typeof document === 'undefined') return;
      const element = document.createElement('div');
      element.style.cssText = 'opacity:0;pointer-events:none;overflow:hidden;';
      createEffect(() => {
        for (const [name, value] of Object.entries(attributes())) {
          if (value === undefined) element.removeAttribute(name);
          else element.setAttribute(name, String(value));
        }
      });
      const binding = attachDOMElement(node, element);
      onCleanup(binding.dispose);
    });
    return dispose;
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  removeDestroy = node.onDestroy(dispose);
  onCleanup(dispose);
}

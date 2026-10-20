import { onError, PRoot, render } from '@piant/core';
import { Application } from 'pixi.js';

export type ExampleComponent = () => unknown;

export async function mountExample(
  host: HTMLElement,
  component: ExampleComponent,
  signal: AbortSignal,
  reportError: (error: unknown) => void,
): Promise<() => void> {
  const app = new Application();
  let root: PRoot | undefined;
  let dispose: (() => void) | undefined;
  let observer: ResizeObserver | undefined;
  let destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    try {
      dispose?.();
    } finally {
      try {
        root?.destroyRecursive();
      } finally {
        try {
          // PNode.destroy() currently leaves Yoga allocated; release this host's tree.
          root?._layoutNode.freeRecursive();
        } finally {
          if (app.renderer) app.destroy(true, { children: true });
          else app.stage.destroy({ children: true });
        }
      }
    }
  }

  try {
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      background: '#f8fafc',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    // Initialization cannot be interrupted; discard a late result after navigation/stop.
    if (signal.aborted) {
      destroy();
      return destroy;
    }

    host.appendChild(app.canvas);
    root = new PRoot(app.stage, {
      width: app.screen.width,
      height: app.screen.height,
    });
    dispose = render(() => {
      onError(reportError);
      return component();
    }, root);

    observer = new ResizeObserver(() => {
      app.renderer.resize(
        Math.max(1, host.clientWidth),
        Math.max(1, host.clientHeight),
      );
      root?.setStyle({ width: app.screen.width, height: app.screen.height });
    });
    observer.observe(host);
    return destroy;
  } catch (error) {
    destroy();
    throw error;
  }
}

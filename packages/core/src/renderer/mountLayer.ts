import {
  type Application,
  Container,
  DOMContainer,
  Graphics,
  Matrix,
  Rectangle,
  type Renderer,
} from 'pixi.js';
import { DOMHostContext } from '../elements/domHostContext';
import { PRoot } from '../elements/PRoot';
import { untrack } from '../reactivity/effects';
import { getOwner, runWithOwner } from '../reactivity/owner';
import { render } from './runtime';

export interface MountLayerOptions {
  /** Existing application that owns the Canvas and renderer. */
  app: Application;
  signal?: AbortSignal;
  /** Zero-origin ancestor of target, hosted in the application's DOM layer. */
  domHost?: HTMLElement;
  /** Draw a dimmer across the existing Canvas. Read again on resize/render. */
  backdrop?: boolean;
  /** Catch pointer hits in empty layer space while preserving child hits. */
  interactive?: boolean;
}

export interface MountedLayer {
  readonly app: Pick<Application, 'render'>;
  readonly root: PRoot;
  readonly canvas: HTMLCanvasElement;
  readonly isDestroyed: boolean;
  resize(width?: number, height?: number): void;
  destroy(): void;
}

const stageObservers = new WeakMap<
  Container,
  {
    listeners: Set<() => void>;
    release: () => void;
  }
>();

function observeStageRender(stage: Container, listener: () => void) {
  let observation = stageObservers.get(stage);
  if (!observation) {
    const listeners = new Set<() => void>();
    const previous = stage.onRender;
    const update = (renderer: Renderer) => {
      previous?.call(stage, renderer);
      for (const listener of listeners) listener();
    };
    observation = {
      listeners,
      release() {
        if (listeners.size) return;
        if (stage.onRender === update) stage.onRender = previous ?? null;
        stageObservers.delete(stage);
      },
    };
    stageObservers.set(stage, observation);
    stage.onRender = update;
  }
  observation.listeners.add(listener);
  return () => {
    observation.listeners.delete(listener);
    observation.release();
  };
}

/** Render an independently disposable layout layer using an existing Canvas. */
export async function mountLayer(
  component: () => unknown,
  target: HTMLElement,
  options: MountLayerOptions,
): Promise<MountedLayer> {
  const owner = getOwner();
  // Match mount's asynchronous creation boundary and avoid caller reaction reentry.
  await Promise.resolve();
  const { app, signal } = options;
  signal?.throwIfAborted();
  if (!app || app.stage.destroyed)
    throw new Error('[piant] mountLayer requires a live application.');

  const layer = new Container();
  // Keep DOMPipe's root attached even for a Canvas-only layer whose content
  // still needs a focusable semantic surface supplied by the caller.
  const marker = new DOMContainer({
    element: target.ownerDocument.createElement('div'),
  });
  marker.element.style.cssText = 'width:0;height:0;pointer-events:none;';
  const dimmer = new Graphics();
  const content = new Container();
  layer.addChild(marker, dimmer, content);
  app.stage.addChild(layer);
  // Flush Yoga with the application roots before Pixi prepares any layer
  // transforms. A content-level onRender would run after its parent's update.
  const root = new PRoot(app.stage, {
    width: 1,
    height: 1,
    overflow: 'hidden',
  });
  content.addChild(root._view);
  const domGroup = target.ownerDocument.createElement('div');
  domGroup.style.cssText =
    'position:absolute;width:0;height:0;pointer-events:none;';
  target.append(domGroup);
  if (options.domHost) app.domContainerRoot.append(options.domHost);
  let disposed = false;
  let stop: (() => void) | undefined;
  let stopStageRender = () => {};
  let fixedWidth: number | undefined;
  let fixedHeight: number | undefined;

  function syncTransform() {
    if (!disposed)
      layer.setFromMatrix(app.stage.getGlobalTransform(new Matrix()).invert());
  }

  function sync() {
    if (disposed) return;
    const canvas = app.canvas.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const sx = canvas.width / app.screen.width;
    const sy = canvas.height / app.screen.height;
    if (!(sx > 0) || !(sy > 0)) return;
    const x = (rect.left - canvas.left) / sx;
    const y = (rect.top - canvas.top) / sy;
    const width = fixedWidth ?? rect.width;
    const height = fixedHeight ?? rect.height;
    syncTransform();
    content.position.set(x, y);
    content.scale.set(1 / sx, 1 / sy);
    content.eventMode = options.interactive ? 'static' : 'passive';
    content.hitArea = options.interactive
      ? new Rectangle(0, 0, width, height)
      : null;
    root.setStyle({ width, height });
    root.doLayout();
    // DOMPipe writes renderer-world matrices, so this group's origin must stay
    // at the Canvas origin even though its semantic parent is the content box.
    domGroup.style.left = `${-x}px`;
    domGroup.style.top = `${-y}px`;
    dimmer.clear();
    if (options.backdrop)
      dimmer.rect(0, 0, app.screen.width, app.screen.height).fill({
        color: 0,
        alpha: 0.3,
      });
  }

  function resize(width?: number, height?: number) {
    for (const value of [width, height])
      if (value !== undefined && (!Number.isFinite(value) || value <= 0))
        throw new RangeError(
          '[piant] Layer dimensions must be positive finite numbers.',
        );
    fixedWidth = width ?? fixedWidth;
    fixedHeight = height ?? fixedHeight;
    sync();
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    let failure: unknown;
    let failed = false;
    for (const cleanup of [
      () => signal?.removeEventListener('abort', destroy),
      () => app.stage.off('destroyed', destroy),
      () => app.renderer.off('resize', sync),
      () => stopStageRender(),
      () => stop?.(),
      () => root.destroyRecursive(),
      () => domGroup.remove(),
      () => {
        if (!layer.destroyed) layer.destroy({ children: true });
      },
    ]) {
      try {
        cleanup();
      } catch (cause) {
        if (!failed) failure = cause;
        failed = true;
      }
    }
    if (failed) throw failure;
  }

  try {
    let failure: unknown;
    let failed = false;
    stop = runWithOwner(owner, () =>
      render(
        () =>
          DOMHostContext.Provider({
            value: domGroup,
            children: () => {
              try {
                return untrack(component);
              } catch (cause) {
                failed = true;
                failure = cause;
                return null;
              }
            },
          }),
        root,
      ),
    );
    if (failed) throw failure;
    signal?.throwIfAborted();
    stopStageRender = observeStageRender(app.stage, syncTransform);
    app.stage.on('destroyed', destroy);
    app.renderer.on('resize', sync);
    signal?.addEventListener('abort', destroy, { once: true });
    sync();
    return {
      app: {
        render() {
          if (disposed) return;
          sync();
          app.render();
        },
      },
      root,
      canvas: app.canvas,
      resize,
      destroy,
      get isDestroyed() {
        return disposed;
      },
    };
  } catch (cause) {
    try {
      destroy();
    } catch {
      /* Preserve the creation failure. */
    }
    throw cause;
  }
}

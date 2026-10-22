import { Application, type ApplicationOptions, EventsTicker } from 'pixi.js';
import type { PNode } from '../elements/PNode';
import { PRoot } from '../elements/PRoot';
import { render } from './runtime';

export type MountOptions = {
  target: HTMLElement | HTMLCanvasElement;
  /** Fixed logical size for this axis; otherwise read from the size source. */
  width?: number;
  height?: number;
  /** Defaults to the current devicePixelRatio. */
  resolution?: number;
  /** Containers observe themselves by default; existing canvases use a size snapshot. */
  resizeTo?: HTMLElement | false;
  signal?: AbortSignal;
  pixi?: Omit<
    Partial<ApplicationOptions>,
    | 'canvas'
    | 'view'
    | 'width'
    | 'height'
    | 'resolution'
    | 'resizeTo'
    | 'autoDensity'
    | 'sharedTicker'
    | 'webgl'
    | 'webgpu'
    | 'canvasOptions'
    | 'context'
    | 'multiView'
  >;
};

export type MountedApp = {
  readonly app: Application;
  readonly root: PRoot;
  readonly canvas: HTMLCanvasElement;
  readonly isDestroyed: boolean;
  /** Synchronize with the size source, or apply a one-time logical size. */
  resize(width?: number, height?: number): void;
  destroy(): void;
};

const targets = new WeakSet<HTMLElement>();
const applications = new Set<Application>();
const restoringCanvases = new WeakMap<HTMLCanvasElement, Promise<boolean>>();

function restoreCanvasContext(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
) {
  const extension = gl.getExtension('WEBGL_lose_context');
  if (!extension) return;
  const restoreContext = extension.restoreContext.bind(extension);
  const ready = new Promise<boolean>((resolve) => {
    let restoreTimer: ReturnType<typeof setTimeout>;
    const timeout = setTimeout(() => finish(false), 5000);
    function finish(restored: boolean) {
      clearTimeout(timeout);
      clearTimeout(restoreTimer);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restoredContext);
      resolve(restored);
    }
    function restoredContext() {
      finish(true);
    }
    function lost(event: Event) {
      // Pixi deliberately loses its context on destroy. Preserve a supplied canvas's reuse.
      event.preventDefault();
      restoreTimer = setTimeout(restoreContext, 0);
    }
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restoredContext);
    if (gl.isContextLost()) lost(new Event('webglcontextlost'));
  });
  restoringCanvases.set(canvas, ready);
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`[piant] ${name} must be a positive finite number.`);
  }
  return value;
}

function contentSize(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    width: Math.max(
      1,
      element.clientWidth -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0),
    ),
    height: Math.max(
      1,
      element.clientHeight -
        (parseFloat(style.paddingTop) || 0) -
        (parseFloat(style.paddingBottom) || 0),
    ),
  };
}

/** Create an independently owned Piant application in a browser host. */
export async function mount(
  component: () => unknown,
  options: MountOptions,
): Promise<MountedApp> {
  const { target, signal } = options;
  signal?.throwIfAborted();
  if (targets.has(target))
    throw new Error('[piant] Target already has a mounted application.');
  const existingCanvas =
    target.tagName === 'CANVAS' ? (target as HTMLCanvasElement) : undefined;
  const source =
    options.resizeTo === false
      ? undefined
      : (options.resizeTo ?? (existingCanvas ? undefined : target));
  if (source?.tagName === 'CANVAS') {
    throw new Error('[piant] resizeTo must be a container, not a canvas.');
  }
  const initialSize = contentSize(source ?? target);
  if (existingCanvas && !source) {
    if (!existingCanvas.clientWidth)
      initialSize.width = Math.max(1, existingCanvas.width);
    if (!existingCanvas.clientHeight)
      initialSize.height = Math.max(1, existingCanvas.height);
  }
  const width =
    options.width === undefined
      ? initialSize.width
      : positive(options.width, 'width');
  const height =
    options.height === undefined
      ? initialSize.height
      : positive(options.height, 'height');
  const resolution = () =>
    positive(options.resolution ?? window.devicePixelRatio ?? 1, 'resolution');
  resolution();
  const canvas = existingCanvas ?? document.createElement('canvas');
  const savedAttributes = new Map(
    ['width', 'height', 'style'].map((name) => [
      name,
      canvas.getAttribute(name),
    ]),
  );
  const app = new Application();
  targets.add(target);
  targets.add(canvas);
  let initialized = false;
  let destroyed = false;
  let root: PRoot | undefined;
  let dispose: (() => void) | undefined;
  let observer: ResizeObserver | undefined;

  function syncDOM() {
    const layer = app.domContainerRoot;
    if (!layer?.parentElement) return;
    const rect = canvas.getBoundingClientRect();
    const parent = layer.offsetParent as HTMLElement | null;
    const positioned =
      parent &&
      (parent !== document.body ||
        getComputedStyle(parent).position !== 'static');
    const origin = positioned ? parent.getBoundingClientRect() : undefined;
    const sx =
      origin && parent?.offsetWidth ? origin.width / parent.offsetWidth : 1;
    const sy =
      origin && parent?.offsetHeight ? origin.height / parent.offsetHeight : 1;
    const x =
      origin && parent
        ? (rect.left - origin.left) / sx + parent.scrollLeft - parent.clientLeft
        : rect.left + window.scrollX;
    const y =
      origin && parent
        ? (rect.top - origin.top) / sy + parent.scrollTop - parent.clientTop
        : rect.top + window.scrollY;
    layer.style.transformOrigin = '0 0';
    layer.style.transform = `translate(${x}px, ${y}px) scale(${rect.width / app.screen.width / sx}, ${rect.height / app.screen.height / sy})`;
  }
  const domRunner = { postrender: syncDOM };

  function syncRoot() {
    root?.setStyle({ width: app.screen.width, height: app.screen.height });
    root?.doLayout();
    syncDOM();
  }

  function resize(nextWidth?: number, nextHeight?: number) {
    if (destroyed) return;
    const size = source ? contentSize(source) : { width, height };
    app.renderer.resize(
      positive(nextWidth ?? options.width ?? size.width, 'width'),
      positive(nextHeight ?? options.height ?? size.height, 'height'),
      resolution(),
    );
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    const nodes: PNode[] = [];
    function collect(node: PNode) {
      nodes.push(node);
      for (const child of node._children) collect(child);
    }
    if (root) collect(root);
    const paused = EventsTicker.pauseUpdate;
    const frequency = EventsTicker.interactionFrequency;
    const tasks = [
      () => signal?.removeEventListener('abort', destroy),
      () => observer?.disconnect(),
      () => window.removeEventListener('resize', onWindowResize),
      () => window.removeEventListener('scroll', syncDOM, true),
      () => {
        if (initialized) app.renderer.runners.postrender.remove(domRunner);
      },
      () => {
        if (initialized) app.renderer.off('resize', syncRoot);
      },
      () => dispose?.(),
      () => root?.destroyRecursive(),
      // Recursive logical removal detaches children, so release the captured tree individually.
      ...nodes.map((node) => () => {
        if (!node._view.destroyed) node._view.destroy({ children: true });
      }),
      ...nodes.map((node) => () => node._layoutNode.free()),
      () => {
        applications.delete(app);
        if (existingCanvas && app.renderer && 'gl' in app.renderer) {
          restoreCanvasContext(existingCanvas, app.renderer.gl);
        }
        if (initialized) app.destroy(false, { children: true });
        else if (app.renderer) {
          // A later Application plugin may fail after the renderer/ticker were acquired.
          try {
            app.destroy(false, { children: true });
          } finally {
            app.ticker?.destroy();
            if (app.stage && !app.stage.destroyed)
              app.stage.destroy({ children: true });
            if (app.renderer) app.renderer.destroy(false);
          }
        } else app.stage.destroy({ children: true });
      },
      () => {
        // Pixi's event ticker is global. A renderer's destroy must not leave a live mount disconnected.
        const survivor = [...applications].at(-1);
        if (survivor) {
          EventsTicker.init(survivor.renderer.events);
          EventsTicker.domElement = survivor.canvas;
          EventsTicker.interactionFrequency = frequency;
          EventsTicker.pauseUpdate = paused;
          EventsTicker.addTickerListener();
        }
      },
      () => {
        if (existingCanvas) {
          for (const [name, value] of savedAttributes) {
            if (value === null) canvas.removeAttribute(name);
            else canvas.setAttribute(name, value);
          }
        } else canvas.remove();
      },
      () => targets.delete(target),
      () => targets.delete(canvas),
    ];
    let failure: unknown;
    let failed = false;
    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
    if (failed) throw failure;
  }

  function onWindowResize() {
    resize();
  }

  try {
    const restoring = restoringCanvases.get(canvas);
    if (restoring) {
      if (!(await restoring))
        throw new Error(
          '[piant] The canvas WebGL context could not be restored.',
        );
      restoringCanvases.delete(canvas);
      signal?.throwIfAborted();
    }
    await app.init({
      ...options.pixi,
      // Backend-specific options and the deprecated view alias must not override ownership.
      webgl: undefined,
      webgpu: undefined,
      canvasOptions: undefined,
      view: undefined,
      context: undefined,
      multiView: false,
      canvas,
      width,
      height,
      resolution: resolution(),
      autoDensity: true,
      sharedTicker: false,
      resizeTo: undefined,
    });
    initialized = true;
    applications.add(app);
    signal?.throwIfAborted();
    if (!existingCanvas) target.appendChild(canvas);
    root = new PRoot(app.stage, {
      width: app.screen.width,
      height: app.screen.height,
    });
    dispose = render(component, root);
    app.renderer.on('resize', syncRoot);
    app.renderer.runners.postrender.add(domRunner);
    if (source && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resize());
      observer.observe(source);
    }
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('scroll', syncDOM, true);
    signal?.addEventListener('abort', destroy, { once: true });
    // A synchronous component may abort during render before the abort listener exists.
    signal?.throwIfAborted();
    resize();
    return {
      app,
      root,
      canvas,
      resize,
      destroy,
      get isDestroyed() {
        return destroyed;
      },
    };
  } catch (error) {
    try {
      destroy();
    } catch {
      /* Preserve the original initialization/render error. */
    }
    throw error;
  }
}

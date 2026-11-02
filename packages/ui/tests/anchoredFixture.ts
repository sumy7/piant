import 'pixi.js/events';
import { type PNode, PRoot, render, View } from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
  Ticker,
} from 'pixi.js';
import { afterEach, beforeEach, vi } from 'vitest';
import { OverlayHost, UIProvider } from '../dist/index.js';

const runtime = vi.hoisted(() => ({
  pending: false,
  finish: [] as (() => void)[],
  destroyed: [] as ReturnType<typeof vi.fn>[],
  sync: [] as (() => void)[],
}));
function attach(scene: PNode, target: HTMLElement) {
  for (const child of scene._view.children)
    if (child instanceof DOMContainer && !target.contains(child.element))
      target.append(child.element);
  for (const child of scene._children) attach(child, target);
}
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  const pixi = await import('pixi.js');
  return {
    ...core,
    mount: vi.fn(async (component, target, options) => {
      if (runtime.pending)
        await new Promise<void>((resolve) => runtime.finish.push(resolve));
      // Real mount awaits renderer initialization before creating the scene.
      // Preserve that boundary to avoid reentering the caller's reactive render.
      await Promise.resolve();
      options.signal.throwIfAborted();
      const scene = new core.PRoot(new pixi.Container(), {
        width: 440,
        height: 320,
      });
      const stop = core.render(component, scene);
      let disposed = false;
      const sync = () => {
        if (disposed) return;
        attach(scene, target);
        scene.doLayout();
      };
      sync();
      runtime.sync.push(sync);
      const destroy = vi.fn(() => {
        stop();
        scene.destroyRecursive();
      });
      const dispose = () => {
        if (disposed) return;
        disposed = true;
        options.signal.removeEventListener('abort', dispose);
        runtime.sync.splice(runtime.sync.indexOf(sync), 1);
        destroy();
      };
      options.signal.addEventListener('abort', dispose, { once: true });
      runtime.destroyed.push(destroy);
      return {
        root: scene,
        canvas: document.createElement('canvas'),
        app: { render: sync },
        resize: (width: number, height: number) => {
          scene.setStyle({ width, height });
          sync();
        },
        destroy: dispose,
      };
    }),
  };
});
const cleanups: (() => void)[] = [];
beforeEach(() => {
  runtime.pending = false;
  runtime.finish = [];
  runtime.destroyed = [];
  runtime.sync = [];
  vi.spyOn(Ticker.shared, 'start').mockImplementation(() => {});
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal('OffscreenCanvas', undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        font: '14px Arial',
        setTransform() {},
        clearRect() {},
        fillText() {},
        fillRect() {},
        measureText: (value: string) => ({
          width: value.length * 7,
          actualBoundingBoxAscent: 11,
          actualBoundingBoxDescent: 3,
        }),
      }) as never,
  );
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value() {},
  });
});
afterEach(async () => {
  for (const stop of cleanups.splice(0).reverse()) stop();
  for (const finish of runtime.finish.splice(0)) finish();
  await settle();
  document.body.replaceChildren();
  delete (HTMLElement.prototype as unknown as { showPopover?: unknown })
    .showPopover;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
export async function settle() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
    for (const sync of [...runtime.sync]) sync();
  }
}
export function fixture(children: () => unknown, dark = () => false) {
  const target = document.createElement('div');
  document.body.append(target);
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 500,
    bottom: 400,
    width: 500,
    height: 400,
    toJSON() {},
  });
  const scene = new PRoot(new Container(), { width: 500, height: 400 });
  const stop = render(
    () =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        reducedMotion: false,
        children: () =>
          OverlayHost({
            target,
            children: () => View({ children: children() as JSX.Element }),
          }),
      }),
    scene,
  );
  const sync = () => {
    attach(scene, target);
    scene.doLayout();
  };
  sync();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    scene.destroyRecursive();
    target.remove();
  };
  cleanups.push(dispose);
  return { target, scene, sync, dispose };
}
export function named(name: string) {
  const result = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-label]'),
  ).find((element) => element.getAttribute('aria-label') === name);
  if (!result) throw new Error(`Missing ${name}`);
  return result;
}
export function key(
  element: HTMLElement,
  key: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}
export function press(name: string) {
  const element = named(name);
  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
      isPrimary: true,
    }),
  );
  element.focus();
  element.click();
}
export function outside(target: HTMLElement) {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    clientX: 450,
    clientY: 350,
    pointerId: 1,
  });
  target.dispatchEvent(event);
  return event;
}

export function pixiPointer(
  node: PNode,
  type: string,
  patch: Partial<FederatedPointerEvent> = {},
) {
  const event = new FederatedPointerEvent(new EventBoundary());
  Object.assign(
    event,
    {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    },
    patch,
  );
  node._view.emit(type, event);
  return event;
}

export { runtime };

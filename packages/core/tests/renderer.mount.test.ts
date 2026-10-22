import { EventBoundary, FederatedPointerEvent, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { View } from '../src/components/View';
import { effect } from '../src/reactivity/effects';
import { createState, onCleanup } from '../src/reactivity/hooks';
import { mount } from '../src/renderer/mount';

const state = vi.hoisted(() => ({
  init: vi.fn(),
  apps: [] as any[],
  observers: [] as any[],
  eventInit: vi.fn(),
  eventAdd: vi.fn(),
}));
vi.mock('pixi.js', async (original) => {
  const pixi = await original<typeof import('pixi.js')>();
  return {
    ...pixi,
    EventsTicker: {
      init: state.eventInit,
      addTickerListener: state.eventAdd,
      pauseUpdate: false,
      interactionFrequency: 10,
    },
    Application: class {
      stage = new pixi.Container();
      renderer: any;
      canvas!: HTMLCanvasElement;
      screen = { width: 0, height: 0 };
      domContainerRoot = document.createElement('div');
      destroy = vi.fn(() => {
        this.stage.destroy({ children: true });
      });
      constructor() {
        state.apps.push(this);
      }
      async init(options: any) {
        await state.init(options);
        this.canvas = options.canvas;
        const emitter = new pixi.Container();
        const listeners = new Set<any>();
        this.renderer = {
          events: {},
          runners: {
            postrender: {
              add: (listener: any) => listeners.add(listener),
              remove: (listener: any) => listeners.delete(listener),
            },
          },
          resize: vi.fn((width: number, height: number, resolution: number) => {
            this.screen.width = width;
            this.screen.height = height;
            this.canvas.width = width * resolution;
            this.canvas.height = height * resolution;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            emitter.emit('resize', width, height, resolution);
          }),
          on: emitter.on.bind(emitter),
          off: emitter.off.bind(emitter),
          destroy: vi.fn(),
        };
        this.renderer.resize(options.width, options.height, options.resolution);
      }
    },
  };
});

const cleanup: (() => void)[] = [];
function host(width = 320, height = 180) {
  const target = document.createElement('div');
  Object.defineProperties(target, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  });
  document.body.appendChild(target);
  return target;
}
beforeEach(() => {
  state.init.mockReset().mockResolvedValue(undefined);
  state.apps = [];
  state.observers = [];
  state.eventInit.mockClear();
  state.eventAdd.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(public callback: () => void) {
        state.observers.push(this);
      }
    },
  );
});
afterEach(() => {
  for (const destroy of cleanup.splice(0)) destroy();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('mount', () => {
  it('creates a host-sized canvas, tracks container changes and frees its tree exactly once', async () => {
    const target = host();
    const disposed = vi.fn();
    const instance = await mount(
      () => {
        onCleanup(disposed);
        return View({ style: { width: '100%', height: '100%' } });
      },
      { target, resolution: 2 },
    );
    cleanup.push(instance.destroy);
    expect(target.contains(instance.canvas)).toBe(true);
    expect(instance.canvas.width).toBe(640);
    expect(instance.canvas.style.width).toBe('320px');
    const child = instance.root.firstChild!;
    expect(child._layoutNode.getComputedWidth()).toBe(320);
    const rootFree = vi.spyOn(instance.root._layoutNode, 'free');
    const childFree = vi.spyOn(child._layoutNode, 'free');
    Object.defineProperty(target, 'clientWidth', { value: 440 });
    state.observers[0].callback();
    expect(instance.app.screen.width).toBe(440);
    expect(child._layoutNode.getComputedWidth()).toBe(440);
    instance.destroy();
    instance.destroy();
    expect(instance.isDestroyed).toBe(true);
    expect(disposed).toHaveBeenCalledOnce();
    expect(rootFree).toHaveBeenCalledOnce();
    expect(childFree).toHaveBeenCalledOnce();
    expect(child._view.destroyed).toBe(true);
    expect(state.apps[0].destroy).toHaveBeenCalledExactlyOnceWith(false, {
      children: true,
    });
    expect(state.observers[0].disconnect).toHaveBeenCalledOnce();
    expect(target.children).toHaveLength(0);
    instance.resize(900, 900);
    expect(instance.app.screen.width).toBe(440);
  });

  it('uses an existing canvas, custom dimensions, and restores host-owned attributes without removing it', async () => {
    const target = document.createElement('canvas');
    target.setAttribute('width', '777');
    target.setAttribute('style', 'border: 1px solid red; width: 50%');
    const original = target.outerHTML;
    const parent = host();
    parent.appendChild(target);
    const instance = await mount(() => View({}), {
      target,
      width: 240,
      height: 100,
      resolution: 2,
    });
    cleanup.push(instance.destroy);
    expect(instance.canvas).toBe(target);
    expect(instance.root._layoutStyle.width).toBe(240);
    expect(target.width).toBe(480);
    expect(target.style.width).toBe('240px');
    expect(state.observers).toHaveLength(0);
    instance.destroy();
    expect(target.parentElement).toBe(parent);
    expect(target.outerHTML).toBe(original);
    const rebuilt = await mount(() => View({}), { target });
    expect(rebuilt.app.screen).toMatchObject({ width: 777, height: 150 });
    cleanup.push(rebuilt.destroy);
  });

  it('isolates state, events, resize, owner and shared layout ticker across two instances', async () => {
    const removed = vi.spyOn(Ticker.shared, 'stop');
    const count: (() => number)[] = [];
    const disposed = [vi.fn(), vi.fn()];
    const make = (index: number) => () => {
      const [value, setValue] = createState(0);
      count[index] = value;
      onCleanup(disposed[index]);
      return View({ onClick: () => setValue(value() + 1) });
    };
    const left = await mount(make(0), { target: host(300, 200) });
    const right = await mount(make(1), { target: host(450, 250) });
    cleanup.push(left.destroy, right.destroy);
    left.root.firstChild!._view.emit(
      'pointertap',
      new FederatedPointerEvent(new EventBoundary()),
    );
    expect(count.map((get) => get())).toEqual([1, 0]);
    left.resize(220, 110);
    expect(right.root._layoutStyle.width).toBe(450);
    left.destroy();
    expect(right.root.isDestroyed).toBe(false);
    expect(disposed[1]).not.toHaveBeenCalled();
    right.root.firstChild!._view.emit(
      'pointertap',
      new FederatedPointerEvent(new EventBoundary()),
    );
    expect(count.map((get) => get())).toEqual([1, 1]);
    expect(state.eventInit).toHaveBeenLastCalledWith(
      state.apps[1].renderer.events,
    );
    expect(removed).not.toHaveBeenCalled();
  });

  it('cleans initialization failure and permits retrying the same target', async () => {
    const target = host();
    state.init.mockRejectedValueOnce(new Error('GPU unavailable'));
    await expect(mount(() => View({}), { target })).rejects.toThrow(
      'GPU unavailable',
    );
    expect(state.apps[0].stage.destroyed).toBe(true);
    expect(state.apps[0].destroy).not.toHaveBeenCalled();
    expect(target.children).toHaveLength(0);
    cleanup.push((await mount(() => View({}), { target })).destroy);
  });

  it('cancels initialization after it settles and does not execute the component', async () => {
    let finish!: () => void;
    state.init.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const controller = new AbortController();
    const target = host();
    const component = vi.fn();
    const pending = mount(component, { target, signal: controller.signal });
    controller.abort();
    expect(state.apps[0].destroy).not.toHaveBeenCalled();
    finish();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(component).not.toHaveBeenCalled();
    expect(state.apps[0].destroy).toHaveBeenCalledOnce();
    expect(target.children).toHaveLength(0);
  });

  it('aborts a mounted instance, rejects occupied targets and validates size before allocation', async () => {
    const target = host();
    const controller = new AbortController();
    const instance = await mount(() => View({}), {
      target,
      signal: controller.signal,
    });
    cleanup.push(instance.destroy);
    await expect(mount(() => View({}), { target })).rejects.toThrow('already');
    await expect(
      mount(() => View({}), { target: instance.canvas }),
    ).rejects.toThrow('already');
    controller.abort();
    expect(instance.isDestroyed).toBe(true);
    await expect(mount(() => View({}), { target, width: NaN })).rejects.toThrow(
      'positive',
    );
    await expect(
      mount(() => View({}), { target, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(state.apps).toHaveLength(1);
  });

  it('cleans the render owner and renderer on initial render failure', async () => {
    const disposed = vi.fn();
    const target = host();
    await expect(
      mount(
        () => {
          onCleanup(disposed);
          throw new Error('bad component');
        },
        { target },
      ),
    ).rejects.toThrow('bad component');
    expect(disposed).toHaveBeenCalledOnce();
    expect(state.apps[0].destroy).toHaveBeenCalledOnce();
    expect(target.children).toHaveLength(0);
  });

  it('uses a separate canvas size source with a fixed height', async () => {
    const source = host(510, 240);
    const canvas = document.createElement('canvas');
    source.appendChild(canvas);
    const instance = await mount(() => View({}), {
      target: canvas,
      resizeTo: source,
      height: 120,
    });
    cleanup.push(instance.destroy);
    Object.defineProperty(source, 'clientWidth', { value: 600 });
    state.observers[0].callback();
    expect(instance.app.screen).toMatchObject({ width: 600, height: 120 });
    expect(state.observers[0].observe).toHaveBeenCalledWith(source);
  });
  it('keeps root geometry synchronized with direct renderer resize', async () => {
    const instance = await mount(() => View({}), { target: host() });
    cleanup.push(instance.destroy);
    instance.app.renderer.resize(700, 210, 2);
    expect(instance.root._layoutStyle).toMatchObject({
      width: 700,
      height: 210,
    });
  });

  it('protects target ownership against untyped backend and deprecated view options', async () => {
    const target = host();
    const other = document.createElement('canvas');
    const instance = await mount(() => View({}), {
      target,
      pixi: { view: other, webgl: { canvas: other, width: 999 } } as never,
    });
    cleanup.push(instance.destroy);
    expect(state.init).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas: instance.canvas,
        view: undefined,
        webgl: undefined,
        canvasOptions: undefined,
        webgpu: undefined,
        sharedTicker: false,
      }),
    );
    expect(instance.app.screen.width).toBe(320);
  });

  it('finishes renderer and canvas cleanup even when user cleanup throws', async () => {
    const target = host();
    const runs = vi.fn();
    let change = () => {};
    const instance = await mount(
      () => {
        const [value, setValue] = createState(0);
        change = () => setValue(1);
        onCleanup(() => {
          throw new Error('cleanup failed');
        });
        effect(() => runs(value()));
        return View({});
      },
      { target },
    );
    cleanup.push(instance.destroy);
    expect(instance.destroy).toThrow('cleanup failed');
    expect(state.apps[0].destroy).toHaveBeenCalledOnce();
    expect(target.children).toHaveLength(0);
    expect(instance.root.isDestroyed).toBe(true);
    expect(instance.destroy).not.toThrow();
    change();
    expect(runs).toHaveBeenCalledTimes(1);
  });

  it('cleans when a component aborts during initial render', async () => {
    const controller = new AbortController();
    const target = host();
    await expect(
      mount(
        () => {
          controller.abort();
          return View({});
        },
        {
          target,
          signal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(state.apps[0].destroy).toHaveBeenCalledOnce();
    expect(target.children).toHaveLength(0);
  });

  it('compensates DOM input coordinates for positioned scrolled hosts after each render', async () => {
    const target = host();
    target.style.position = 'relative';
    const instance = await mount(() => View({}), { target });
    cleanup.push(instance.destroy);
    const layer = state.apps[0].domContainerRoot;
    target.appendChild(layer);
    Object.defineProperty(layer, 'offsetParent', { value: target });
    Object.defineProperties(target, {
      offsetWidth: { value: 320 },
      offsetHeight: { value: 180 },
      clientLeft: { value: 2 },
      clientTop: { value: 2 },
    });
    target.scrollLeft = 10;
    target.scrollTop = 20;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 200,
      width: 320,
      height: 180,
    } as DOMRect);
    vi.spyOn(instance.canvas, 'getBoundingClientRect').mockReturnValue({
      left: 112,
      top: 222,
      width: 320,
      height: 180,
    } as DOMRect);
    instance.resize();
    expect(layer.style.transform).toBe('translate(20px, 40px) scale(1, 1)');
    window.dispatchEvent(new Event('scroll'));
    expect(layer.style.transform).toBe('translate(20px, 40px) scale(1, 1)');
  });
  it('waits for a supplied canvas context to restore before reinitializing it', async () => {
    vi.useFakeTimers();
    try {
      const canvas = document.createElement('canvas');
      host().appendChild(canvas);
      const first = await mount(() => View({}), { target: canvas });
      cleanup.push(first.destroy);
      const restoreContext = vi.fn(() =>
        canvas.dispatchEvent(new Event('webglcontextrestored')),
      );
      state.apps[0].renderer.gl = {
        getExtension: () => ({ restoreContext }),
        isContextLost: () => false,
      };
      state.apps[0].destroy.mockImplementation(() => {
        state.apps[0].stage.destroy({ children: true });
        const lost = new Event('webglcontextlost', { cancelable: true });
        canvas.dispatchEvent(lost);
        expect(lost.defaultPrevented).toBe(true);
      });
      first.destroy();
      const second = mount(() => View({}), { target: canvas });
      expect(state.init).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      cleanup.push((await second).destroy);
      expect(restoreContext).toHaveBeenCalledOnce();
      expect(state.init).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

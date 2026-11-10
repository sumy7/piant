import 'pixi.js/events';
import type { Application, Renderer } from 'pixi.js';
import { Container, EventBoundary, Rectangle, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { View } from '../src/components/View';
import { attachDOMElement } from '../src/elements/attachDOMElement';
import type { PNode } from '../src/elements/PNode';
import { createContext, useContext } from '../src/reactivity/context';
import { root } from '../src/reactivity/effects';
import { onCleanup } from '../src/reactivity/hooks';
import { mountLayer } from '../src/renderer/mountLayer';

const cleanups: (() => void)[] = [];

function rect(
  element: HTMLElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON() {},
  });
}

function fixture() {
  const canvas = document.createElement('canvas');
  const domContainerRoot = document.createElement('div');
  const shell = document.createElement('div');
  const target = document.createElement('div');
  shell.append(target);
  document.body.append(canvas, domContainerRoot);
  rect(canvas, 10, 20, 400, 200);
  rect(target, 110, 70, 180, 90);
  const stage = new Container();
  const background = new Container();
  stage.addChild(background);
  const events = new Container();
  const render = vi.fn();
  const app = {
    stage,
    canvas,
    domContainerRoot,
    render,
    screen: { width: 800, height: 400 },
    renderer: { on: events.on.bind(events), off: events.off.bind(events) },
  } as unknown as Application;
  cleanups.push(() => {
    if (!stage.destroyed) stage.destroy({ children: true });
  });
  return { app, stage, background, shell, target, canvas, render, events };
}

beforeEach(() => {
  vi.spyOn(Ticker.shared, 'start').mockImplementation(() => {});
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('mountLayer', () => {
  it('inherits caller contexts across initialization while supplying its DOM host', async () => {
    const scene = fixture();
    const Context = createContext<string>();
    let value: string | undefined;
    let element!: HTMLElement;
    let pending!: ReturnType<typeof mountLayer>;
    const stop = root((dispose) => {
      Context.Provider({
        value: 'layer theme',
        children: () => {
          pending = mountLayer(
            () => {
              value = useContext(Context);
              const node = View({}) as PNode;
              element = attachDOMElement(
                node,
                document.createElement('input'),
              ).element;
              return node;
            },
            scene.target,
            { app: scene.app },
          );
          return null;
        },
      });
      return dispose;
    });
    cleanups.push(stop);
    const layer = await pending;
    cleanups.push(layer.destroy);
    expect(value).toBe('layer theme');
    expect(scene.target.contains(element)).toBe(true);
  });
  it('renders into the supplied Canvas and releases only its own scene', async () => {
    const scene = fixture();
    const cleanup = vi.fn();
    const layer = await mountLayer(
      () => {
        onCleanup(cleanup);
        return View({ style: { width: 80, height: 30 } });
      },
      scene.target,
      { app: scene.app, domHost: scene.shell },
    );
    expect(layer.canvas).toBe(scene.canvas);
    expect(document.querySelectorAll('canvas')).toHaveLength(1);
    expect(scene.stage.children).toHaveLength(2);
    expect(scene.app.domContainerRoot.contains(scene.shell)).toBe(true);
    layer.app.render();
    expect(scene.render).toHaveBeenCalledOnce();
    layer.destroy();
    layer.destroy();
    layer.app.render();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(layer.isDestroyed).toBe(true);
    expect(scene.render).toHaveBeenCalledOnce();
    expect(scene.stage.children).toEqual([scene.background]);
    expect(scene.stage.destroyed).toBe(false);
    expect(scene.canvas.isConnected).toBe(true);
  });

  it('cancels stage and CSS scale while keeping DOM transforms at the renderer origin', async () => {
    const scene = fixture();
    scene.stage.position.set(30, 40);
    scene.stage.scale.set(2, 3);
    let host!: HTMLElement;
    const layer = await mountLayer(
      () => {
        const node = View({ style: { width: 80, height: 30 } }) as PNode;
        host = attachDOMElement(
          node,
          document.createElement('input'),
        ).hostElement;
        return node;
      },
      scene.target,
      { app: scene.app, domHost: scene.shell },
    );
    cleanups.push(layer.destroy);
    expect(scene.target.contains(host)).toBe(true);
    expect(host.parentElement?.style.left).toBe('-200px');
    expect(host.parentElement?.style.top).toBe('-100px');
    const matrix = layer.root._view.parent!.getGlobalTransform();
    expect(matrix.a).toBeCloseTo(2);
    expect(matrix.d).toBeCloseTo(2);
    expect(matrix.tx).toBeCloseTo(200);
    expect(matrix.ty).toBeCloseTo(100);
    layer.resize(220, 100);
    expect(layer.root._layoutNode.getComputedWidth()).toBe(220);
    expect(layer.root._layoutNode.getComputedHeight()).toBe(100);
  });

  it('flushes layer layout at the application stage before preparing child transforms', async () => {
    const scene = fixture();
    const layer = await mountLayer(
      () => View({ style: { width: 80, height: 30 } }),
      scene.target,
      { app: scene.app },
    );
    cleanups.push(layer.destroy);
    const child = layer.root.firstChild!;
    child.setStyle({ width: 120 });
    expect(layer.root._isDirty).toBe(true);
    expect(child._layoutNode.getComputedWidth()).toBe(80);
    scene.stage.onRender?.({} as Renderer);
    expect(layer.root._isDirty).toBe(false);
    expect(child._layoutNode.getComputedWidth()).toBe(120);
    expect(layer.root._view.parent).toBe(scene.stage.children[1].children[2]);
  });

  it('reads a changing backdrop option on resize and preserves content identity', async () => {
    const scene = fixture();
    let backdrop = false;
    const layer = await mountLayer(() => View({}), scene.target, {
      app: scene.app,
      get backdrop() {
        return backdrop;
      },
    });
    cleanups.push(layer.destroy);
    const original = layer.root.firstChild;
    const dimmer = scene.stage.children[1].children[1];
    expect(dimmer.getLocalBounds().width).toBe(0);
    backdrop = true;
    layer.resize();
    expect(dimmer.getLocalBounds().width).toBe(800);
    expect(dimmer.getLocalBounds().height).toBe(400);
    expect(layer.root.firstChild).toBe(original);
  });

  it('shields blank interactive layer space while preserving child hits and opt-out passthrough', async () => {
    const scene = fixture();
    scene.background.eventMode = 'static';
    scene.background.hitArea = new Rectangle(0, 0, 800, 400);
    let interactive = false;
    let child!: Container;
    const layer = await mountLayer(
      () => {
        const node = View({ style: { width: 20, height: 20 } }) as PNode;
        child = node._view;
        child.eventMode = 'static';
        child.hitArea = new Rectangle(0, 0, 20, 20);
        return node;
      },
      scene.target,
      {
        app: scene.app,
        get interactive() {
          return interactive;
        },
      },
    );
    cleanups.push(layer.destroy);
    const content = layer.root._view.parent!;
    // The GPU-free fixture prepares the matrices a real render would cache.
    const updateWorld = (container: Container) => {
      container.worldTransform.copyFrom(container.getGlobalTransform());
      for (const child of container.children) updateWorld(child);
    };
    const boundary = new EventBoundary(scene.stage);
    updateWorld(scene.stage);
    expect(boundary.hitTest(300, 180)).toBe(scene.background);
    expect(boundary.hitTest(210, 110)).toBe(child);
    interactive = true;
    layer.resize();
    updateWorld(scene.stage);
    expect(boundary.hitTest(300, 180)).toBe(content);
    expect(boundary.hitTest(210, 110)).toBe(child);
    expect(boundary.hitTest(50, 50)).toBe(scene.background);
    layer.resize(100, 50);
    updateWorld(scene.stage);
    expect(boundary.hitTest(450, 150)).toBe(scene.background);
    interactive = false;
    layer.resize();
    updateWorld(scene.stage);
    expect(boundary.hitTest(300, 180)).toBe(scene.background);
  });

  it('keeps layer geometry stable while the owning stage transforms after opening', async () => {
    const scene = fixture();
    const layer = await mountLayer(() => View({}), scene.target, {
      app: scene.app,
    });
    cleanups.push(layer.destroy);
    const content = layer.root._view.parent!;
    const original = content.getGlobalTransform();
    const layout = vi.spyOn(layer.root, 'doLayout');
    scene.stage.position.set(80, 45);
    scene.stage.scale.set(1.5, 2);
    scene.stage.rotation = 0.2;
    scene.stage.onRender?.({} as Renderer);
    const current = content.getGlobalTransform();
    expect(current.a).toBeCloseTo(original.a);
    expect(current.b).toBeCloseTo(original.b);
    expect(current.c).toBeCloseTo(original.c);
    expect(current.d).toBeCloseTo(original.d);
    expect(current.tx).toBeCloseTo(original.tx);
    expect(current.ty).toBeCloseTo(original.ty);
    expect(layout).toHaveBeenCalledOnce();
  });

  it('keeps shared stage observers active until the last layer closes', async () => {
    const scene = fixture();
    const first = await mountLayer(() => View({}), scene.target, {
      app: scene.app,
    });
    const second = await mountLayer(() => View({}), scene.target, {
      app: scene.app,
    });
    cleanups.push(first.destroy, second.destroy);
    first.destroy();
    scene.stage.position.set(120, 70);
    scene.stage.onRender?.({} as Renderer);
    expect(second.root._view.parent!.getGlobalTransform().tx).toBeCloseTo(200);
    second.destroy();
    expect(scene.stage.onRender).toBeNull();
  });

  it('cancels stage changes made by an existing render callback in the same frame', async () => {
    const scene = fixture();
    const animate = vi.fn(() => {
      scene.stage.position.set(70, 35);
      scene.stage.scale.set(2, 3);
      scene.stage.rotation = 0.3;
    });
    scene.stage.onRender = animate;
    const layer = await mountLayer(() => View({}), scene.target, {
      app: scene.app,
    });
    cleanups.push(layer.destroy);
    const content = layer.root._view.parent!;
    const before = content.getGlobalTransform();
    scene.stage.onRender?.({} as Renderer);
    const after = content.getGlobalTransform();
    expect(animate).toHaveBeenCalledOnce();
    expect(after.a).toBeCloseTo(before.a);
    expect(after.b).toBeCloseTo(before.b);
    expect(after.c).toBeCloseTo(before.c);
    expect(after.d).toBeCloseTo(before.d);
    expect(after.tx).toBeCloseTo(before.tx);
    expect(after.ty).toBeCloseTo(before.ty);
    layer.destroy();
    expect(scene.stage.onRender).toBe(animate);
  });

  it('aborts before creating a layer and disposes an active layer once', async () => {
    const scene = fixture();
    const initial = new AbortController();
    const build = vi.fn(() => View({}));
    const pending = mountLayer(build, scene.target, {
      app: scene.app,
      signal: initial.signal,
    });
    initial.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(build).not.toHaveBeenCalled();
    expect(scene.stage.children).toEqual([scene.background]);
    const controller = new AbortController();
    const cleaned = vi.fn();
    const layer = await mountLayer(
      () => {
        onCleanup(cleaned);
        return View({});
      },
      scene.target,
      { app: scene.app, signal: controller.signal },
    );
    controller.abort();
    layer.destroy();
    expect(cleaned).toHaveBeenCalledOnce();
    expect(scene.stage.children).toEqual([scene.background]);
  });

  it('drains a throwing component and rejects with the original error', async () => {
    const scene = fixture();
    const error = new Error('broken layer');
    const cleanup = vi.fn();
    await expect(
      mountLayer(
        () => {
          onCleanup(cleanup);
          throw error;
        },
        scene.target,
        { app: scene.app },
      ),
    ).rejects.toBe(error);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(scene.stage.children).toEqual([scene.background]);
    expect(scene.target.childElementCount).toBe(0);
  });

  it('releases its owner when the parent stage is destroyed', async () => {
    const scene = fixture();
    const cleanup = vi.fn();
    const layer = await mountLayer(
      () => {
        onCleanup(cleanup);
        return View({});
      },
      scene.target,
      { app: scene.app },
    );
    scene.stage.destroy({ children: true });
    expect(layer.isDestroyed).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});

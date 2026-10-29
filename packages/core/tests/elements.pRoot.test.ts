import { Container, type Renderer, Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';

const roots: PRoot[] = [];

function createRoot() {
  const root = new PRoot(new Container(), { width: 300, height: 200 });
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) root.destroy();
  vi.restoreAllMocks();
});

describe('PRoot render scheduling', () => {
  it('preserves the host callback and lays out changes it makes before drawing', () => {
    const child = new PView();
    const stage = new Container({ isRenderGroup: true });
    const renderer = {} as Renderer;
    const onRender = vi.fn(function (this: Container, value: Renderer) {
      expect(this).toBe(stage);
      expect(value).toBe(renderer);
      child.setStyle({ width: 80, height: 30 });
    });
    stage.onRender = onRender;
    const root = new PRoot(stage, { width: 300, height: 200 });
    roots.push(root);
    root.appendChild(child);

    stage.renderGroup.runOnRender(renderer);

    expect(onRender).toHaveBeenCalledTimes(1);
    expect(child._view.width).toBe(80);
    root.destroy();
    expect(stage.onRender).toBe(onRender);
  });

  it('does not overwrite a host callback replaced by its owner', () => {
    const stage = new Container();
    const root = new PRoot(stage);
    roots.push(root);
    const replacement = vi.fn();
    stage.onRender = replacement;

    root.destroy();

    expect(stage.onRender).toBe(replacement);
  });

  it('flushes roots created by a layout observer during the same draw', () => {
    const stage = new Container({ isRenderGroup: true });
    const first = new PRoot(stage);
    roots.push(first);
    const child = new PView();
    child.setStyle({ width: 80, height: 30 });
    first.observe((event) => {
      if (event.type !== 'layout') return;
      const second = new PRoot(stage);
      roots.push(second);
      second.appendChild(child);
    });

    stage.renderGroup.runOnRender({} as Renderer);

    expect(child._view.width).toBe(80);
    expect(child._view.parent).toBe(roots.at(-1)!._viewContent);
  });

  it('releases the last render subscription safely after an observer destroys its root', async () => {
    const stage = new Container({ isRenderGroup: true });
    const root = new PRoot(stage);
    roots.push(root);
    const later = vi.fn();
    stage.addChild(new Container({ onRender: later }));
    root.observe((event) => {
      if (event.type === 'layout') root.destroyRecursive();
    });

    stage.renderGroup.runOnRender({} as Renderer);

    expect(root.isDestroyed).toBe(true);
    expect(later).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(stage.onRender).toBeNull();
    stage.renderGroup.runOnRender({} as Renderer);
    expect(later).toHaveBeenCalledTimes(2);
  });

  it('retains a new subscription created before pending hook cleanup', async () => {
    const stage = new Container({ isRenderGroup: true });
    const first = new PRoot(stage);
    roots.push(first);
    first.observe((event) => {
      if (event.type === 'layout') first.destroy();
    });
    stage.renderGroup.runOnRender({} as Renderer);
    const second = new PRoot(stage);
    roots.push(second);
    const child = new PView();
    child.setStyle({ width: 80, height: 30 });
    second.appendChild(child);

    await Promise.resolve();
    stage.renderGroup.runOnRender({} as Renderer);

    expect(child._view.width).toBe(80);
    expect(second._isDirty).toBe(false);
    second.destroy();
    expect(stage.onRender).toBeNull();
  });

  it.each(['destroy', 'destroyRecursive'] as const)(
    'keeps other render callbacks running when an observer calls %s',
    (destroy) => {
      const stage = new Container({ isRenderGroup: true });
      const first = new PRoot(stage, { width: 300, height: 200 });
      const second = new PRoot(stage, { width: 300, height: 200 });
      roots.push(first, second);
      const child = new PView();
      second.appendChild(child);
      const later = vi.fn();
      stage.addChild(new Container({ onRender: later }));
      first.observe((event) => {
        if (event.type === 'layout') first[destroy]();
      });

      stage.renderGroup.runOnRender({} as Renderer);

      expect(first.isDestroyed).toBe(true);
      expect(second._isDirty).toBe(false);
      expect(child._view.parent).toBe(second._viewContent);
      expect(later).toHaveBeenCalledTimes(1);
      second.removeAllChildren();
    },
  );

  it('lays out a replacement before Pixi draws, even without a shared ticker update', () => {
    const stage = new Container({ isRenderGroup: true });
    const root = new PRoot(stage, { width: 300, height: 200 });
    roots.push(root);
    const previous = new PView();
    previous.setStyle({ width: 40, height: 20 });
    root.appendChild(previous);
    root.doLayout();
    const replacement = new PView();
    replacement.setStyle({ width: 80, height: 30 });
    root.replaceChild(replacement, previous);
    expect(previous._view.parent).toBeNull();

    // Pixi runs these callbacks before building transforms/render instructions.
    // The application's ticker can draw before Ticker.shared next runs layout.
    stage.renderGroup.runOnRender({} as Renderer);

    expect(root._viewContent.children).toEqual([replacement._view]);
    expect(replacement._view.width).toBe(80);
    expect(replacement._view.height).toBe(30);
    expect(root._isDirty).toBe(false);
    root.removeAllChildren();
  });

  it('batches rapid changes and skips clean draws, then releases its render callback', () => {
    const stage = new Container({ isRenderGroup: true });
    const root = new PRoot(stage, { width: 300, height: 200 });
    roots.push(root);
    const child = new PView();
    root.appendChild(child);
    const layout = vi.spyOn(root._layoutNode, 'calculateLayout');
    for (let width = 10; width <= 100; width += 10) {
      child.setStyle({ width, height: 20 });
    }

    stage.renderGroup.runOnRender({} as Renderer);
    stage.renderGroup.runOnRender({} as Renderer);
    expect(child._view.width).toBe(100);
    expect(layout).toHaveBeenCalledTimes(1);
    Ticker.shared.update(performance.now());
    expect(layout).toHaveBeenCalledTimes(1);
    root.destroy();
    root.markDirty();
    stage.renderGroup.runOnRender({} as Renderer);
    expect(layout).toHaveBeenCalledTimes(1);
  });
});

describe('PRoot observation', () => {
  it('reports completed dirty layouts with measured duration and applied child geometry', () => {
    const root = createRoot();
    const child = new PView();
    child.setStyle({ width: 40, height: 20 });
    root.appendChild(child);
    const now = vi
      .spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(14);
    const listener = vi.fn(() => {
      expect(child._view.width).toBe(40);
      expect(child._view.height).toBe(20);
      expect(child._view.parent).toBe(root._viewContent);
    });
    const stop = root.observe(listener);

    root.doLayout();
    root.doLayout();

    expect(listener).toHaveBeenCalledExactlyOnceWith({
      type: 'layout',
      duration: 4,
    });
    expect(now).toHaveBeenCalledTimes(2);
    stop();
  });

  it('does not measure unobserved layouts or keep sampling after unsubscribe', () => {
    const root = createRoot();
    const now = vi.spyOn(performance, 'now');
    root.doLayout();
    expect(now).not.toHaveBeenCalled();
    const listener = vi.fn();
    const stop = root.observe(listener);
    root.markDirty();
    root.doLayout();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    stop();
    now.mockClear();
    root.markDirty();
    root.doLayout();
    expect(now).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('allows a listener to remove itself and another listener during layout notification', () => {
    const root = createRoot();
    const later = vi.fn();
    let stopLater = () => {};
    const first = vi.fn(() => {
      stopFirst();
      stopLater();
    });
    const stopFirst = root.observe(first);
    stopLater = root.observe(later);

    root.doLayout();
    root.markDirty();
    root.doLayout();

    expect(first).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();
  });

  it('isolates observer errors from rendering and other observers', () => {
    const root = createRoot();
    const error = new Error('Inspector failure');
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    root.observe(() => {
      throw error;
    });
    const listener = vi.fn();
    root.observe(listener);

    expect(() => root.doLayout()).not.toThrow();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'layout' }),
    );
    expect(() => root.destroy()).not.toThrow();
    expect(listener).toHaveBeenLastCalledWith({ type: 'destroy' });
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith('[piant] Root observer failed.', error);
  });

  it('removes the ticker, notifies destruction once and rejects further observation', () => {
    const root = createRoot();
    expect(root.isDestroyed).toBe(false);
    const remove = vi.spyOn(Ticker.shared, 'remove');
    const listener = vi.fn();
    root.observe(listener);
    root.destroy();
    expect(root.isDestroyed).toBe(true);
    root.destroy();
    const lateListener = vi.fn();
    const stop = root.observe(lateListener);
    root.markDirty();
    root.doLayout();
    stop();

    expect(remove).toHaveBeenCalledExactlyOnceWith(root.doLayout, root);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ type: 'destroy' });
    expect(lateListener).not.toHaveBeenCalled();
  });

  it('allows observers to unsubscribe and request destruction again during teardown', () => {
    const root = createRoot();
    let stopLater = () => {};
    const listener = vi.fn(() => {
      stopLater();
      root.destroy();
    });
    root.observe(listener);
    const later = vi.fn();
    stopLater = root.observe(later);

    root.destroy();

    expect(listener).toHaveBeenCalledExactlyOnceWith({ type: 'destroy' });
    expect(later).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'stops layout and observation when the render container is destroyed with children=%s',
    (children) => {
      const stage = new Container();
      const root = new PRoot(stage, { width: 300, height: 200 });
      roots.push(root);
      const applyLayout = vi.spyOn(root, 'applyLayout');
      const remove = vi.spyOn(Ticker.shared, 'remove');
      const listener = vi.fn();
      const stop = root.observe(listener);
      const unsubscribed = vi.fn();
      root.observe(unsubscribed)();

      stage.destroy({ children });
      root.markDirty();
      expect(() => root.doLayout()).not.toThrow();
      stop();

      expect(root.isDestroyed).toBe(true);
      expect(remove).toHaveBeenCalledExactlyOnceWith(root.doLayout, root);
      expect(listener).toHaveBeenCalledExactlyOnceWith({ type: 'destroy' });
      expect(unsubscribed).not.toHaveBeenCalled();
      expect(applyLayout).not.toHaveBeenCalled();
      expect(stage.listenerCount('destroyed')).toBe(0);
      expect(root._view.destroyed).toBe(true);
    },
  );

  it('releases its container listener without destroying the container when destroyed first', () => {
    const stage = new Container();
    const root = new PRoot(stage);
    roots.push(root);
    const listener = vi.fn();
    root.observe(listener);
    const unrelated = vi.fn();
    stage.on('destroyed', unrelated);
    expect(stage.listenerCount('destroyed')).toBe(2);

    root.destroy();

    expect(stage.destroyed).toBe(false);
    expect(stage.listenerCount('destroyed')).toBe(1);
    stage.destroy({ children: true });
    expect(unrelated).toHaveBeenCalledExactlyOnceWith(stage);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ type: 'destroy' });
  });
});

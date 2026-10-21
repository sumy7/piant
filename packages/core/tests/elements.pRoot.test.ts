import { Container, Ticker } from 'pixi.js';
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
      expect(root._view.destroyed).toBe(children);
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

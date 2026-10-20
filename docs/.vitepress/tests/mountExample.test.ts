import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountExample } from '../theme/mountExample';

const mocks = vi.hoisted(() => ({
  rendererReady: true,
  init: vi.fn(),
  destroy: vi.fn(),
  stageDestroy: vi.fn(),
  rootDestroy: vi.fn(),
  freeLayout: vi.fn(),
  dispose: vi.fn(),
  render: vi.fn(),
  setStyle: vi.fn(),
  resize: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  onError: vi.fn(),
  resizeCallback: undefined as (() => void) | undefined,
}));

vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    stage = { destroy: mocks.stageDestroy };
    screen = { width: 640, height: 300 };
    renderer = mocks.rendererReady ? { resize: mocks.resize } : undefined;
    init = mocks.init;
    destroy(...args: unknown[]) {
      this.canvas.remove();
      mocks.destroy(...args);
    }
  },
}));

vi.mock('@piant/core', () => ({
  PRoot: class {
    _layoutNode = { freeRecursive: mocks.freeLayout };
    setStyle = mocks.setStyle;
    destroyRecursive = mocks.rootDestroy;
  },
  render: mocks.render,
  onError: mocks.onError,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rendererReady = true;
  mocks.init.mockResolvedValue(undefined);
  mocks.render.mockImplementation((component) => {
    component();
    return mocks.dispose;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        mocks.resizeCallback = callback;
      }
      observe = mocks.observe;
      disconnect = mocks.disconnect;
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createHost() {
  const host = document.createElement('div');
  Object.defineProperties(host, {
    clientWidth: { value: 640 },
    clientHeight: { value: 300 },
  });
  return host;
}

describe('example canvas lifecycle', () => {
  it('sizes to the host and cleans the owner, ticker, observer and canvas exactly once', async () => {
    const host = createHost();
    const component = vi.fn();
    const reportError = vi.fn();
    const cleanup = await mountExample(
      host,
      component,
      new AbortController().signal,
      reportError,
    );
    expect(component).toHaveBeenCalledOnce();
    expect(mocks.onError).toHaveBeenCalledWith(reportError);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(mocks.init).toHaveBeenCalledWith(
      expect.objectContaining({ width: 640, height: 300 }),
    );
    expect(mocks.observe).toHaveBeenCalledWith(host);

    mocks.resizeCallback?.();
    expect(mocks.resize).toHaveBeenCalledWith(640, 300);
    expect(mocks.setStyle).toHaveBeenCalledWith({ width: 640, height: 300 });

    cleanup();
    cleanup();
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.rootDestroy).toHaveBeenCalledOnce();
    expect(mocks.freeLayout).toHaveBeenCalledOnce();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledExactlyOnceWith(true, {
      children: true,
    });
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('discards initialization that finishes after stop or navigation', async () => {
    let finishInit: () => void = () => {};
    mocks.init.mockReturnValue(
      new Promise<void>((resolve) => {
        finishInit = resolve;
      }),
    );
    const host = createHost();
    const controller = new AbortController();
    const pending = mountExample(host, vi.fn(), controller.signal, vi.fn());
    controller.abort();
    finishInit();
    const cleanup = await pending;
    cleanup();
    expect(host.childElementCount).toBe(0);
    expect(mocks.render).not.toHaveBeenCalled();
    expect(mocks.observe).not.toHaveBeenCalled();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });

  it('releases the renderer when rendering fails', async () => {
    mocks.render.mockImplementation(() => {
      throw new Error('broken example');
    });
    const host = createHost();
    await expect(
      mountExample(host, vi.fn(), new AbortController().signal, vi.fn()),
    ).rejects.toThrow('broken example');
    expect(mocks.rootDestroy).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(host.childElementCount).toBe(0);
  });

  it('surfaces initialization failures and releases allocated resources', async () => {
    mocks.rendererReady = false;
    mocks.init.mockRejectedValue(new Error('WebGL unavailable'));
    await expect(
      mountExample(
        createHost(),
        vi.fn(),
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toThrow('WebGL unavailable');
    expect(mocks.stageDestroy).toHaveBeenCalledExactlyOnceWith({ children: true });
    expect(mocks.destroy).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});

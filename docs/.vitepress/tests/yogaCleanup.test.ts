import { onCleanup, type PNode, View } from '@piant/core';
import { afterEach, expect, it, vi } from 'vitest';
import { mountExample } from '../theme/mountExample';

// Use real Piant/Yoga nodes. Only the GPU application is replaced for this test.
vi.mock('pixi.js', async (importOriginal) => {
  const pixi = await importOriginal<typeof import('pixi.js')>();
  return {
    ...pixi,
    Application: class {
      canvas = document.createElement('canvas');
      stage = new pixi.Container();
      screen = { width: 320, height: 300 };
      renderer = { resize: vi.fn() };
      async init() {}
      destroy() {
        this.stage.destroy({ children: true });
        this.canvas.remove();
      }
    },
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('disposes a real reactive owner and frees the real Yoga tree on stop', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  let child: PNode | undefined;
  const disposeOwner = vi.fn();
  const cleanup = await mountExample(
    document.createElement('div'),
    () => {
      onCleanup(disposeOwner);
      return View({
        ref: (node) => {
          child = node;
        },
        style: { width: 100, height: 100 },
      });
    },
    new AbortController().signal,
    (error) => {
      throw error;
    },
  );
  const root = child!._root!;
  expect(root._layoutNode.getChildCount()).toBe(1);
  const free = vi.spyOn(root._layoutNode, 'freeRecursive');
  const freeRoot = vi.spyOn(root._layoutNode, 'free');

  cleanup();
  cleanup();
  expect(disposeOwner).toHaveBeenCalledOnce();
  expect(free).toHaveBeenCalledOnce();
  expect(freeRoot).toHaveBeenCalledOnce();
});

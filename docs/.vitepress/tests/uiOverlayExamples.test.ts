import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import UIOverlayExample from '../../examples/uiOverlay';
import UIOverlayInstancesExample from '../../examples/uiOverlayInstances';

const runtime = vi.hoisted(() => ({
  target: undefined as HTMLElement | undefined,
  scenes: [] as Array<{
    root: PRoot;
    target: HTMLElement;
    destroy: () => void;
  }>,
}));

vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  const { Container } = await import('pixi.js');
  const createMount = vi.fn(
    async (
      create: () => unknown,
      target: HTMLElement,
      options = {} as { signal?: AbortSignal },
    ) => {
      const owner = core.getOwner();
      await Promise.resolve();
      options.signal?.throwIfAborted();
      const scene = new core.PRoot(new Container(), {
        width: 360,
        height: 270,
      });
      const previous = runtime.target;
      runtime.target = target;
      let dispose = () => {};
      try {
        dispose = core.render(() => core.runWithOwner(owner, create), scene);
      } finally {
        runtime.target = previous;
      }
      let destroyed = false;
      function destroy() {
        if (destroyed) return;
        destroyed = true;
        options.signal?.removeEventListener('abort', destroy);
        dispose();
        scene.destroyRecursive();
      }
      const entry = { root: scene, target, destroy };
      runtime.scenes.push(entry);
      options.signal?.addEventListener('abort', destroy, { once: true });
      return {
        root: scene,
        destroy,
        get isDestroyed() {
          return destroyed;
        },
        resize: vi.fn(),
        app: { render: vi.fn() },
      };
    },
  );
  return {
    ...core,
    useMountSurface: () => runtime.target && { target: runtime.target },
    // Run actual compiled Piant content and lifecycle, replacing only GPU mount.
    mount: vi.fn((create, target, options) =>
      createMount(create, target, options),
    ),
    mountLayer: vi.fn((create, target, options) =>
      createMount(create, target, options),
    ),
  };
});

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
const originalPopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'showPopover',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value() {},
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      font: '14px Arial',
      setTransform() {},
      clearRect() {},
      fillText() {},
      fillRect() {},
      measureText(text: string) {
        const size = Number.parseFloat(
          this.font.match(/([\d.]+)px/)?.[1] ?? '14',
        );
        return {
          width: [...text].length * size * 0.5,
          actualBoundingBoxAscent: size * 0.75,
          actualBoundingBoxDescent: size * 0.25,
        };
      },
    }),
  });
});
afterEach(() => {
  for (const scene of runtime.scenes.splice(0).reverse()) scene.destroy();
  runtime.target = undefined;
  document.body.replaceChildren();
});
afterAll(() => {
  if (originalContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalContext,
    );
  if (originalPopover)
    Object.defineProperty(
      HTMLElement.prototype,
      'showPopover',
      originalPopover,
    );
  else Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  vi.unstubAllGlobals();
});

function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
async function settle() {
  for (let round = 0; round < 5; round++) {
    for (const { root, target } of runtime.scenes) {
      if (root.isDestroyed) continue;
      root.doLayout();
      for (const node of descendants(root)) {
        for (const child of node._view.children) {
          if (child instanceof DOMContainer && !child.element.isConnected)
            target.append(child.element);
        }
      }
    }
    await Promise.resolve();
  }
}
async function start(component: () => unknown) {
  const target = document.createElement('div');
  document.body.append(target);
  runtime.target = target;
  const scene = new PRoot(new Container(), { width: 680, height: 720 });
  const errors = vi.fn();
  const dispose = render(() => {
    onError(errors);
    return component();
  }, scene);
  const destroy = () => {
    dispose();
    scene.destroyRecursive();
  };
  runtime.scenes.push({ root: scene, target, destroy });
  await settle();
  expect(errors).not.toHaveBeenCalled();
  return { target, errors, destroy };
}
function button(name: string, index = 0) {
  const matches = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button'),
  ).filter((item) => item.getAttribute('aria-label') === name);
  expect(matches[index], `button ${name} #${index}`).toBeDefined();
  return matches[index];
}
async function click(name: string, index = 0) {
  button(name, index).click();
  await settle();
}
function pressEscape(element: HTMLElement) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('overlay online examples in the actual UI runtime', () => {
  it('composes normal, modal input and nested content with live inherited theme', async () => {
    const scene = await start(UIOverlayExample);
    expect(
      scene.target.querySelector('input')?.getAttribute('aria-label'),
    ).toBe('背景名称');
    await click('打开锚定浮层');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(1);
    await click('关闭锚定浮层');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    await click('打开模态宿主');
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="浮层名称"]',
    )!;
    expect(input.value).toBe('在这里输入中文');
    const originalColor = input.style.color;
    await click('切换浮层主题');
    expect(input.style.color).not.toBe(originalColor);
    await click('打开嵌套浮层');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(2);
    pressEscape(button('关闭嵌套'));
    await settle();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(1);
    expect(document.querySelector('input[aria-label="浮层名称"]')).toBe(input);
    await click('关闭模态');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    scene.destroy();
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('keeps separate mount stacks and releases the right instance during an open modal', async () => {
    const scene = await start(UIOverlayInstancesExample);
    expect(document.querySelectorAll('input')).toHaveLength(2);
    await click('打开此实例模态', 0);
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(1);
    await click('打开此实例模态', 1);
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(2);
    await click('卸载右侧实例');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(1);
    expect(
      document.querySelector('input[aria-label="右侧 Canvas背景输入"]'),
    ).toBeNull();
    await click('重挂载右侧实例');
    expect(
      document.querySelector('input[aria-label="右侧 Canvas背景输入"]'),
    ).not.toBeNull();
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });
});

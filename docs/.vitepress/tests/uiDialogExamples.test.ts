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
import UIAlertDialogExample from '../../examples/uiAlertDialog';
import UIDialogExample from '../../examples/uiDialog';

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

describe('Dialog online examples in the actual UI runtime', () => {
  it('runs controlled editing, nested closure, theme updates and trigger removal', async () => {
    const scene = await start(UIDialogExample);
    const trigger = button('编辑个人资料');
    trigger.focus();
    await click('编辑个人资料');
    const surface = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Dialog 个人名称"]',
    )!;
    expect(input.value).toBe('输入中文姓名');
    expect(surface.getAttribute('aria-modal')).toBe('false');
    expect(
      document.getElementById(surface.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('编辑个人资料');
    const color = input.style.color;
    await click('切换 Dialog 主题');
    expect(document.querySelector('input[aria-label="Dialog 个人名称"]')).toBe(
      input,
    );
    expect(input.style.color).not.toBe(color);
    await click('打开嵌套 Dialog');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(2);
    await click('关闭嵌套 Dialog');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    const reject = document.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="拒绝关闭请求"]',
    )!;
    reject.click();
    await settle();
    await click('取消编辑');
    expect(document.querySelector('[role="dialog"]')).toBe(surface);
    reject.click();
    await settle();
    await click('移除 Dialog 触发器');
    expect(trigger.isConnected).toBe(false);
    expect(surface.isConnected).toBe(true);
    await click('取消编辑');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(input.isConnected).toBe(false);
    await click('恢复 Dialog 触发器');
    await click('编辑个人资料');
    expect(
      document.querySelector('input[aria-label="Dialog 个人名称"]'),
    ).not.toBe(input);
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation and leaves Escape without a business action', async () => {
    const scene = await start(UIAlertDialogExample);
    await click('删除示例项目');
    const surface = document.querySelector<HTMLElement>(
      '[role="alertdialog"]',
    )!;
    expect(surface).not.toBeNull();
    expect(
      document.getElementById(surface.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toContain('请输入');
    await click('确认删除');
    expect(surface.isConnected).toBe(true);
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="AlertDialog 删除口令"]',
    )!;
    input.value = '删除';
    input.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: '删除' }),
    );
    await settle();
    await click('确认删除');
    expect(surface.isConnected).toBe(false);
    await click('删除示例项目');
    const next = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(
      document.querySelector<HTMLInputElement>(
        'input[aria-label="AlertDialog 删除口令"]',
      )!.value,
    ).toBe('');
    pressEscape(button('取消删除'));
    await settle();
    expect(next.isConnected).toBe(false);
    await click('删除示例项目');
    await click('取消删除');
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    scene.destroy();
    expect(scene.errors).not.toHaveBeenCalled();
  });
});

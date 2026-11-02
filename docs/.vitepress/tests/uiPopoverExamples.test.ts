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
import UIPopoverExample from '../../examples/uiPopover';
import UITooltipExample from '../../examples/uiTooltip';

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
  return {
    ...core,
    useMountSurface: () => runtime.target && { target: runtime.target },
    // Run actual compiled Piant content and lifecycle, replacing only GPU mount.
    mount: vi.fn(
      async (
        create: () => unknown,
        target: HTMLElement,
        options = {} as { signal?: AbortSignal },
      ) => {
        options.signal?.throwIfAborted();
        const scene = new core.PRoot(new Container(), {
          width: 360,
          height: 270,
        });
        const previous = runtime.target;
        runtime.target = target;
        let dispose = () => {};
        try {
          dispose = core.render(create, scene);
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

describe('Popover and Tooltip online examples in the actual UI runtime', () => {
  it('runs editing, nested content, controlled rejection and anchor cleanup', async () => {
    const scene = await start(UIPopoverExample);
    const trigger = button('编辑 Popover 备注');
    trigger.focus();
    await click('编辑 Popover 备注');
    const surface = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="编辑项目备注"]',
    )!;
    expect(surface).not.toBeNull();
    expect(surface.getAttribute('aria-modal')).toBe('false');
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Popover 备注草稿"]',
    )!;
    expect(input.value).toBe('输入一段中文备注');
    const color = input.style.color;
    await click('切换 Popover 主题');
    expect(document.querySelector('input[aria-label="Popover 备注草稿"]')).toBe(
      input,
    );
    expect(input.style.color).not.toBe(color);
    await click('打开嵌套 Popover');
    expect(
      document.querySelector('[role="dialog"][aria-label="嵌套备注帮助"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('input[aria-label="嵌套 Popover 草稿"]'),
    ).not.toBeNull();
    await click('关闭嵌套 Popover');
    expect(
      document.querySelector('[role="dialog"][aria-label="嵌套备注帮助"]'),
    ).toBeNull();
    const reject = document.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="拒绝 Popover 关闭请求"]',
    )!;
    reject.click();
    await settle();
    await click('完成 Popover 编辑');
    expect(
      document.querySelector('[role="dialog"][aria-label="编辑项目备注"]'),
    ).toBe(surface);
    reject.click();
    await settle();
    await click('完成 Popover 编辑');
    expect(surface.isConnected).toBe(false);
    await click('编辑 Popover 备注');
    await click('移除 Popover 触发器');
    expect(trigger.isConnected).toBe(false);
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    await click('恢复 Popover 触发器');
    await click('编辑 Popover 备注');
    expect(
      document.querySelector('input[aria-label="Popover 备注草稿"]'),
    ).not.toBe(input);
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('runs focus help, dynamic copy, inherited theme, Escape and normal button actions', async () => {
    const scene = await start(UITooltipExample);
    const trigger = button('保存带提示的草稿');
    trigger.focus();
    await settle();
    const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe('保存当前草稿，不会发布项目。');
    expect(trigger.getAttribute('aria-describedby')?.split(/\s+/)).toContain(
      tooltip.id,
    );
    expect(trigger.getAttribute('aria-haspopup')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBeNull();
    await click('使用较长 Tooltip');
    expect(document.querySelector('[role="tooltip"]')).toBe(tooltip);
    expect(tooltip.textContent).toContain('需要操作的帮助内容请使用 Popover');
    await click('切换 Tooltip 主题');
    expect(document.querySelector('[role="tooltip"]')).toBe(tooltip);
    expect(document.activeElement).toBe(trigger);
    pressEscape(trigger);
    await settle();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    trigger.dispatchEvent(new FocusEvent('focus'));
    await settle();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    button('切换 Tooltip 主题').focus();
    trigger.focus();
    await settle();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    await click('保存带提示的草稿');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });
});

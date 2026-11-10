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
import UIMenuExample from '../../examples/uiMenu';
import UISelectExample from '../../examples/uiSelect';

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

function pressKey(element: HTMLElement, key: string) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}
function activeItem(element: HTMLElement) {
  const id = element.getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
}
function sceneText() {
  return runtime.scenes
    .filter(({ root }) => !root.isDestroyed)
    .flatMap(({ root }) => descendants(root))
    .flatMap((node) =>
      '_textContent' in node
        ? (node._textContent as Array<{ content?: string }>).map(
            (part) => part.content ?? '',
          )
        : [],
    )
    .join('');
}

describe('Menu and Select online examples in the actual UI runtime', () => {
  it('runs menu navigation, disabled discovery, controlled closure and modal nesting', async () => {
    const scene = await start(UIMenuExample);
    const trigger = button('打开项目操作');
    trigger.focus();
    await click('打开项目操作');
    let menu = document.querySelector<HTMLElement>(
      '[role="menu"][aria-label="项目操作"]',
    )!;
    expect(menu).not.toBeNull();
    expect(document.activeElement).toBe(menu);
    expect(activeItem(menu)?.textContent).toBe('Rename 重命名');
    pressKey(menu, 'ArrowDown');
    await settle();
    expect(activeItem(menu)?.textContent).toBe('Duplicate 复制');
    pressKey(menu, 'Enter');
    await settle();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(sceneText()).toContain('动作 1 次：duplicate');
    await click('打开项目操作');
    menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    pressKey(menu, 'd');
    await settle();
    expect(activeItem(menu)?.textContent).toBe('Duplicate 复制');
    pressKey(menu, 'End');
    pressKey(menu, 'ArrowUp');
    await settle();
    expect(activeItem(menu)?.getAttribute('aria-disabled')).toBe('true');
    pressKey(menu, 'Enter');
    await settle();
    expect(menu.isConnected).toBe(true);
    expect(sceneText()).toContain('动作 1 次：duplicate');
    pressEscape(menu);
    await settle();
    const reject = document.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="拒绝 Menu 关闭请求"]',
    )!;
    reject.click();
    await settle();
    await click('打开项目操作');
    menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    pressKey(menu, 'Enter');
    await settle();
    expect(menu.isConnected).toBe(true);
    expect(sceneText()).toContain('动作 2 次：rename');
    pressEscape(menu);
    await settle();
    expect(sceneText()).toContain('动作 2 次：rename');
    reject.click();
    await settle();
    pressEscape(menu);
    await settle();
    await click('打开含 Menu 的 Dialog');
    await click('弹窗内打开 Menu');
    const nested = document.querySelector<HTMLElement>(
      '[role="menu"][aria-label="弹窗项目操作"]',
    )!;
    expect(nested).not.toBeNull();
    pressEscape(nested);
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click('关闭 Menu 示例 Dialog');
    await click('切换 Menu 主题、密度与字号');
    expect(button('打开项目操作')).toBe(trigger);
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('keeps Select previews separate from controlled values and repairs dynamic display', async () => {
    const scene = await start(UISelectExample);
    const trigger = button('项目可见性');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.textContent).toBe('Team 团队');
    trigger.focus();
    trigger.click();
    await settle();
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    pressKey(trigger, 'ArrowDown');
    await settle();
    expect(activeItem(trigger)?.textContent).toBe('Private 私密');
    pressKey(trigger, 'p');
    await settle();
    expect(activeItem(trigger)?.textContent).toBe('Public 公开');
    pressKey(trigger, 'p');
    await settle();
    expect(activeItem(trigger)?.textContent).toBe('Private 私密');
    expect(trigger.textContent).toBe('Team 团队');
    expect(sceneText()).toContain('值请求 0 次');
    pressEscape(trigger);
    await settle();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(trigger.textContent).toBe('Team 团队');
    const reject = document.querySelector<HTMLButtonElement>(
      '[role="checkbox"][aria-label="拒绝 Select 值更新"]',
    )!;
    reject.click();
    await settle();
    trigger.click();
    await settle();
    pressKey(trigger, 'ArrowDown');
    pressKey(trigger, 'Enter');
    await settle();
    expect(trigger.textContent).toBe('Team 团队');
    expect(sceneText()).toContain('值请求 1 次');
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    reject.click();
    await settle();
    trigger.click();
    await settle();
    pressKey(trigger, 'ArrowDown');
    pressKey(trigger, 'Enter');
    await settle();
    expect(trigger.textContent).toBe('Private 私密');
    expect(sceneText()).toContain('值请求 2 次');
    await click('重置 Select 值');
    await click('移除 Team 选项');
    expect(trigger.textContent).toBe('请选择可见性');
    expect(sceneText()).toContain('值请求 2 次');
    await click('恢复 Team 选项');
    expect(trigger.textContent).toBe('Team 团队');
    await click('清空 Select 选项');
    expect(trigger.disabled).toBe(true);
    await click('恢复 Select 选项');
    expect(trigger.disabled).toBe(false);
    await click('切换 Select 主题、密度与字号');
    expect(button('项目可见性')).toBe(trigger);
    scene.destroy();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(scene.errors).not.toHaveBeenCalled();
  });
});

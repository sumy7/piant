import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UIColorPickerExample from '../../examples/uiColorPicker';

// Keep the examples, UI components, owners and Yoga real. Replace GPU mounting
// with retained scenes so OverlayHost can create its actual nested UI roots.
const runtime = vi.hoisted(() => ({
  target: undefined as HTMLElement | undefined,
  scenes: [] as { scene: PRoot; target: HTMLElement; destroy: () => void }[],
  ticks: new Set<() => void>(),
}));
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  const { Container } = await import('pixi.js');
  return {
    ...core,
    useMountSurface: () => runtime.target && { target: runtime.target },
    onTick(callback: () => void) {
      runtime.ticks.add(callback);
      const stop = () => {
        runtime.ticks.delete(callback);
      };
      core.onCleanup(stop);
      return stop;
    },
    mount: vi.fn(
      async (create, target, options: { signal?: AbortSignal } = {}) => {
        options.signal?.throwIfAborted();
        const scene = new core.PRoot(new Container(), {
          width: 520,
          height: 600,
        });
        const previous = runtime.target;
        runtime.target = target;
        let stop = () => {};
        try {
          stop = core.render(create, scene);
        } finally {
          runtime.target = previous;
        }
        let closed = false;
        const destroy = () => {
          if (closed) return;
          closed = true;
          options.signal?.removeEventListener('abort', destroy);
          stop();
          scene.destroyRecursive();
        };
        runtime.scenes.push({ scene, target, destroy });
        options.signal?.addEventListener('abort', destroy, { once: true });
        return {
          root: scene,
          destroy,
          app: { render: () => attach(scene, target) },
          resize: (width: number, height: number) => {
            scene.setStyle({ width, height });
            scene.doLayout();
          },
        };
      },
    ),
  };
});
const originalPopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'showPopover',
);
const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value() {},
  });
  // Retain actual UI, owners, Yoga and range semantics. Replace Canvas text
  // metrics only; GPU pointer transforms are verified in a real browser.
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
function attach(scene: PRoot, target: HTMLElement, seen?: Set<PNode>) {
  if (scene.isDestroyed) return;
  scene.doLayout();
  for (const node of descendants(scene)) {
    seen?.add(node);
    for (const child of node._view.children)
      if (child instanceof DOMContainer && !child.element.isConnected)
        target.append(child.element);
  }
}
function keyboard(
  element: HTMLElement,
  key: string,
  options: KeyboardEventInit = {},
) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    }),
  );
}
function fixture(component: () => unknown) {
  const errors = vi.fn();
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 680, height: 620 });
  const seen = new Set<PNode>();
  let dispose = () => {};
  const settle = async () => {
    for (let round = 0; round < 6; round++) {
      attach(host, dom, seen);
      for (const entry of runtime.scenes)
        attach(entry.scene, entry.target, seen);
      for (const tick of [...runtime.ticks]) tick();
      await Promise.resolve();
    }
    expect(errors).not.toHaveBeenCalled();
    expect(logged).not.toHaveBeenCalled();
  };
  const find = (name: string) => {
    const element = document.querySelector<HTMLElement>(
      `[aria-label="${name}"]`,
    );
    expect(element, `semantic element ${name}`).not.toBeNull();
    return element!;
  };
  return {
    host,
    dom,
    find,
    settle,
    async start() {
      // Show can create a new nested provider after the initial render.
      // Keep this fixture's mount surface available until its final cleanup.
      runtime.target = dom;
      dispose = render(() => {
        onError(errors);
        return component();
      }, host);
      await settle();
    },
    async click(name: string) {
      find(name).click();
      await settle();
    },
    async key(element: HTMLElement, key: string, options?: KeyboardEventInit) {
      element.focus();
      keyboard(element, key, options);
      await settle();
    },
    destroy() {
      dispose();
      host.destroyRecursive();
      expect([...seen].every((node) => node.isDestroyed)).toBe(true);
      expect(dom.querySelector('button,input,[data-piant-overlay]')).toBeNull();
      expect(runtime.ticks.size).toBe(0);
      expect(errors).not.toHaveBeenCalled();
      expect(logged).not.toHaveBeenCalled();
    },
    cleanup() {
      dispose();
      host.destroyRecursive();
      for (const entry of runtime.scenes.splice(0).reverse()) entry.destroy();
      expect(runtime.ticks.size).toBe(0);
      runtime.target = undefined;
      dom.remove();
      logged.mockRestore();
    },
  };
}

describe('ColorPicker online layer editor', () => {
  it('commits canonical colors, restores Hex drafts, keeps opaque outline independent and releases remounts', async () => {
    const scene = fixture(UIColorPickerExample);
    try {
      await scene.start();
      await scene.key(scene.find('示例 填充'), 'Enter');
      const hex = scene.find('示例 填充 Hex') as HTMLInputElement;
      hex.value = '#0f08';
      hex.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await scene.key(hex, 'Enter');
      expect(hex.value).toBe('#00ff0088');
      hex.value = '#abc';
      hex.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await scene.key(hex, 'Escape');
      expect(hex.value).toBe('#00ff0088');
      expect(scene.find('示例 填充 Color editor')).toBeDefined();
      await scene.key(hex, 'Escape');
      expect(hex.isConnected).toBe(false);
      await scene.key(scene.find('示例 轮廓'), 'Enter');
      const outline = scene.find('示例 轮廓 Hex') as HTMLInputElement;
      outline.value = '#abcd';
      outline.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await scene.key(outline, 'Enter');
      expect(outline.value).toBe('#aabbcc');
      expect(
        document.querySelector('[aria-label="示例 轮廓 Alpha"]'),
      ).toBeNull();
      await scene.click('Close 示例 轮廓 Color editor');
      await scene.key(scene.find('示例 填充'), 'Enter');
      expect((scene.find('示例 填充 Hex') as HTMLInputElement).value).toBe(
        '#00ff0088',
      );
      await scene.click('卸载颜色编辑器');
      expect(document.querySelector('[data-piant-overlay]')).toBeNull();
      await scene.click('重挂载颜色编辑器');
      await scene.key(scene.find('示例 填充'), 'Enter');
      expect((scene.find('示例 填充 Hex') as HTMLInputElement).value).toBe(
        '#3366ff80',
      );
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
  it('retains native editor identity across theme/density changes and applies read-only editing limits', async () => {
    const scene = fixture(UIColorPickerExample);
    try {
      await scene.start();
      await scene.key(scene.find('示例 填充'), 'Enter');
      const hex = scene.find('示例 填充 Hex') as HTMLInputElement;
      await scene.click('切换颜色编辑器外观');
      expect(scene.find('示例 填充 Hex')).toBe(hex);
      expect(Number.parseFloat(hex.style.fontSize)).toBeGreaterThanOrEqual(24);
      await scene.click('Close 示例 填充 Color editor');
      await scene.click('示例 设为只读');
      await scene.key(scene.find('示例 填充'), 'Enter');
      expect((scene.find('示例 填充 Hex') as HTMLInputElement).readOnly).toBe(
        true,
      );
      await scene.click('Close 示例 填充 Color editor');
      await scene.click('示例 禁用填充');
      expect((scene.find('示例 填充') as HTMLButtonElement).disabled).toBe(
        true,
      );
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

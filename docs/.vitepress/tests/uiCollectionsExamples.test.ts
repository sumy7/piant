import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UITreeExample from '../../examples/uiTree';
import UIVirtualListExample from '../../examples/uiVirtualList';

const ticks = vi.hoisted(() => new Set<() => void>());
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  return {
    ...core,
    onTick(callback: () => void) {
      ticks.add(callback);
      const stop = () => {
        ticks.delete(callback);
      };
      core.onCleanup(stop);
      return stop;
    },
  };
});

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
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
  vi.unstubAllGlobals();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
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
      host.doLayout();
      for (const node of descendants(host)) {
        seen.add(node);
        for (const child of node._view.children)
          if (child instanceof DOMContainer && !child.element.isConnected)
            dom.append(child.element);
      }
      for (const tick of [...ticks]) tick();
      await Promise.resolve();
    }
    expect(errors).not.toHaveBeenCalled();
    expect(logged).not.toHaveBeenCalled();
  };
  const find = (name: string) => {
    const element = dom.querySelector<HTMLElement>(`[aria-label="${name}"]`);
    expect(element, `semantic element ${name}`).not.toBeNull();
    return element!;
  };
  return {
    host,
    dom,
    find,
    settle,
    async start() {
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
      expect(
        dom.querySelector('button,input,[role=list],[role=tree]'),
      ).toBeNull();
      expect(ticks.size).toBe(0);
      expect(errors).not.toHaveBeenCalled();
      expect(logged).not.toHaveBeenCalled();
    },
    cleanup() {
      dispose();
      host.destroyRecursive();
      dom.remove();
      logged.mockRestore();
    },
  };
}

describe('virtual collection online examples', () => {
  it('constructs only visible native list editors and preserves external keyed edits after recycle', async () => {
    const scene = fixture(UIVirtualListExample);
    try {
      await scene.start();
      const viewport = scene.find('示例列表 虚拟列表');
      const initial = scene.find('示例列表 编辑 item-0') as HTMLInputElement;
      initial.value = '保留的草稿';
      initial.dispatchEvent(new InputEvent('input', { bubbles: true }));
      await scene.settle();
      expect(scene.dom.querySelectorAll('input').length).toBeLessThan(20);
      await scene.click('示例列表 定位 9000');
      expect(initial.isConnected).toBe(false);
      expect(scene.find('示例列表 编辑 item-9000')).toBeDefined();
      await scene.key(viewport, 'Home');
      expect(
        (scene.find('示例列表 编辑 item-0') as HTMLInputElement).value,
      ).toBe('保留的草稿');
      await scene.click('切换列表外观');
      expect(scene.dom.querySelectorAll('input').length).toBeLessThan(20);
      await scene.click('示例列表 清空');
      expect(scene.dom.querySelectorAll('input')).toHaveLength(0);
      await scene.click('示例列表 复原');
      await scene.click('卸载虚拟列表');
      expect(viewport.isConnected).toBe(false);
      await scene.click('重挂载虚拟列表');
      expect(
        (scene.find('示例列表 编辑 item-0') as HTMLInputElement).value,
      ).toBe('条目 0');
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
  it('navigates/selects hierarchy through a stable virtual root and releases remounted tree rows', async () => {
    const scene = fixture(UITreeExample);
    try {
      await scene.start();
      const viewport = scene.find('示例树 虚拟树');
      expect(viewport.getAttribute('role')).toBe('tree');
      await scene.key(viewport, 'ArrowRight');
      await scene.key(viewport, 'Enter');
      const activeId = viewport.getAttribute('aria-activedescendant');
      const active = document.getElementById(activeId!);
      expect(active?.getAttribute('role')).toBe('treeitem');
      expect(active?.getAttribute('aria-level')).toBe('2');
      expect(active?.getAttribute('aria-selected')).toBe('true');
      await scene.click('示例树 展开全部');
      await scene.key(viewport, 'End');
      const last = document.getElementById(
        viewport.getAttribute('aria-activedescendant')!,
      );
      expect(last?.getAttribute('aria-label')).toBe('文件 99-99');
      expect(scene.dom.querySelectorAll('[role=treeitem]').length).toBeLessThan(
        20,
      );
      await scene.click('切换树外观');
      expect(scene.find('示例树 虚拟树')).toBe(viewport);
      await scene.click('示例树 折叠全部');
      await scene.click('卸载虚拟树');
      expect(viewport.isConnected).toBe(false);
      await scene.click('重挂载虚拟树');
      expect(scene.find('示例树 虚拟树')).not.toBe(viewport);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

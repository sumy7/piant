import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UIAccordionExample from '../../examples/uiAccordion';
import UICollapsibleExample from '../../examples/uiCollapsible';
import UITabsExample from '../../examples/uiTabs';

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
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
function texts(node: PNode): string[] {
  return descendants(node).flatMap((child) =>
    '_textContent' in child
      ? [
          (child._textContent as Array<{ type: string; content?: string }>)
            .map((part) => (part.type === 'text' ? part.content : ''))
            .join(''),
        ]
      : [],
  );
}
function keyboard(element: HTMLElement, key: string) {
  for (const type of ['keydown', 'keyup'])
    element.dispatchEvent(
      new KeyboardEvent(type, { key, bubbles: true, cancelable: true }),
    );
}
function edit(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(
    new InputEvent('input', { bubbles: true, data: value }),
  );
}
function fixture(create: () => unknown) {
  const errors = vi.fn();
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 680, height: 760 });
  const seen = new Set<PNode>();
  let dispose = () => {};
  const settle = async () => {
    host.doLayout();
    for (const node of descendants(host)) {
      seen.add(node);
      for (const child of node._view.children)
        if (child instanceof DOMContainer && !child.element.isConnected)
          dom.append(child.element);
    }
    await Promise.resolve();
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
    input: (name: string) => find(name) as HTMLInputElement,
    async start() {
      dispose = render(() => {
        onError(errors);
        return create();
      }, host);
      await settle();
    },
    async click(name: string) {
      find(name).click();
      await settle();
    },
    async key(name: string, key: string) {
      const element = find(name);
      element.focus();
      keyboard(element, key);
      await settle();
    },
    destroy() {
      dispose();
      host.destroyRecursive();
      expect([...seen].every((node) => node.isDestroyed)).toBe(true);
      expect(dom.querySelector('input,button')).toBeNull();
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

describe('container online examples in the actual UI runtime', () => {
  it('runs Tabs manual activation, lazy draft retention and stable keyed updates', async () => {
    const scene = fixture(UITabsExample);
    try {
      await scene.start();
      const profile = scene.find('资料');
      const profilePanel = document.getElementById(
        profile.getAttribute('aria-controls')!,
      );
      expect(profilePanel?.getAttribute('role')).toBe('tabpanel');
      expect(profilePanel?.getAttribute('aria-labelledby')).toBe(profile.id);
      const draft = scene.input('资料草稿');
      edit(draft, '保留资料草稿');
      await scene.click('偏好');
      expect(scene.find('偏好').getAttribute('aria-selected')).toBe('true');
      await scene.click('资料');
      expect(scene.input('资料草稿')).toBe(draft);
      expect(draft.value).toBe('保留资料草稿');
      await scene.click('改为手动激活');
      await scene.key('资料', 'ArrowRight');
      expect(document.activeElement).toBe(scene.find('偏好'));
      expect(profile.getAttribute('aria-selected')).toBe('true');
      await scene.key('偏好', ' ');
      expect(scene.find('偏好').getAttribute('aria-selected')).toBe('true');
      await scene.click('反转标签顺序');
      expect(scene.find('资料')).toBe(profile);
      expect(scene.input('资料草稿')).toBe(draft);
      await scene.click('高级');
      const advanced = scene.input('高级草稿');
      edit(advanced, '即将释放');
      await scene.click('移除高级页');
      expect(advanced.isConnected).toBe(false);
      expect(
        scene.dom.querySelector('[role="tab"][aria-selected="true"]'),
      ).toBeNull();
      expect(
        texts(scene.host).find((text) => text.startsWith('选中值：')),
      ).toBe('选中值：advanced；面板创建 3 次，释放 1 次');
      await scene.click('恢复高级页');
      expect(scene.input('高级草稿')).not.toBe(advanced);
      await scene.click('禁用高级页');
      expect(scene.find('高级').getAttribute('aria-disabled')).toBe('true');
      await scene.click('切换标签主题');
      expect(scene.input('资料草稿')).toBe(draft);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('runs Collapsible lazy and unmount strategies with real input identity and cleanup', async () => {
    const scene = fixture(UICollapsibleExample);
    try {
      await scene.start();
      const retained = scene.input('保留草稿');
      const released = scene.input('释放草稿');
      edit(retained, '保留编辑');
      edit(released, '释放编辑');
      await scene.click('保留编辑内容');
      expect(scene.find('保留编辑内容').getAttribute('aria-expanded')).toBe(
        'false',
      );
      expect(retained.tabIndex).toBe(-1);
      await scene.click('保留编辑内容');
      expect(scene.input('保留草稿')).toBe(retained);
      expect(retained.value).toBe('保留编辑');
      await scene.click('关闭释放内容');
      expect(released.isConnected).toBe(false);
      expect(texts(scene.host)).toContain('内容创建 2 次，释放 1 次');
      await scene.click('关闭释放内容');
      expect(scene.input('释放草稿')).not.toBe(released);
      expect(scene.input('释放草稿').value).toBe('编辑这段草稿，再折叠和展开');
      await scene.click('禁用保留面板');
      expect(scene.find('保留编辑内容').tabIndex).toBe(-1);
      await scene.click('切换折叠主题');
      expect(scene.input('保留草稿')).toBe(retained);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('runs single and multiple Accordion without destroying keepMounted drafts', async () => {
    const scene = fixture(UIAccordionExample);
    try {
      await scene.start();
      expect(scene.dom.querySelectorAll('input')).toHaveLength(4);
      const account = scene.input('单开账户草稿');
      edit(account, '账户草稿');
      await scene.key('账户设置', 'ArrowDown');
      expect(document.activeElement).toBe(scene.find('显示设置'));
      expect(scene.find('账户设置').getAttribute('aria-expanded')).toBe('true');
      await scene.key('显示设置', 'Enter');
      expect(scene.find('账户设置').getAttribute('aria-expanded')).toBe(
        'false',
      );
      expect(scene.find('显示设置').getAttribute('aria-expanded')).toBe('true');
      await scene.click('账户设置');
      expect(scene.input('单开账户草稿')).toBe(account);
      expect(account.value).toBe('账户草稿');
      await scene.click('声音选项');
      expect(scene.find('声音选项').getAttribute('aria-expanded')).toBe('true');
      expect(scene.find('画面选项').getAttribute('aria-expanded')).toBe('true');
      await scene.click('账户设置');
      expect(scene.find('账户设置').getAttribute('aria-expanded')).toBe(
        'false',
      );
      await scene.click('禁用显示设置');
      expect(scene.find('显示设置').tabIndex).toBe(-1);
      expect(scene.input('单开账户草稿')).toBe(account);
      await scene.click('反转单开标题顺序');
      expect(scene.input('单开账户草稿')).toBe(account);
      await scene.click('切换手风琴主题');
      expect(scene.input('单开账户草稿')).toBe(account);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

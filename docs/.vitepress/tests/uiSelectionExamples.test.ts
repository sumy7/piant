import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UICheckboxExample from '../../examples/uiCheckbox';
import UIRadioGroupExample from '../../examples/uiRadioGroup';
import UIToggleSwitchExample from '../../examples/uiToggleSwitch';

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  // Exercise the compiled examples with actual UI/core, Text, Yoga and semantic
  // bindings. Deterministic font metrics replace only the browser Canvas API.
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
function keyboard(element: HTMLElement, value: string) {
  for (const type of ['keydown', 'keyup'])
    element.dispatchEvent(
      new KeyboardEvent(type, { key: value, bubbles: true, cancelable: true }),
    );
}
function fixture(create: () => unknown) {
  const errors = vi.fn();
  const loggedErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 720, height: 780 });
  const seen = new Set<PNode>();
  let dispose = () => {};
  const settle = async () => {
    for (const node of descendants(host)) {
      seen.add(node);
      for (const child of node._view.children)
        if (child instanceof DOMContainer && !child.element.isConnected)
          dom.append(child.element);
    }
    host.doLayout();
    await Promise.resolve();
    expect(errors).not.toHaveBeenCalled();
    expect(loggedErrors).not.toHaveBeenCalled();
  };
  const find = (name: string) => {
    const element = Array.from(
      dom.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.getAttribute('aria-label') === name);
    expect(element, `semantic control ${name}`).toBeDefined();
    return element!;
  };
  return {
    dom,
    host,
    settle,
    find,
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
    async key(element: HTMLElement, value: string) {
      element.focus();
      keyboard(element, value);
      await settle();
    },
    destroy() {
      const elements = Array.from(dom.querySelectorAll('button'));
      dispose();
      host.destroyRecursive();
      expect(elements.every((element) => !element.isConnected)).toBe(true);
      expect([...seen].every((node) => node.isDestroyed)).toBe(true);
      expect(dom.querySelector('button')).toBeNull();
      expect(errors).not.toHaveBeenCalled();
      expect(loggedErrors).not.toHaveBeenCalled();
    },
    cleanup() {
      dispose();
      host.destroyRecursive();
      dom.remove();
      loggedErrors.mockRestore();
    },
  };
}

describe('selection live examples in the actual UI runtime', () => {
  it('initializes compiled Checkbox getters once and preserves mixed/controlled/disabled behavior', async () => {
    const scene = fixture(UICheckboxExample);
    try {
      await scene.start();
      const main = scene.find('包含全部图层');
      const local = scene.find('保留导出记录');
      expect(main.getAttribute('role')).toBe('checkbox');
      expect(main.getAttribute('aria-checked')).toBe('mixed');
      expect(local.getAttribute('aria-checked')).toBe('true');
      await scene.click('修改初始选中值');
      expect(local.getAttribute('aria-checked')).toBe('true');
      await scene.click('包含全部图层');
      expect(main.getAttribute('aria-checked')).toBe('true');
      await scene.key(main, ' ');
      expect(main.getAttribute('aria-checked')).toBe('false');
      await scene.key(main, 'Enter');
      expect(main.getAttribute('aria-checked')).toBe('false');
      await scene.click('设为部分选中');
      expect(main.getAttribute('aria-checked')).toBe('mixed');
      await scene.click('禁用复选框');
      expect(main.disabled).toBe(true);
      expect(main.tabIndex).toBe(-1);
      await scene.click('包含全部图层');
      expect(main.getAttribute('aria-checked')).toBe('mixed');
      await scene.click('启用复选框');
      await scene.click('保留导出记录');
      expect(local.getAttribute('aria-checked')).toBe('false');
      await scene.click('切换主题、密度与字号');
      expect(scene.find('包含全部图层')).toBe(main);
      expect(scene.find('保留导出记录')).toBe(local);
      expect(local.getAttribute('aria-checked')).toBe('false');
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('runs named controlled and uncontrolled switches without changing the accessible label', async () => {
    const scene = fixture(UIToggleSwitchExample);
    try {
      await scene.start();
      const main = scene.find('自动保存');
      const local = scene.find('显示网格');
      expect(main.getAttribute('role')).toBe('switch');
      expect(main.getAttribute('aria-checked')).toBe('false');
      expect(local.getAttribute('aria-checked')).toBe('true');
      await scene.click('自动保存');
      expect(main.getAttribute('aria-checked')).toBe('true');
      await scene.key(main, ' ');
      expect(main.getAttribute('aria-checked')).toBe('false');
      await scene.key(main, 'Enter');
      expect(main.getAttribute('aria-checked')).toBe('false');
      await scene.click('显示网格');
      expect(local.getAttribute('aria-checked')).toBe('false');
      await scene.click('禁用开关');
      expect(main.disabled).toBe(true);
      await scene.click('自动保存');
      expect(main.getAttribute('aria-checked')).toBe('false');
      await scene.click('启用开关');
      await scene.click('切换主题、密度与字号');
      expect(scene.find('自动保存')).toBe(main);
      expect(scene.find('显示网格')).toBe(local);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('initializes compiled RadioGroup defaults once and handles keyboard selection plus removing/restoring the selected option', async () => {
    const scene = fixture(UIRadioGroupExample);
    try {
      await scene.start();
      const radios = () =>
        Array.from(
          scene.dom.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
        );
      const chosen = () =>
        radios().filter(
          (element) => element.getAttribute('aria-checked') === 'true',
        );
      const stops = () => radios().filter((element) => element.tabIndex === 0);
      const balanced = scene.find('均衡');
      const fast = scene.find('快速');
      const quality = scene.find('高质量');
      expect(
        scene.dom
          .querySelector('[role="radiogroup"]')
          ?.getAttribute('aria-label'),
      ).toBe('导出质量');
      expect(chosen()).toEqual([balanced]);
      expect(stops()).toEqual([balanced]);
      await scene.click('修改默认质量');
      expect(chosen()).toEqual([balanced]);
      await scene.key(balanced, 'ArrowDown');
      expect(chosen()).toEqual([quality]);
      expect(document.activeElement).toBe(quality);
      await scene.key(quality, 'ArrowDown');
      expect(chosen()).toEqual([fast]);
      await scene.key(fast, 'End');
      expect(chosen()).toEqual([quality]);
      await scene.key(quality, 'Home');
      expect(chosen()).toEqual([fast]);
      await scene.key(fast, 'ArrowRight');
      expect(chosen()).toEqual([balanced]);
      await scene.key(balanced, 'Enter');
      expect(chosen()).toEqual([balanced]);
      await scene.click('移除均衡选项');
      expect(balanced.isConnected).toBe(false);
      expect(chosen()).toHaveLength(0);
      expect(stops()).toHaveLength(1);
      expect(radios()).toContain(document.activeElement);
      await scene.click('恢复均衡选项');
      expect(chosen()).toEqual([scene.find('均衡')]);
      expect(stops()).toHaveLength(1);
      expect(scene.find('快速')).toBe(fast);
      await scene.click('禁用选项组');
      expect(radios().every((element) => element.disabled)).toBe(true);
      expect(stops()).toHaveLength(0);
      await scene.click('启用选项组');
      await scene.click('改为横向排列');
      await scene.click('切换主题、密度与字号');
      expect(scene.find('快速')).toBe(fast);
      expect(chosen()).toEqual([scene.find('均衡')]);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

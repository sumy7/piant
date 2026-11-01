import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UISliderExample from '../../examples/uiSlider';

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
function texts(node: PNode): string[] {
  return descendants(node).flatMap((child) => {
    if (!('_textContent' in child)) return [];
    return [
      (child._textContent as Array<{ type: string; content?: string }>)
        .map((part) => (part.type === 'text' ? part.content : ''))
        .join(''),
    ];
  });
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
function fixture() {
  const errors = vi.fn();
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 680, height: 620 });
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
    async start() {
      dispose = render(() => {
        onError(errors);
        return UISliderExample();
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
      expect(dom.querySelector('button')).toBeNull();
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

describe('Slider online example in the actual UI runtime', () => {
  it('runs controlled decimals, RTL, disabled and theme changes without spurious notifications', async () => {
    const scene = fixture();
    try {
      await scene.start();
      const slider = scene.find('播放速度');
      expect(slider.getAttribute('role')).toBe('slider');
      expect(slider.getAttribute('aria-valuemin')).toBe('-1');
      expect(slider.getAttribute('aria-valuemax')).toBe('1');
      expect(slider.getAttribute('aria-valuenow')).toBe('0.2');
      expect(slider.getAttribute('aria-valuetext')).toBe('0.2 倍');
      expect(texts(scene.host)).toContain('受控值：0.2；变更通知：0 次');
      await scene.key(slider, 'ArrowRight');
      expect(slider.getAttribute('aria-valuenow')).toBe('0.3');
      expect(texts(scene.host)).toContain('受控值：0.3；变更通知：1 次');
      await scene.click('切换为 RTL');
      await scene.key(slider, 'ArrowRight');
      expect(slider.getAttribute('aria-valuenow')).toBe('0.2');
      await scene.key(slider, 'ArrowUp');
      expect(slider.getAttribute('aria-valuenow')).toBe('0.3');
      await scene.key(slider, 'ArrowRight', { ctrlKey: true });
      await scene.key(slider, 'ArrowRight', { isComposing: true });
      expect(texts(scene.host)).toContain('受控值：0.3；变更通知：3 次');
      await scene.click('禁用受控滑块');
      expect(slider.tabIndex).toBe(-1);
      keyboard(slider, 'End');
      await scene.settle();
      expect(slider.getAttribute('aria-valuenow')).toBe('0.3');
      await scene.click('启用受控滑块');
      await scene.click('切换滑块主题');
      expect(scene.find('播放速度')).toBe(slider);
      expect(texts(scene.host)).toContain('受控值：0.3；变更通知：3 次');
      await scene.click('父级设为零');
      expect(slider.getAttribute('aria-valuenow')).toBe('0');
      expect(texts(scene.host)).toContain('受控值：0.0；变更通知：3 次');
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('keeps vertical uncontrolled edits when defaultValue changes and skips disabled input', async () => {
    const scene = fixture();
    try {
      await scene.start();
      const slider = scene.find('纵向音量');
      expect(slider.getAttribute('aria-orientation')).toBe('vertical');
      expect(slider.getAttribute('aria-valuenow')).toBe('4');
      await scene.key(slider, 'ArrowUp');
      expect(slider.getAttribute('aria-valuenow')).toBe('6');
      await scene.click('修改纵向初值');
      expect(scene.find('纵向音量')).toBe(slider);
      expect(slider.getAttribute('aria-valuenow')).toBe('6');
      expect(texts(scene.host)).toContain('纵向非受控值：6；变更通知：1 次');
      await scene.key(slider, 'End');
      expect(slider.getAttribute('aria-valuenow')).toBe('10');
      await scene.key(slider, 'Home');
      expect(slider.getAttribute('aria-valuenow')).toBe('0');
      const disabled = scene.find('禁用滑块');
      expect(disabled.tabIndex).toBe(-1);
      keyboard(disabled, 'Home');
      await scene.settle();
      expect(disabled.getAttribute('aria-valuenow')).toBe('35');
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

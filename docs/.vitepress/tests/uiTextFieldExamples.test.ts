import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UIFieldExample from '../../examples/uiField';
import UITextFieldExample from '../../examples/uiTextField';

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  // Real UI/core/Text/Yoga/DOM bindings execute; only Canvas font metrics are
  // deterministic. GPU rendering and a system IME are outside this fixture.
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
function text(node: PNode): string {
  if (!('_textContent' in node)) return '';
  return (node._textContent as Array<{ type: string; content?: string }>)
    .map((item) => (item.type === 'text' ? item.content : ''))
    .join('');
}
function input(element: HTMLInputElement, value: string, composing = false) {
  element.value = value;
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: value,
      isComposing: composing,
    }),
  );
}
function keyboard(element: HTMLInputElement, key: string, composing = false) {
  for (const type of ['keydown', 'keyup'])
    element.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        bubbles: true,
        cancelable: true,
        isComposing: composing,
      }),
    );
}
function fixture(create: () => unknown) {
  const errors = vi.fn();
  const loggedErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 720, height: 660 });
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
  return {
    host,
    dom,
    async start() {
      dispose = render(() => {
        onError(errors);
        return create();
      }, host);
      await settle();
      expect(dom.querySelectorAll('input')).toHaveLength(1);
      return dom.querySelector('input')!;
    },
    settle,
    texts: () => descendants(host).map(text),
    async click(name: string) {
      const button = Array.from(
        dom.querySelectorAll<HTMLButtonElement>('button'),
      ).find((element) => element.getAttribute('aria-label') === name);
      expect(button, `button ${name}`).toBeDefined();
      button!.click();
      await settle();
    },
    destroy() {
      dispose();
      host.destroyRecursive();
      expect([...seen].every((node) => node.isDestroyed)).toBe(true);
      expect(dom.querySelector('input,button,label')).toBeNull();
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

describe('text field live examples in the actual UI runtime', () => {
  it('runs controlled password editing, IME event boundaries, selection and live state/theme changes', async () => {
    const scene = fixture(UITextFieldExample);
    try {
      const element = await scene.start();
      expect(element.type).toBe('password');
      expect(element.getAttribute('aria-label')).toBe('密码');
      expect(element.name).toBe('password');
      expect(element.placeholder).toBe('输入密码（受控）');
      expect(element.autocomplete).toBe('new-password');
      await scene.click('聚焦密码');
      expect(document.activeElement).toBe(element);
      input(element, 'abc');
      await scene.settle();
      expect(element.value).toBe('abc');
      expect(scene.texts()).toContain('3 个字符；input 1 次；提交 0 次');

      element.dispatchEvent(
        new CompositionEvent('compositionstart', { bubbles: true }),
      );
      input(element, '拼', true);
      keyboard(element, 'Enter', true);
      await scene.settle();
      expect(element.value).toBe('拼');
      expect(scene.texts()).toContain('正在合成输入');
      expect(scene.texts()).toContain('1 个字符；input 2 次；提交 0 次');
      element.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: '拼音' }),
      );
      input(element, '拼音');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await scene.settle();
      expect(element.value).toBe('拼音');
      expect(scene.texts()).toContain('未在合成输入');
      expect(scene.texts()).toContain('2 个字符；input 3 次；提交 0 次');
      keyboard(element, 'Enter');
      await scene.settle();
      expect(scene.texts()).toContain('2 个字符；input 3 次；提交 1 次');

      element.setSelectionRange(0, 1);
      for (let cycle = 0; cycle < 2; cycle++) {
        await scene.click('切换主题、密度与字号');
        expect(scene.dom.querySelector('input')).toBe(element);
        expect(element.value).toBe('拼音');
        expect([element.selectionStart, element.selectionEnd]).toEqual([0, 1]);
        expect(element.style.fontSize).toBe(cycle === 0 ? '28px' : '14px');
      }
      await scene.click('设为只读');
      expect(element.readOnly).toBe(true);
      expect(element.disabled).toBe(false);
      await scene.click('允许编辑');
      expect(element.readOnly).toBe(false);
      await scene.click('禁用输入');
      expect(element.disabled).toBe(true);
      await scene.click('启用输入');
      expect(element.disabled).toBe(false);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });

  it('runs an uncontrolled Field with one native input, label focus and changing description/error links', async () => {
    const scene = fixture(UIFieldExample);
    try {
      const element = await scene.start();
      expect(element.value).toBe('Piant');
      expect(element.name).toBe('displayName');
      expect(element.required).toBe(true);
      expect(element.minLength).toBe(3);
      expect(element.maxLength).toBe(40);
      const label = scene.dom.querySelector('label')!;
      expect(label.textContent).toBe('显示名称');
      expect(label.htmlFor).toBe(element.id);
      expect(element.getAttribute('aria-labelledby')?.split(' ')).toContain(
        label.id,
      );
      const descriptionIds = element
        .getAttribute('aria-describedby')!
        .split(' ');
      expect(
        descriptionIds.some(
          (id) =>
            document.getElementById(id)?.textContent ===
            '用于公开资料；至少 3 个字符。',
        ),
      ).toBe(true);
      const canvasLabel = descendants(scene.host).find(
        (node) => text(node) === '显示名称 *',
      );
      expect(canvasLabel).toBeDefined();
      canvasLabel!.parentNode!._view.emit('pointertap', {} as never);
      expect(document.activeElement).toBe(element);

      input(element, 'a');
      await scene.settle();
      expect(scene.texts()).toContain('最近输入：a');
      expect(element.value).toBe('a');
      await scene.click('修改 defaultValue');
      expect(element.value).toBe('a');
      expect(scene.dom.querySelector('input')).toBe(element);
      await scene.click('校验名称');
      expect(element.getAttribute('aria-invalid')).toBe('true');
      const errorId = element.getAttribute('aria-errormessage')!;
      expect(document.getElementById(errorId)?.textContent).toBe(
        '名称至少需要 3 个字符。',
      );
      expect(element.getAttribute('aria-describedby')?.split(' ')).toContain(
        errorId,
      );
      expect(scene.texts()).toContain('名称至少需要 3 个字符。');
      await scene.click('清除错误');
      expect(element.getAttribute('aria-invalid')).not.toBe('true');
      expect(element.hasAttribute('aria-errormessage')).toBe(false);
      expect(
        element.getAttribute('aria-describedby')?.split(' '),
      ).not.toContain(errorId);
      expect(element.getAttribute('aria-describedby')!.split(' ')).toEqual(
        descriptionIds,
      );
      input(element, '有效名称');
      await scene.settle();
      await scene.click('校验名称');
      expect(element.hasAttribute('aria-errormessage')).toBe(false);
      expect(element.value).toBe('有效名称');
      expect(scene.dom.querySelector('input')).toBe(element);
      scene.destroy();
    } finally {
      scene.cleanup();
    }
  });
});

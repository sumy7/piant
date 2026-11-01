import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer, Ticker } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import UIButtonExample from '../../examples/uiButton';
import UIIconButtonExample from '../../examples/uiIconButton';

const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);

// Keep the real Piant/UI runtime, node tree, text typesetter, owners and DOM
// semantics. Only Canvas font metrics and the animation clock are deterministic.
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

function key(
  element: HTMLElement,
  type: 'keydown' | 'keyup',
  value: string,
  repeat = false,
) {
  element.dispatchEvent(
    new KeyboardEvent(type, {
      key: value,
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function textContents(node: PNode): string[] {
  return descendants(node).flatMap((child) => {
    if (!('_textContent' in child)) return [];
    const items = child._textContent as Array<{
      type: string;
      content?: string;
    }>;
    return [
      items.map((item) => (item.type === 'text' ? item.content : '')).join(''),
    ];
  });
}

describe('button live examples in the actual UI runtime', () => {
  it.each([
    { title: 'Button', create: UIButtonExample, iconOnly: false },
    { title: 'IconButton', create: UIIconButtonExample, iconOnly: true },
  ])(
    'mounts and operates $title across keyboard, loading and theme transitions',
    async ({ create, iconOnly }) => {
      const animations = new Set<unknown>();
      const add = vi
        .spyOn(Ticker.prototype, 'add')
        .mockImplementation(function (this: Ticker, callback, context) {
          if (!(context instanceof PRoot)) animations.add(callback);
          return this;
        });
      const remove = vi
        .spyOn(Ticker.prototype, 'remove')
        .mockImplementation(function (this: Ticker, callback) {
          animations.delete(callback);
          return this;
        });
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const reportError = vi.fn();
      const dom = document.createElement('div');
      document.body.append(dom);
      const host = new PRoot(new Container(), { width: 720, height: 540 });
      const seenNodes = new Set<PNode>();
      let dispose = () => {};
      try {
        // Match mountExample's actual render-owner/error boundary, including the
        // compiled nested component getters which plain Button(props) tests omit.
        dispose = render(() => {
          onError(reportError);
          return create();
        }, host);
        const settle = async () => {
          for (const node of descendants(host)) {
            seenNodes.add(node);
            for (const child of node._view.children) {
              if (child instanceof DOMContainer && !child.element.isConnected)
                dom.append(child.element);
            }
          }
          host.doLayout();
          await Promise.resolve();
          expect(reportError).not.toHaveBeenCalled();
          expect(consoleError).not.toHaveBeenCalled();
        };
        await settle();
        const buttons = () =>
          Array.from(dom.querySelectorAll<HTMLButtonElement>('button'));
        const find = (prefix: string) => {
          const element = buttons().find((button) =>
            button.getAttribute('aria-label')?.startsWith(prefix),
          );
          expect(element, `semantic button ${prefix}`).toBeDefined();
          return element!;
        };
        const click = async (prefix: string) => {
          find(prefix).click();
          await settle();
        };
        expect(buttons()).toHaveLength(4);
        const target = find(iconOnly ? '刷新预览' : '执行操作 0');
        const expectCount = (count: number) => {
          if (iconOnly)
            expect(textContents(host)).toContain(`已刷新 ${count} 次`);
          else
            expect(target.getAttribute('aria-label')).toBe(`执行操作 ${count}`);
        };
        const originalButtons = buttons();
        expectCount(0);
        target.click();
        await settle();
        expectCount(1);
        target.focus();
        key(target, 'keydown', 'Enter');
        key(target, 'keydown', 'Enter', true);
        key(target, 'keyup', 'Enter');
        await settle();
        expectCount(2);
        key(target, 'keydown', ' ');
        expectCount(2);
        key(target, 'keyup', ' ');
        await settle();
        expectCount(3);

        await click(iconOnly ? '禁用刷新按钮' : '禁用主按钮');
        expect(target.disabled).toBe(true);
        expect(target.tabIndex).toBe(-1);
        target.click();
        key(target, 'keydown', 'Enter');
        key(target, 'keyup', 'Enter');
        await settle();
        expectCount(3);
        await click(iconOnly ? '恢复刷新按钮' : '恢复主按钮');
        expect(target.disabled).toBe(false);

        for (let cycle = 0; cycle < 3; cycle++) {
          await click('开始加载');
          expect(target.getAttribute('aria-busy')).toBe('true');
          expect(target.disabled).toBe(true);
          expect(animations.size).toBe(1);
          target.click();
          expectCount(3);
          await click('结束加载');
          expect(target.hasAttribute('aria-busy')).toBe(false);
          expect(target.disabled).toBe(false);
          expect(animations.size).toBe(0);
        }
        for (let cycle = 0; cycle < 2; cycle++) {
          await click(
            iconOnly ? '切换主题' : cycle === 0 ? 'light /' : 'dark /',
          );
          expect(
            descendants(host).some(
              (node) =>
                node._layoutStyle.backgroundColor ===
                (cycle === 0 ? '#0f172a' : '#f8fafc'),
            ),
          ).toBe(true);
          expectCount(3);
          expect(buttons()).toEqual(originalButtons);
        }
        target.click();
        await settle();
        expectCount(4);
        // Dispose while loading to cover the real example's optional Spinner owner.
        await click('开始加载');
        expect(animations.size).toBe(1);
        dispose();
        host.destroyRecursive();
        await Promise.resolve();
        expect(animations.size).toBe(0);
        expect(originalButtons.every((button) => !button.isConnected)).toBe(
          true,
        );
        expect([...seenNodes].every((node) => node.isDestroyed)).toBe(true);
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(reportError).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        dispose();
        host.destroyRecursive();
        dom.remove();
        add.mockRestore();
        remove.mockRestore();
        consoleError.mockRestore();
      }
    },
  );
});

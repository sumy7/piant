import { createState, onError, type PNode, PRoot, render } from '@piant/core';
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
import { SettingsPanel } from '../../../examples/ui-gallery/src/SettingsPanel';
import UIGalleryExample from '../../examples/uiGallery';

const mountSurface = vi.hoisted(() => ({
  target: undefined as HTMLElement | undefined,
}));
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  return {
    ...core,
    useMountSurface: () =>
      mountSurface.target && { target: mountSurface.target },
  };
});

type PanelProps = Parameters<typeof SettingsPanel>[0];
type Snapshot = Parameters<
  NonNullable<NonNullable<PanelProps>['onStateChange']>
>[0];
const cleanups: Array<() => void> = [];
const originalContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  // Exercise compiled Piant JSX, actual UI/core, Yoga and DOM bindings. GPU
  // rendering and OS IME behavior belong to the browser acceptance fixture.
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
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
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
function edit(element: HTMLInputElement, value: string, composing = false) {
  element.value = value;
  element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: value,
      isComposing: composing,
    }),
  );
}
function key(
  element: HTMLElement,
  type: 'keydown' | 'keyup',
  value: string,
  composing = false,
) {
  element.dispatchEvent(
    new KeyboardEvent(type, {
      key: value,
      bubbles: true,
      cancelable: true,
      isComposing: composing,
    }),
  );
}
function useTimers() {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });
}
function fixture(
  options: NonNullable<PanelProps> = {},
  width = 500,
  create: (props: NonNullable<PanelProps>) => unknown = SettingsPanel,
) {
  const errors = vi.fn();
  const loggedErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width, height: 1800 });
  const seen = new Set<PNode>();
  const snapshots: Snapshot[] = [];
  const props = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(options),
  ) as NonNullable<PanelProps>;
  props.onStateChange = (snapshot) => {
    snapshots.push(snapshot);
    options.onStateChange?.(snapshot);
  };
  let disposed = false;
  mountSurface.target = dom;
  const disposeOwner = render(() => {
    onError(errors);
    return create(props);
  }, host);
  mountSurface.target = undefined;
  async function settle() {
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
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    disposeOwner();
    host.destroyRecursive();
    expect([...seen].every((node) => node.isDestroyed)).toBe(true);
    expect(
      dom.querySelector(
        'input,button,label,style,[role="progressbar"],[aria-live]',
      ),
    ).toBeNull();
    expect(errors).not.toHaveBeenCalled();
    expect(loggedErrors).not.toHaveBeenCalled();
  }
  cleanups.push(() => {
    destroy();
    dom.remove();
  });
  return {
    host,
    dom,
    snapshots,
    settle,
    destroy,
    state() {
      const current = snapshots.at(-1);
      if (!current)
        throw new Error('SettingsPanel must publish its initial snapshot');
      return current;
    },
    input() {
      const element = dom.querySelector('input');
      if (!element) throw new Error('Missing settings name input');
      return element;
    },
    control(name: string, role = 'button') {
      const element = Array.from(
        dom.querySelectorAll<HTMLButtonElement>(`[role="${role}"]`),
      ).find((candidate) => candidate.getAttribute('aria-label') === name);
      if (!element) throw new Error(`Missing ${role}: ${name}`);
      return element;
    },
    async click(name: string, role = 'button') {
      this.control(name, role).click();
      await settle();
    },
    status: () => dom.querySelector<HTMLElement>('[aria-live="polite"]')!,
    progress: () =>
      dom.querySelector<HTMLElement>(
        '[role="progressbar"][aria-label="设置保存进度"]',
      )!,
    texts: () => descendants(host).map(text),
  };
}

describe('canonical settings panel in the actual UI runtime', () => {
  it('renders initial controlled values, edits Chinese text and preserves IME, focus and selection across host theme updates', async () => {
    const [large, setLarge] = createState(false);
    const scene = fixture({
      get colorMode() {
        return large() ? 'dark' : 'light';
      },
      get density() {
        return large() ? 'compact' : 'comfortable';
      },
      get fontScale() {
        return large() ? 2 : 1;
      },
      reducedMotion: true,
    });
    await scene.settle();
    const input = scene.input();
    expect(scene.state()).toMatchObject({
      name: '林小满',
      sound: true,
      remember: true,
      quality: 'balanced',
      saving: false,
      dirty: false,
      saveCount: 0,
    });
    expect(input.value).toBe('林小满');
    expect(input.name).toBe('displayName');
    expect(input.required).toBe(true);
    expect(
      scene.control('声音提醒', 'switch').getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      scene.control('记住我的偏好', 'checkbox').getAttribute('aria-checked'),
    ).toBe('true');
    expect(scene.control('均衡', 'radio').getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(scene.status().textContent).toBe(scene.state().status);
    input.focus();
    input.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    edit(input, '林小雨', true);
    key(input, 'keydown', 'Enter', true);
    key(input, 'keyup', 'Enter', true);
    input.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: '林小雨' }),
    );
    edit(input, '林小雨');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await scene.settle();
    expect(scene.state()).toMatchObject({
      name: '林小雨',
      saving: false,
      dirty: true,
      saveCount: 0,
    });
    expect(input.value).toBe('林小雨');
    input.setSelectionRange(1, 3, 'backward');
    setLarge(true);
    await scene.settle();
    expect(scene.input()).toBe(input);
    expect(input.style.fontSize).toBe('28px');
    expect(input.style.getPropertyValue('--piant-placeholder-color')).toBe(
      '#cbd5e1',
    );
    expect(document.activeElement).toBe(input);
    expect([
      input.selectionStart,
      input.selectionEnd,
      input.selectionDirection,
    ]).toEqual([1, 3, 'backward']);
    expect(scene.texts()).toContain('未保存');
  });

  it('validates trimmed Unicode length and associates the Field error before starting any save', async () => {
    useTimers();
    const scene = fixture({ reducedMotion: true });
    await scene.settle();
    const input = scene.input();
    for (const invalid of [' ', '林', '林'.repeat(25)]) {
      edit(input, invalid);
      await scene.click('保存设置');
      expect(scene.state()).toMatchObject({ saving: false, saveCount: 0 });
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const id = input.getAttribute('aria-errormessage')!;
      expect(document.getElementById(id)?.textContent).toBe(
        '显示名称应为 2–24 个字符。',
      );
      expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(id);
      expect(document.activeElement).toBe(input);
    }
    edit(input, ' 林雨 ');
    await scene.click('保存设置');
    expect(scene.state()).toMatchObject({
      name: '林雨',
      saving: true,
      saveCount: 0,
    });
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    await vi.advanceTimersByTimeAsync(1200);
    await scene.settle();
    expect(scene.state()).toMatchObject({
      name: '林雨',
      saving: false,
      saveCount: 1,
      dirty: false,
    });
  });

  it('combines selection, radio navigation, guarded saving, saved snapshots, undo and draft reset', async () => {
    useTimers();
    const scene = fixture({ reducedMotion: true });
    await scene.settle();
    await scene.click('声音提醒', 'switch');
    await scene.click('记住我的偏好', 'checkbox');
    const balanced = scene.control('均衡', 'radio');
    balanced.focus();
    key(balanced, 'keydown', 'ArrowRight');
    await scene.settle();
    expect(scene.state()).toMatchObject({
      sound: false,
      remember: false,
      quality: 'high',
      dirty: true,
    });
    edit(scene.input(), ' 林小雨 ');
    const beforeSaving = new Set(descendants(scene.host));
    await scene.click('保存设置');
    const captured = scene.state();
    expect(captured).toMatchObject({
      name: '林小雨',
      saving: true,
      saveCount: 0,
    });
    expect(scene.input().readOnly).toBe(true);
    expect(scene.control('保存设置').getAttribute('aria-busy')).toBe('true');
    expect(scene.progress().hasAttribute('aria-valuenow')).toBe(false);
    expect(scene.texts()).toContain('保存中');
    const loadingGraphics = descendants(scene.host).filter(
      (node) => !beforeSaving.has(node) && '_graphic' in node,
    );
    expect(loadingGraphics).toHaveLength(2);
    expect(scene.status().textContent).toBe('正在保存设置…');
    await scene.click('保存设置');
    await scene.click('撤销更改');
    await scene.click('恢复默认设置');
    await scene.click('声音提醒', 'switch');
    edit(scene.input(), '不能修改');
    expect(scene.state()).toEqual(captured);
    expect(scene.input().value).toBe('林小雨');
    await vi.advanceTimersByTimeAsync(1199);
    await scene.settle();
    expect(scene.state()).toMatchObject({ saving: true, saveCount: 0 });
    await vi.advanceTimersByTimeAsync(1);
    await scene.settle();
    expect(scene.state()).toMatchObject({
      name: '林小雨',
      sound: false,
      remember: false,
      quality: 'high',
      saving: false,
      dirty: false,
      saveCount: 1,
    });
    expect(scene.progress().getAttribute('aria-valuenow')).toBe('100');
    expect(scene.status().textContent).toBe('设置已保存。');
    expect(scene.texts()).toContain('已保存');
    edit(scene.input(), '另一个名称');
    await scene.click('声音提醒', 'switch');
    await scene.click('撤销更改');
    expect(scene.state()).toMatchObject({
      name: '林小雨',
      sound: false,
      remember: false,
      quality: 'high',
      dirty: false,
      saveCount: 1,
    });
    await scene.click('恢复默认设置');
    expect(scene.state()).toMatchObject({
      name: '林小满',
      sound: true,
      remember: true,
      quality: 'balanced',
      dirty: true,
      saveCount: 1,
    });
  });

  it('cancels an unmounted panel save without affecting another pending instance or a fresh remount', async () => {
    useTimers();
    const scheduled = vi.spyOn(globalThis, 'setTimeout');
    const cleared = vi.spyOn(globalThis, 'clearTimeout');
    const first = fixture({ title: 'First', reducedMotion: true });
    const second = fixture({ title: 'Second', reducedMotion: true });
    await first.settle();
    await second.settle();
    edit(first.input(), '第一位用户');
    await first.click('保存设置');
    const timerIndex = scheduled.mock.calls.findIndex(
      ([, delay]) => delay === 1200,
    );
    const timer = scheduled.mock.results[timerIndex].value;
    await vi.advanceTimersByTimeAsync(400);
    edit(second.input(), '第二位用户');
    await second.click('保存设置');
    const panel = first.host.firstChild!;
    panel.destroyRecursive();
    expect(first.host.isDestroyed).toBe(false);
    expect(
      first.dom.querySelector('input,button,label,style,[aria-live]'),
    ).toBeNull();
    expect(cleared).toHaveBeenCalledWith(timer);
    const notifications = first.snapshots.length;
    await vi.advanceTimersByTimeAsync(800);
    await second.settle();
    expect(first.snapshots).toHaveLength(notifications);
    expect(second.state()).toMatchObject({
      name: '第二位用户',
      saving: true,
      saveCount: 0,
    });
    await vi.advanceTimersByTimeAsync(400);
    await second.settle();
    expect(second.state()).toMatchObject({
      name: '第二位用户',
      saving: false,
      saveCount: 1,
    });
    const remount = fixture({ title: 'First remounted', reducedMotion: true });
    await remount.settle();
    expect(remount.state()).toMatchObject({
      name: '林小满',
      sound: true,
      remember: true,
      quality: 'balanced',
      saveCount: 0,
    });
    expect(remount.input().id).not.toBe(second.input().id);
    expect(first.snapshots).toHaveLength(notifications);
  });

  it('isolates controlled drafts, theme, semantic ids and outside focus across two mounted owners', async () => {
    const [large, setLarge] = createState(false);
    const first = fixture({
      title: 'First',
      get colorMode() {
        return large() ? 'dark' : 'light';
      },
      get fontScale() {
        return large() ? 2 : 1;
      },
      reducedMotion: true,
    });
    const second = fixture({ title: 'Second', reducedMotion: true });
    await first.settle();
    await second.settle();
    const firstInput = first.input();
    const secondInput = second.input();
    expect(firstInput.id).not.toBe(secondInput.id);
    const firstRefs = firstInput.getAttribute('aria-labelledby')!.split(' ');
    const secondRefs = secondInput.getAttribute('aria-labelledby')!.split(' ');
    expect(firstRefs.some((id) => secondRefs.includes(id))).toBe(false);
    edit(firstInput, '仅修改第一份');
    await first.click('声音提醒', 'switch');
    secondInput.focus();
    secondInput.setSelectionRange(0, 2);
    setLarge(true);
    await first.settle();
    await second.settle();
    expect(first.state()).toMatchObject({
      name: '仅修改第一份',
      sound: false,
      dirty: true,
    });
    expect(second.state()).toMatchObject({
      name: '林小满',
      sound: true,
      dirty: false,
    });
    expect(firstInput.style.fontSize).toBe('28px');
    expect(secondInput.style.fontSize).toBe('14px');
    expect(document.activeElement).toBe(secondInput);
    expect([secondInput.selectionStart, secondInput.selectionEnd]).toEqual([
      0, 2,
    ]);
    first.destroy();
    expect(document.activeElement).toBe(secondInput);
    await second.click('记住我的偏好', 'checkbox');
    expect(second.state().remember).toBe(false);
  });

  it('runs the documentation wrapper with the same retained panel while appearance and motion controls change', async () => {
    const scene = fixture({}, 500, UIGalleryExample);
    await scene.settle();
    const input = scene.input();
    expect(input.value).toBe('林小满');
    edit(input, '文档预览名称');
    input.focus();
    input.setSelectionRange(1, 3);
    await scene.click('深色 / 紧凑 / 200%');
    expect(scene.input()).toBe(input);
    expect(input.value).toBe('文档预览名称');
    expect(input.style.fontSize).toBe('28px');
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    await scene.click('减少动画');
    expect(scene.control('允许动画')).toBeDefined();
    await scene.click('恢复默认外观');
    expect(input.style.fontSize).toBe('14px');
    expect(input.value).toBe('文档预览名称');
    expect(scene.dom.querySelectorAll('input')).toHaveLength(1);
    expect(scene.control('均衡', 'radio').getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it.each([220, 260])(
    'keeps the %ipx panel and 200%% typography inside the available horizontal layout',
    async (width) => {
      const scene = fixture({ fontScale: 2, reducedMotion: true }, width);
      await scene.settle();
      const overflows = descendants(scene.host).flatMap((node) => {
        if (node.isDestroyed || node._layoutStyle.position === 'absolute')
          return [];
        const origin = node._view.toGlobal({ x: 0, y: 0 });
        const right = origin.x + node._layoutNode.getComputedWidth();
        return origin.x < -1 || right > width + 1
          ? [
              {
                type: node.displayName,
                text: text(node),
                left: origin.x,
                right,
              },
            ]
          : [];
      });
      expect(overflows).toEqual([]);
      expect(scene.input().style.fontSize).toBe('28px');
      expect(scene.dom.querySelectorAll('input')).toHaveLength(1);
      expect(scene.control('保存设置').disabled).toBe(false);
      expect(scene.control('均衡', 'radio').getAttribute('aria-checked')).toBe(
        'true',
      );
    },
  );
});

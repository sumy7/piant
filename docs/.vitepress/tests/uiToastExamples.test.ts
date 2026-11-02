import { onError, type PNode, PRoot, render } from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import UIToastExample from '../../examples/uiToast';

const runtime = vi.hoisted(() => ({ ticks: new Set<() => void>() }));
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  return {
    ...core,
    // Run the UI visibility tick deterministically; keep real scene/layout/DOM.
    onTick(callback: () => void) {
      runtime.ticks.add(callback);
      const stop = () => {
        runtime.ticks.delete(callback);
      };
      core.onCleanup(stop);
      return stop;
    },
  };
});
const cleanups: (() => void)[] = [];
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
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  expect(runtime.ticks.size).toBe(0);
  vi.restoreAllMocks();
  vi.useRealTimers();
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
function sceneText(node: PNode) {
  return descendants(node)
    .flatMap((item) =>
      '_textContent' in item
        ? (item._textContent as Array<{ content?: string }>).map(
            (part) => part.content ?? '',
          )
        : [],
    )
    .join('');
}
async function start() {
  const target = document.createElement('div');
  document.body.append(target);
  const scene = new PRoot(new Container(), { width: 720, height: 1400 });
  const errors = vi.fn();
  const dispose = render(() => {
    onError(errors);
    return UIToastExample();
  }, scene);
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    dispose();
    scene.destroyRecursive();
    target.remove();
  };
  cleanups.push(destroy);
  const settle = async () => {
    for (let round = 0; round < 5; round++) {
      scene.doLayout();
      for (const node of descendants(scene))
        for (const child of node._view.children)
          if (child instanceof DOMContainer && !child.element.isConnected)
            target.append(child.element);
      for (const tick of [...runtime.ticks]) tick();
      await Promise.resolve();
    }
    expect(errors).not.toHaveBeenCalled();
  };
  const button = (name: string) => {
    const found = Array.from(
      target.querySelectorAll<HTMLButtonElement>('button'),
    ).find((element) => element.getAttribute('aria-label') === name);
    expect(found, name).toBeDefined();
    return found!;
  };
  const click = async (name: string) => {
    button(name).click();
    await settle();
  };
  const group = (title: string) =>
    Array.from(target.querySelectorAll<HTMLElement>('[role="group"]')).find(
      (element) => element.getAttribute('aria-label') === title,
    );
  await settle();
  return {
    target,
    scene,
    errors,
    settle,
    button,
    click,
    group,
    destroy,
    text: () => sceneText(scene),
  };
}

describe('Toast online example in the actual UI runtime', () => {
  it('runs bounded queues, upserts, explicit actions and stable separate live channels', async () => {
    const fixture = await start();
    const polite =
      fixture.target.querySelector<HTMLElement>('[role="status"]')!;
    const assertive =
      fixture.target.querySelector<HTMLElement>('[role="alert"]')!;
    expect(polite.textContent).toBe('');
    expect(assertive.textContent).toBe('');
    await fixture.click('加入 5 条 Toast');
    expect(fixture.text()).toContain('全部 5；可见 3；排队 2；拒绝 0');
    await vi.advanceTimersByTimeAsync(60);
    await fixture.settle();
    expect(polite.textContent).toContain('排队通知');
    expect(polite.textContent).not.toContain('排队通知 4');
    expect(polite.textContent).not.toContain('排队通知 5');
    expect(polite.querySelector('button')).toBeNull();
    await fixture.click('加入 5 条 Toast');
    expect(fixture.text()).toContain('全部 6；可见 3；排队 3；拒绝 4');
    await fixture.click('清空 Toast');
    expect(fixture.text()).toContain('全部 0；可见 0；排队 0');
    await fixture.click('创建或替换上传 Toast');
    await fixture.click('创建或替换上传 Toast');
    expect(fixture.text()).toContain('全部 1；可见 1；排队 0');
    expect(fixture.group('上传任务 1')).toBeUndefined();
    expect(fixture.group('上传任务 2')).toBeDefined();
    await fixture.click('局部更新上传 Toast');
    expect(fixture.group('上传任务 2')?.textContent).toContain('进度已更新');
    expect(fixture.text()).toContain('局部更新：成功');
    await fixture.click('清空 Toast');
    await fixture.click('加入持久操作 Toast');
    const action = fixture.button('恢复草稿: 草稿可恢复');
    action.focus();
    await fixture.click('切换 Toast 主题、密度与字号');
    expect(fixture.button('恢复草稿: 草稿可恢复')).toBe(action);
    expect(document.activeElement).toBe(action);
    await fixture.click('恢复草稿: 草稿可恢复');
    expect(fixture.text()).toContain('恢复 1 次');
    expect(fixture.text()).toContain('最近关闭：recover:action');
    expect(fixture.group('草稿可恢复')).toBeUndefined();
    await fixture.click('加入重要提醒 Toast');
    await vi.advanceTimersByTimeAsync(60);
    await fixture.settle();
    expect(fixture.target.querySelector('[role="alert"]')).toBe(assertive);
    expect(assertive.textContent).toContain('连接已断开');
    expect(assertive.querySelector('button')).toBeNull();
  });

  it('keeps saved results after the finite message and remounts a clean Provider', async () => {
    const fixture = await start();
    await fixture.click('加入短暂 Toast');
    expect(fixture.group('草稿已保存')).toBeDefined();
    await vi.advanceTimersByTimeAsync(3999);
    await fixture.settle();
    expect(fixture.group('草稿已保存')).toBeDefined();
    await vi.advanceTimersByTimeAsync(1);
    await fixture.settle();
    expect(fixture.group('草稿已保存')).toBeUndefined();
    expect(fixture.text()).toContain('保存结果：草稿已保存');
    expect(fixture.text()).toContain('最近关闭：finite:timeout');
    await fixture.click('加入持久操作 Toast');
    const action = fixture.button('恢复草稿: 草稿可恢复');
    const oldRegion = fixture.target.querySelector(
      '[role="region"][aria-label="示例通知"]',
    )!;
    await fixture.click('卸载 ToastProvider');
    expect(action.isConnected).toBe(false);
    expect(oldRegion.isConnected).toBe(false);
    expect(runtime.ticks.size).toBe(0);
    await vi.advanceTimersByTimeAsync(8000);
    await fixture.click('重新挂载 ToastProvider');
    expect(fixture.text()).toContain(
      '全部 0；可见 0；排队 0；拒绝 0；恢复 0 次',
    );
    expect(
      fixture.target.querySelector('[role="region"][aria-label="示例通知"]'),
    ).not.toBe(oldRegion);
    await fixture.click('加入 5 条 Toast');
    expect(fixture.text()).toContain('全部 5；可见 3；排队 2');
    fixture.destroy();
    expect(runtime.ticks.size).toBe(0);
  });
});

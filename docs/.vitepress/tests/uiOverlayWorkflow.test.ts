import {
  createState,
  mergeProps,
  onError,
  type PNode,
  PRoot,
  render,
} from '@piant/core';
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
import {
  OverlayWorkflow,
  type OverlayWorkflowProps,
  type OverlayWorkflowSnapshot,
} from '../../../examples/ui-gallery/src/OverlayWorkflow';
import UIOverlayWorkflowExample from '../../examples/uiOverlayWorkflow';

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
    // Reuse the online-overlay fixture pattern, replacing only GPU mounting.
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
const context = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
const popover = Object.getOwnPropertyDescriptor(
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
  for (const entry of runtime.scenes.splice(0).reverse()) entry.destroy();
  expect(runtime.ticks.size).toBe(0);
  runtime.target = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
afterAll(() => {
  if (context)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', context);
  if (popover)
    Object.defineProperty(HTMLElement.prototype, 'showPopover', popover);
  else Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
  vi.unstubAllGlobals();
});
function nodes(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(nodes)];
}
function attach(scene: PRoot, target: HTMLElement) {
  if (scene.isDestroyed) return;
  scene.doLayout();
  for (const node of nodes(scene))
    for (const child of node._view.children)
      if (child instanceof DOMContainer && !child.element.isConnected)
        target.append(child.element);
}
async function settle() {
  for (let round = 0; round < 6; round++) {
    for (const entry of runtime.scenes) attach(entry.scene, entry.target);
    for (const tick of [...runtime.ticks]) tick();
    await Promise.resolve();
  }
}
async function start(
  props: OverlayWorkflowProps = {},
  component?: () => unknown,
) {
  const target = document.createElement('div');
  document.body.append(target);
  runtime.target = target;
  const scene = new PRoot(new Container(), { width: 720, height: 900 });
  const snapshots: OverlayWorkflowSnapshot[] = [];
  const configured = mergeProps(props, {
    onStateChange(snapshot: OverlayWorkflowSnapshot) {
      snapshots.push(snapshot);
      props.onStateChange?.(snapshot);
    },
  }) as OverlayWorkflowProps;
  const errors = vi.fn();
  const stop = render(() => {
    onError(errors);
    return component ? component() : OverlayWorkflow(configured);
  }, scene);
  let closed = false;
  const destroy = () => {
    if (closed) return;
    closed = true;
    stop();
    scene.destroyRecursive();
    target.remove();
  };
  runtime.scenes.push({ scene, target, destroy });
  await settle();
  expect(errors).not.toHaveBeenCalled();
  return { target, errors, snapshots, destroy, state: () => snapshots.at(-1)! };
}
function named<T extends HTMLElement>(name: string) {
  const element = Array.from(document.querySelectorAll<T>('[aria-label]')).find(
    (item) => item.getAttribute('aria-label') === name,
  );
  expect(element, name).toBeDefined();
  return element!;
}
async function click(name: string) {
  named<HTMLButtonElement>(name).click();
  await settle();
}
function key(element: HTMLElement, key: string) {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}
async function edit(name: string, value: string) {
  const input = named<HTMLInputElement>(name);
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
  await settle();
  return input;
}

describe('shared overlay workflow and its live wrapper', () => {
  it('composes document edits, Select preview/commit, Menu, Popover, Tooltip, save and undo', async () => {
    const fixture = await start({ name: '流程' });
    await edit('流程 背景草稿', '背景备注');
    named<HTMLButtonElement>('流程 编辑文档').focus();
    await click('流程 编辑文档');
    const input = named<HTMLInputElement>('流程 文档名称');
    expect(document.activeElement).toBe(input);
    await edit('流程 文档名称', '发布计划');
    const select = named<HTMLButtonElement>('流程 可见性');
    select.focus();
    await click('流程 可见性');
    key(select, 'ArrowDown');
    await settle();
    expect(fixture.state().visibility).toBe('team');
    key(select, 'Enter');
    await settle();
    expect(fixture.state().visibility).toBe('public');
    await click('流程 更多操作');
    const menu = named('流程 文档操作');
    key(menu, 'Home');
    key(menu, 'Enter');
    await settle();
    expect(fixture.state().menuActions).toBe(1);
    expect(fixture.state().draftName).toBe('发布计划 副本');
    await click('流程 编辑备注');
    await edit('流程 备注草稿', '发布说明');
    await click('流程 完成备注');
    await click('流程 编辑备注');
    expect(named<HTMLInputElement>('流程 备注草稿').value).toBe('发布说明');
    await click('流程 完成备注');
    named<HTMLButtonElement>('流程 帮助').focus();
    await settle();
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    key(named('流程 帮助'), 'Escape');
    await settle();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click('流程 保存并关闭');
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(fixture.state()).toMatchObject({
      background: '背景备注',
      savedName: '发布计划 副本',
      visibility: 'public',
      saves: 1,
      archives: 0,
    });
    await click('流程 撤销保存: 流程 文档已保存');
    expect(fixture.state()).toMatchObject({
      savedName: '季度计划',
      draftName: '季度计划',
      visibility: 'team',
      saves: 1,
      undoCount: 1,
    });
    expect(fixture.errors).not.toHaveBeenCalled();
  });

  it('keeps cancellation separate from one explicit archive and closes the owned modal stack', async () => {
    const fixture = await start({ name: '确认' });
    await click('确认 编辑文档');
    await edit('确认 文档名称', '未保存的名字');
    await click('确认 归档文档');
    expect(document.activeElement).toBe(named('确认 取消归档'));
    await click('确认 取消归档');
    expect(fixture.state().archives).toBe(0);
    await click('确认 归档文档');
    key(named('确认 取消归档'), 'Escape');
    await settle();
    expect(fixture.state().archives).toBe(0);
    await click('确认 取消编辑');
    expect(fixture.state().draftName).toBe('季度计划');
    await click('确认 编辑文档');
    await click('确认 归档文档');
    await click('确认 确认归档');
    expect(fixture.state()).toMatchObject({
      archives: 1,
      saves: 0,
      menuActions: 0,
    });
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(
      document.querySelector('[role="group"][aria-label="确认 文档已归档"]'),
    ).not.toBeNull();
    expect(fixture.errors).not.toHaveBeenCalled();
  });

  it('retains input selection under getter theme changes and releases the shared scene and live wrapper', async () => {
    const [dark, setDark] = createState(false);
    const [scale, setScale] = createState(1);
    const [unrelated, setUnrelated] = createState(0);
    const fixture = await start({
      name: '主题',
      get colorMode() {
        return dark() ? 'dark' : 'light';
      },
      get fontScale() {
        return scale();
      },
      onStateChange: () => {
        unrelated();
      },
    });
    await click('主题 编辑文档');
    const input = await edit('主题 文档名称', '保留原生选区');
    input.focus();
    input.setSelectionRange(1, 3);
    setDark(true);
    setScale(2);
    await settle();
    expect(named('主题 文档名称')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    const count = fixture.snapshots.length;
    setUnrelated(1);
    await settle();
    expect(fixture.snapshots).toHaveLength(count);
    fixture.destroy();
    await settle();
    expect(input.isConnected).toBe(false);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.ticks.size).toBe(0);
    input.value = '过期回调';
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(fixture.snapshots).toHaveLength(count);
    const wrapper = await start({}, UIOverlayWorkflowExample);
    await edit('示例 背景草稿', '稍后清理');
    await click('卸载组合场景');
    expect(wrapper.target.querySelector('input')).toBeNull();
    await click('重新挂载组合场景');
    expect(named<HTMLInputElement>('示例 背景草稿').value).toBe(
      '未修改的背景内容',
    );
    expect(wrapper.errors).not.toHaveBeenCalled();
  });
});

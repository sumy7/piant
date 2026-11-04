import {
  createState,
  onError,
  type PNode,
  PRoot,
  render,
  View,
} from '@piant/core';
import { Container, DOMContainer, Ticker } from 'pixi.js';
import { afterEach, expect, it, vi } from 'vitest';
import { VirtualCollectionModel } from '../dist/components/internal/virtualCollection.js';
import { TextField } from '../dist/components/TextField.js';
import {
  VirtualList,
  type VirtualListHandle,
  type VirtualListProps,
} from '../dist/components/VirtualList.js';
import { UIProvider } from '../dist/theme/UIProvider.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
function fixture(props: Partial<VirtualListProps<number>> = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  let api!: VirtualListHandle;
  const errors = vi.fn();
  const forwarded = Object.defineProperties(
    {
      label: 'Rows',
      items: Array.from({ length: 10000 }, (_, i) => i),
      getKey: (item: number) => String(item),
      getLabel: (item: number) => `Row ${item}`,
      estimateHeight: 32,
      measure: false,
      style: { width: 320, height: 320 },
      children: () => View({ style: { height: 32 } }),
      apiRef: (handle: VirtualListHandle) => {
        api = handle;
      },
    },
    Object.getOwnPropertyDescriptors(props),
  ) as VirtualListProps<number>;
  const dispose = render(
    () =>
      UIProvider({
        children: () => {
          onError(errors);
          return VirtualList(forwarded);
        },
      }),
    host,
  );
  function settle() {
    function attach(node: PNode) {
      for (const view of node._view.children)
        if (view instanceof DOMContainer && !dom.contains(view.element))
          dom.append(view.element);
      for (const child of node._children) attach(child);
    }
    for (let i = 0; i < 4; i++) {
      attach(host);
      host.doLayout();
    }
  }
  settle();
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  expect(errors.mock.calls).toEqual([]);
  return { api, host, dom, dispose, settle, errors };
}
it('10,000 rows construct only viewport plus overscan and jump to distant keys without retaining old nodes', () => {
  const create = vi.fn(() => View({ style: { height: 32 } }));
  const scene = fixture({ children: create });
  expect(scene.api.range()).toMatchObject({
    start: 0,
    end: 12,
    total: 10000,
    totalHeight: 320000,
  });
  expect(create).toHaveBeenCalledTimes(12);
  const first = scene.api.getItemNode('0')!;
  scene.api.scrollToKey('5000');
  scene.settle();
  expect(scene.api.range()).toMatchObject({
    start: 4998,
    end: 5012,
    offset: 160000,
  });
  expect(first.isDestroyed).toBe(true);
  expect(scene.api.getItemNode('0')).toBeUndefined();
  expect(scene.dom.querySelectorAll('[role=listitem]')).toHaveLength(14);
  scene.api.scrollToIndex(9999, 'end');
  scene.settle();
  expect(scene.api.range().end).toBe(10000);
  expect(scene.api.range().offset).toBe(319680);
});
it('preserves keyed anchor after prepend/delete, prunes measurements and keeps unchanged visible rows', () => {
  const [items, setItems] = createState(
    Array.from({ length: 100 }, (_, i) => i),
  );
  const scene = fixture({
    get items() {
      return items();
    },
  });
  scene.api.scrollToKey('50');
  scene.settle();
  const retained = scene.api.getItemNode('50');
  setItems([-2, -1, ...items()]);
  scene.settle();
  expect(scene.api.range().offset).toBe(52 * 32);
  expect(scene.api.getItemNode('50')).toBe(retained);
  setItems(items().filter((item) => item !== 0));
  scene.settle();
  expect(scene.api.range().offset).toBe(51 * 32);
  const model = new VirtualCollectionModel<number>();
  model.rebuild([1, 2], String, () => 32);
  model.heights.set('1', 70);
  model.rebuild([2], String, () => 32);
  expect(model.heights.has('1')).toBe(false);
});
it('aligns and clamps offsets, exposes mounted semantics only and supports viewport keyboard scrolling', () => {
  const scene = fixture();
  scene.api.focus();
  const down = new KeyboardEvent('keydown', {
    key: 'PageDown',
    bubbles: true,
    cancelable: true,
  });
  scene.api.element.dispatchEvent(down);
  scene.settle();
  expect(down.defaultPrevented).toBe(true);
  expect(scene.api.range().offset).toBe(320);
  scene.api.scrollToIndex(100, 'center');
  scene.settle();
  expect(scene.api.range().offset).toBe(100 * 32 + 16 - 160);
  scene.api.scrollToIndex(100, 'nearest');
  expect(scene.api.range().offset).toBe(3056);
  expect(scene.api.getItemElement('100')?.getAttribute('aria-posinset')).toBe(
    '101',
  );
  expect(scene.api.getItemElement('0')).toBeUndefined();
  scene.api.scrollToOffset(-10);
  expect(scene.api.range().offset).toBe(0);
});
it('measures variable custom rows and preserves the top anchor after heights change', () => {
  const [height, setHeight] = createState(64);
  const scene = fixture({
    items: Array.from({ length: 100 }, (_, i) => i),
    measure: true,
    children: () =>
      View({
        get style() {
          return { height: height() };
        },
      }),
  });
  expect(scene.api.range().totalHeight).toBeGreaterThan(3200);
  scene.api.scrollToKey('5');
  scene.settle();
  const before = scene.api.range().offset;
  setHeight(96);
  scene.settle();
  expect(scene.api.range().offset).toBeGreaterThanOrEqual(before);
  expect(scene.api.getItemElement('5')).toBeDefined();
});
it('owner and node disposal detach semantics and stop reacting to subsequent updates', () => {
  const [items, setItems] = createState([1, 2, 3]);
  const changed = vi.fn();
  const scene = fixture({
    get items() {
      return items();
    },
    onRangeChange: changed,
  });
  scene.api.node.destroyRecursive();
  const count = changed.mock.calls.length;
  setItems([4, 5, 6]);
  scene.settle();
  scene.api.scrollToIndex(1);
  expect(changed).toHaveBeenCalledTimes(count);
  expect(scene.dom.querySelectorAll('[role=list]')).toHaveLength(0);
  expect(scene.api.focus()).toBe(false);
});

it('recovers a focused native descendant to stable viewport before recycling and retains externally keyed edits', () => {
  const editValues = new Map<number, string>();
  const inputs = new Map<number, import('@piant/core').PInput>();
  const scene = fixture({
    children: (item) =>
      TextField({
        'aria-label': `Edit ${item()}`,
        get value() {
          return editValues.get(item()) ?? '';
        },
        onValueChange(value) {
          editValues.set(item(), value);
        },
        ref(input) {
          inputs.set(item(), input);
        },
      }),
  });
  const input = inputs.get(0)!;
  input.focus();
  expect(document.activeElement).toBe(input.element);
  input.element.value = 'retained';
  input.element.dispatchEvent(new InputEvent('input', { bubbles: true }));
  scene.api.scrollToKey('100');
  scene.settle();
  expect(document.activeElement).toBe(scene.api.element);
  expect(input.isDestroyed).toBe(true);
  scene.api.scrollToIndex(0);
  scene.settle();
  expect(inputs.get(0)?.element.value).toBe('retained');
});
it('prunes changed keyed heights and validates finite estimates/unique keys', () => {
  const model = new VirtualCollectionModel<{ id: string; size: number }>();
  const item = { id: 'a', size: 32 };
  model.rebuild(
    [item],
    (i) => i.id,
    (i) => i.size,
  );
  model.heights.set('a', 80);
  model.rebuild(
    [{ id: 'a', size: 48 }],
    (i) => i.id,
    (i) => i.size,
  );
  expect(model.heights.size).toBe(0);
  expect(model.totalHeight).toBe(48);
  expect(() =>
    model.rebuild(
      [item, item],
      (i) => i.id,
      (i) => i.size,
    ),
  ).toThrow('unique');
  expect(() =>
    model.rebuild(
      [item],
      (i) => i.id,
      () => NaN,
    ),
  ).toThrow('positive');
});
it('a viewport resize clamps only when necessary and disabled roots leave keyboard scroll untouched', () => {
  const [height, setHeight] = createState(320);
  const [disabled, setDisabled] = createState(false);
  const scene = fixture({
    get style() {
      return { width: 320, height: height() };
    },
    get disabled() {
      return disabled();
    },
  });
  scene.api.scrollToKey('500');
  scene.settle();
  const before = scene.api.range().offset;
  setHeight(160);
  scene.settle();
  expect(scene.api.range().offset).toBe(before);
  expect(scene.api.range().end - scene.api.range().start).toBe(9);
  setDisabled(true);
  expect(scene.api.focus()).toBe(false);
  const event = new KeyboardEvent('keydown', {
    key: 'PageDown',
    bubbles: true,
    cancelable: true,
  });
  scene.api.element.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(scene.api.range().offset).toBe(before);
  expect(scene.api.element.getAttribute('aria-disabled')).toBe('true');
});

it('owner disposal unregisters every ticker added by the collection and its focus scope', () => {
  const add = vi.spyOn(Ticker.prototype, 'add');
  const remove = vi.spyOn(Ticker.prototype, 'remove');
  const scene = fixture();
  const callbacks = add.mock.calls
    .map((call) => call[0])
    .filter((callback) => callback !== scene.host.doLayout);
  scene.dispose();
  expect(
    callbacks
      .filter(
        (callback) => !remove.mock.calls.some((call) => call[0] === callback),
      )
      .map((callback) => callback.name),
  ).toEqual([]);
  expect(scene.api.getItemNode('0')).toBeUndefined();
  add.mockRestore();
  remove.mockRestore();
});
it('measured heights can shrink below an estimate without retaining removed measurement entries', () => {
  const [height, setHeight] = createState(64);
  const scene = fixture({
    items: Array.from({ length: 30 }, (_, index) => index),
    measure: true,
    estimateHeight: 40,
    children: () =>
      View({
        get style() {
          return { height: height() };
        },
      }),
  });
  const before = scene.api.range().totalHeight;
  setHeight(16);
  scene.settle();
  expect(scene.api.range().totalHeight).toBeLessThan(before);
  expect(scene.api.getItemNode('0')?._layoutNode.getComputedHeight()).toBe(16);
});

it('switching measurement mode clears old measurements while preserving the visible keyed anchor', () => {
  const [measure, setMeasure] = createState(true);
  const [estimate, setEstimate] = createState(32);
  const scene = fixture({
    items: Array.from({ length: 100 }, (_, i) => i),
    get measure() {
      return measure();
    },
    get estimateHeight() {
      return estimate();
    },
    children: () => View({ style: { height: 64 } }),
  });
  scene.api.scrollToKey('5');
  scene.settle();
  setMeasure(false);
  scene.settle();
  expect(scene.api.range().totalHeight).toBe(3200);
  expect(scene.api.range().offset).toBe(160);
  expect(scene.api.getItemNode('5')).toBeDefined();
  setEstimate(48);
  scene.settle();
  expect(scene.api.range().totalHeight).toBe(4800);
  expect(scene.api.range().offset).toBe(240);
  expect(scene.api.getItemNode('5')).toBeDefined();
});
it('width invalidation restores the keyed anchor even if mounted rows now equal the estimate', () => {
  const [width, setWidth] = createState(320);
  const [rowHeight, setHeight] = createState(64);
  const scene = fixture({
    items: Array.from({ length: 100 }, (_, i) => i),
    measure: true,
    get style() {
      return { width: width(), height: 320 };
    },
    children: () =>
      View({
        get style() {
          return { height: rowHeight() };
        },
      }),
  });
  scene.api.scrollToKey('10');
  scene.settle();
  setHeight(32);
  setWidth(240);
  scene.settle();
  expect(scene.api.range().offset).toBe(320);
  expect(scene.api.getItemNode('10')).toBeDefined();
});

it('bridges wheel from owned native row editors only, respects disabled and releases its document listener', () => {
  const editors = new Map<number, import('@piant/core').PInput>();
  const [disabled, setDisabled] = createState(false);
  const scene = fixture({
    get disabled() {
      return disabled();
    },
    children: (item) =>
      TextField({
        'aria-label': `Edit ${item()}`,
        ref: (n) => {
          editors.set(item(), n);
        },
      }),
  });
  const wheel = (target: HTMLElement, init: WheelEventInit = {}) => {
    const event = new WheelEvent('wheel', {
      deltaY: 64,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(event, 'ctrlKey', { value: init.ctrlKey ?? false });
    target.dispatchEvent(event);
    return event;
  };
  const event = wheel(editors.get(0)!.element);
  scene.settle();
  expect(event.defaultPrevented).toBe(true);
  expect(scene.api.range().offset).toBe(64);
  const unrelated = document.createElement('input');
  document.body.append(unrelated);
  expect(wheel(unrelated).defaultPrevented).toBe(false);
  expect(scene.api.range().offset).toBe(64);
  unrelated.remove();
  const current = editors.get(2)!.element;
  expect(wheel(current, { ctrlKey: true }).defaultPrevented).toBe(false);
  setDisabled(true);
  expect(wheel(current).defaultPrevented).toBe(false);
  expect(scene.api.range().offset).toBe(64);
  setDisabled(false);
  const page = wheel(current, { deltaY: 1, deltaMode: 2 });
  scene.settle();
  expect(page.defaultPrevented).toBe(true);
  expect(scene.api.range().offset).toBe(384);
  scene.api.node.destroyRecursive();
  expect(wheel(scene.dom).defaultPrevented).toBe(false);
});
it('live removal keeps queued row getters safe until their keyed subtree is disposed', () => {
  const [items, setItems] = createState([
    { id: 1, label: 'One' },
    { id: 2, label: 'Two' },
  ]);
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const scene = fixture({
    get items() {
      return items() as unknown as number[];
    },
    getKey: (item) => String((item as unknown as { id: number }).id),
    getLabel: (item) => (item as unknown as { label: string }).label,
    children: (item) =>
      View({
        get style() {
          return { height: (item() as unknown as { id: number }).id + 30 };
        },
      }),
  });
  setItems([]);
  scene.settle();
  expect(scene.api.range().total).toBe(0);
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

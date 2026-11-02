import 'pixi.js/events';
import {
  createState,
  onCleanup,
  onError,
  type PNode,
  PRoot,
  render,
  View,
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
import { Button, Tabs, TextField, UIProvider } from '../dist/index.js';

const cleanups: (() => void)[] = [];
const context = Object.getOwnPropertyDescriptor(
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
        return {
          width: text.length * 7,
          actualBoundingBoxAscent: 11,
          actualBoundingBoxDescent: 3,
        };
      },
    }),
  });
});
afterAll(() => {
  if (context)
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', context);
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
function fixture(create: () => unknown) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 440, height: 800 });
  const errors = vi.fn();
  const stop = render(
    () =>
      UIProvider({
        reducedMotion: false,
        children: () => {
          onError(errors);
          return View({
            style: { width: 400, flexDirection: 'column' },
            children: create() as JSX.Element,
          });
        },
      }),
    host,
  );
  const settle = () => {
    for (const node of descendants(host))
      for (const child of node._view.children)
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
    host.doLayout();
  };
  settle();
  cleanups.push(() => {
    stop();
    host.destroyRecursive();
    dom.remove();
  });
  return { dom, host, errors, stop, settle };
}
function key(
  element: HTMLElement,
  value: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}
function named(dom: HTMLElement, label: string) {
  const element = Array.from(
    dom.querySelectorAll<HTMLButtonElement>('[role="button"]'),
  ).find((element) => element.getAttribute('aria-label') === label);
  if (!element) throw new Error(`Missing trigger ${label}`);
  return element;
}
function panel(trigger: HTMLElement) {
  return document.getElementById(trigger.getAttribute('aria-controls')!)!;
}
const choices: readonly import('../dist/index.js').TabsItem[] = [
  {
    value: 'a',
    label: 'Alpha',
    children: () => Button({ children: 'Alpha action' }),
  },
  {
    value: 'b',
    label: 'Beta',
    disabled: true,
    children: () => Button({ children: 'Beta action' }),
  },
  {
    value: 'c',
    label: 'Gamma',
    children: () => TextField({ 'aria-label': 'Gamma input' }),
  },
];
function tabs(
  props: Omit<import('../dist/index.js').TabsProps, 'label' | 'items'> & {
    label?: string;
    items?: readonly import('../dist/index.js').TabsItem[];
  } = {},
) {
  const forwarded = Object.defineProperties(
    { label: 'Sections', items: choices },
    Object.getOwnPropertyDescriptors(props),
  ) as import('../dist/index.js').TabsProps;
  return fixture(() => Tabs(forwarded));
}
function tab(dom: HTMLElement, label: string) {
  const element = Array.from(
    dom.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ).find((element) => element.getAttribute('aria-label') === label);
  if (!element) throw new Error(`Missing tab ${label}`);
  return element;
}

describe('published Tabs', () => {
  it('does not repeat a rejected focus selection when retained item labels change', () => {
    const [source, setSource] = createState(() => choices);
    const changed = vi.fn();
    const scene = tabs({
      value: 'a',
      get items() {
        return source()();
      },
      onValueChange: changed,
    });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    a.focus();
    key(a, 'ArrowRight');
    expect(document.activeElement).toBe(c);
    expect(changed).toHaveBeenCalledExactlyOnceWith('c');
    setSource(
      () => () =>
        choices.map((item) =>
          item.value === 'c' ? { ...item, label: 'Updated Gamma' } : item,
        ),
    );
    scene.settle();
    expect(tab(scene.dom, 'Updated Gamma')).toBe(c);
    expect(document.activeElement).toBe(c);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(a.getAttribute('aria-selected')).toBe('true');
  });

  it('does not reopen a controlled null selection while restoring focus from hidden panel input', () => {
    const [value, setValue] = createState<string | null>('a');
    const changed = vi.fn();
    const scene = tabs({
      items: [
        {
          value: 'a',
          label: 'Alpha',
          children: () => TextField({ 'aria-label': 'Active input' }),
        },
        choices[2],
      ],
      get value() {
        return value();
      },
      onValueChange: changed,
    });
    const a = tab(scene.dom, 'Alpha');
    scene.dom
      .querySelector<HTMLInputElement>('[aria-label="Active input"]')!
      .focus();
    setValue(null);
    scene.settle();
    expect(changed).not.toHaveBeenCalled();
    expect(a.getAttribute('aria-selected')).toBe('false');
    expect(tab(scene.dom, 'Gamma').getAttribute('aria-selected')).toBe('false');
    expect(panel(a).hidden).toBe(true);
    expect(document.activeElement?.getAttribute('role')).toBe('tab');
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
    expect((document.activeElement as HTMLButtonElement).tabIndex).toBe(0);
  });

  it('recovers removal of a focused header without emitting a business selection change', () => {
    const [source, setSource] = createState(() => choices);
    const changed = vi.fn();
    const scene = tabs({
      get items() {
        return source()();
      },
      onValueChange: changed,
    });
    const a = tab(scene.dom, 'Alpha');
    a.focus();
    setSource(() => () => choices.filter((item) => item.value !== 'a'));
    scene.settle();
    expect(a.isConnected).toBe(false);
    expect(document.activeElement).toBe(tab(scene.dom, 'Gamma'));
    expect(tab(scene.dom, 'Gamma').getAttribute('aria-selected')).toBe('true');
    expect(changed).not.toHaveBeenCalled();
  });

  it('pairs stable tab and tabpanel semantics with real DOM descendants and one header Tab stop', () => {
    const changed = vi.fn();
    const scene = tabs({ onValueChange: changed });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    expect(a.closest('[role="tablist"]')?.getAttribute('aria-label')).toBe(
      'Sections',
    );
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect([a.tabIndex, c.tabIndex]).toEqual([0, -1]);
    const region = panel(a);
    expect(region.getAttribute('role')).toBe('tabpanel');
    expect(region.getAttribute('aria-labelledby')).toBe(a.id);
    expect(region.tabIndex).toBe(0);
    expect(region.contains(named(scene.dom, 'Alpha action'))).toBe(true);
    expect(panel(c).hidden).toBe(true);
    expect(panel(c).tabIndex).toBe(-1);
    expect(changed).not.toHaveBeenCalled();
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('selects on automatic navigation and direct focus, skips disabled tabs and wraps Home/End', () => {
    const changed = vi.fn();
    const scene = tabs({ onValueChange: changed });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    a.focus();
    key(a, 'ArrowRight');
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute('aria-selected')).toBe('true');
    key(c, 'ArrowRight');
    expect(document.activeElement).toBe(a);
    key(a, 'End');
    expect(document.activeElement).toBe(c);
    key(c, 'Home');
    expect(document.activeElement).toBe(a);
    c.focus();
    expect(c.getAttribute('aria-selected')).toBe('true');
    expect(changed.mock.calls).toEqual([['c'], ['a'], ['c'], ['a'], ['c']]);
  });

  it('separates manual roving focus from selection until Enter or Space activation', () => {
    const changed = vi.fn();
    const scene = tabs({ activationMode: 'manual', onValueChange: changed });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    a.focus();
    key(a, 'ArrowRight');
    expect(document.activeElement).toBe(c);
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect([a.tabIndex, c.tabIndex]).toEqual([-1, 0]);
    expect(changed).not.toHaveBeenCalled();
    key(c, 'Enter');
    c.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }),
    );
    expect(c.getAttribute('aria-selected')).toBe('true');
    key(c, 'ArrowLeft');
    key(a, ' ');
    a.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }),
    );
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(changed.mock.calls).toEqual([['c'], ['a']]);
  });

  it('honors horizontal RTL and vertical keys while ignoring IME and modifiers', () => {
    const [orientation, setOrientation] = createState<
      'horizontal' | 'vertical'
    >('horizontal');
    const scene = tabs({
      dir: 'rtl',
      get orientation() {
        return orientation();
      },
    });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    a.focus();
    key(a, 'ArrowLeft');
    expect(document.activeElement).toBe(c);
    expect(key(c, 'ArrowDown').defaultPrevented).toBe(false);
    setOrientation('vertical');
    expect(
      a.closest('[role="tablist"]')?.getAttribute('aria-orientation'),
    ).toBe('vertical');
    key(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    expect(key(a, 'ArrowRight').defaultPrevented).toBe(false);
    for (const options of [
      { isComposing: true },
      { keyCode: 229 },
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
    ])
      expect(key(a, 'ArrowDown', options).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(a);
  });

  it('requests a rejected automatic selection once per navigation and preserves controlled null/invalid values', () => {
    const changed = vi.fn();
    const [value, setValue] = createState<string | null>('a');
    const scene = tabs({
      get value() {
        return value();
      },
      onValueChange: changed,
    });
    const a = tab(scene.dom, 'Alpha');
    const c = tab(scene.dom, 'Gamma');
    a.focus();
    key(a, 'ArrowRight');
    expect(document.activeElement).toBe(c);
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(changed).toHaveBeenCalledExactlyOnceWith('c');
    setValue(null);
    expect(a.getAttribute('aria-selected')).toBe('false');
    expect(c.getAttribute('aria-selected')).toBe('false');
    expect(panel(a).hidden).toBe(true);
    expect(panel(c).hidden).toBe(true);
    setValue('missing');
    expect(a.getAttribute('aria-selected')).toBe('false');
    expect(c.getAttribute('aria-selected')).toBe('false');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('retains keyed headers and panel content on reorder and recovers removed or disabled uncontrolled selections', () => {
    const content = () => TextField({ 'aria-label': 'Persistent' });
    const [source, setSource] = createState(
      (): readonly import('../dist/index.js').TabsItem[] => [
        { ...choices[0], children: content },
        choices[2],
      ],
    );
    const changed = vi.fn();
    const scene = tabs({
      get items() {
        return source()();
      },
      mountStrategy: 'lazy',
      onValueChange: changed,
    });
    const a = tab(scene.dom, 'Alpha');
    const region = panel(a);
    const input = scene.dom.querySelector<HTMLInputElement>('input')!;
    input.value = 'retained';
    setSource(() => () => [
      choices[2],
      { ...choices[0], label: 'Updated', children: content },
    ]);
    scene.settle();
    const updated = tab(scene.dom, 'Updated');
    expect(updated).toBe(a);
    expect(panel(updated)).toBe(region);
    expect(scene.dom.querySelector('input')).toBe(input);
    expect(input.value).toBe('retained');
    setSource(() => () => [
      choices[2],
      { ...choices[0], disabled: true, children: content },
    ]);
    scene.settle();
    expect(tab(scene.dom, 'Gamma').getAttribute('aria-selected')).toBe('true');
    expect(changed).not.toHaveBeenCalled();
    setSource(() => () => []);
    scene.settle();
    expect(scene.dom.querySelectorAll('[role="tab"]')).toHaveLength(0);
    expect(scene.dom.querySelectorAll('[role="tabpanel"]')).toHaveLength(0);
  });

  it.each(['unmount', 'lazy', 'keepMounted'] as const)(
    'uses %s panel ownership and restores focus before hiding content',
    (mountStrategy) => {
      const cleaned = vi.fn();
      const first = () => {
        onCleanup(cleaned);
        return TextField({
          'aria-label': 'First input',
          defaultValue: 'original',
        });
      };
      const [value, setValue] = createState<string | null>('a');
      const scene = tabs({
        items: [{ value: 'a', label: 'Alpha', children: first }, choices[2]],
        mountStrategy,
        get value() {
          return value();
        },
        onValueChange: setValue,
      });
      const a = tab(scene.dom, 'Alpha');
      const c = tab(scene.dom, 'Gamma');
      const old = scene.dom.querySelector<HTMLInputElement>(
        '[aria-label="First input"]',
      )!;
      old.value = 'edited';
      old.focus();
      setValue('c');
      scene.settle();
      expect(document.activeElement).toBe(c);
      expect(panel(a).hidden).toBe(true);
      expect(panel(a).inert).toBe(true);
      if (mountStrategy === 'unmount') expect(old.isConnected).toBe(false);
      else expect(old.tabIndex).toBe(-1);
      expect(cleaned).toHaveBeenCalledTimes(
        mountStrategy === 'unmount' ? 1 : 0,
      );
      setValue('a');
      scene.settle();
      const input = scene.dom.querySelector<HTMLInputElement>(
        '[aria-label="First input"]',
      )!;
      expect(input.value).toBe(
        mountStrategy === 'unmount' ? 'original' : 'edited',
      );
      expect(panel(a).contains(input)).toBe(true);
      expect(panel(a).tabIndex).toBe(0);
    },
  );
});

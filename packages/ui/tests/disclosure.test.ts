import 'pixi.js/events';
import {
  createMemo,
  createState,
  onCleanup,
  onError,
  type PNode,
  PRoot,
  render,
  View,
} from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
} from 'pixi.js';
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
  Accordion,
  type AccordionProps,
  Button,
  Collapsible,
  type CollapsibleProps,
  type DisclosureItem,
  TextField,
  UIProvider,
} from '../dist/index.js';

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
function collapse(props: CollapsibleProps) {
  return fixture(() => Collapsible(props));
}
function accordion(props: AccordionProps) {
  return fixture(() => Accordion(props));
}
const items: readonly DisclosureItem[] = [
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
    children: () => Button({ children: 'Gamma action' }),
  },
];

describe('Collapsible', () => {
  it('retains mounted content when the factory changes and uses the latest factory on reopening', () => {
    const oldCleanup = vi.fn();
    const original = () => {
      onCleanup(oldCleanup);
      return Button({ children: 'Original' });
    };
    const next = () => Button({ children: 'Replacement' });
    const [factory, setFactory] = createState(original);
    const scene = collapse({
      label: 'Details',
      defaultOpen: true,
      get children() {
        return factory();
      },
    });
    const old = named(scene.dom, 'Original');
    setFactory(() => next);
    scene.settle();
    expect(named(scene.dom, 'Original')).toBe(old);
    expect(oldCleanup).not.toHaveBeenCalled();
    named(scene.dom, 'Details').click();
    named(scene.dom, 'Details').click();
    scene.settle();
    expect(old.isConnected).toBe(false);
    expect(named(scene.dom, 'Replacement')).toBeTruthy();
    expect(oldCleanup).toHaveBeenCalledTimes(1);
  });
  it('links a stable expanded trigger and labelled region and activates once via pointer, Enter and Space', () => {
    const changed = vi.fn();
    const scene = collapse({
      label: 'Details',
      children: () => Button({ children: 'Inner action' }),
      onOpenChange: changed,
    });
    const trigger = named(scene.dom, 'Details');
    const region = panel(trigger);
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(region.hidden).toBe(true);
    const target = descendants(scene.host).find((node) =>
      node._view.children.some(
        (child) =>
          child instanceof DOMContainer && child.element.contains(trigger),
      ),
    )!;
    const pointer = () =>
      Object.assign(new FederatedPointerEvent(new EventBoundary()), {
        pointerId: 1,
        button: 0,
        buttons: 1,
        isPrimary: true,
        pointerType: 'mouse',
      });
    target._view.emit('pointerdown', pointer());
    target._view.emit('pointerup', pointer());
    target._view.emit('pointertap', pointer());
    scene.settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(changed.mock.calls).toEqual([[true]]);
    key(trigger, 'Enter');
    trigger.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    key(trigger, ' ');
    trigger.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }),
    );
    expect(changed.mock.calls).toEqual([[true], [false], [true]]);
    expect(panel(trigger)).toBe(region);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('preserves getters, controlled rejection and latest callbacks without mount or prop-change notifications', () => {
    const [open, setOpen] = createState(false);
    const [accept, setAccept] = createState(false);
    const [label, setLabel] = createState('Details');
    const rejected = vi.fn();
    const accepted = vi.fn((next: boolean) => setOpen(next));
    const scene = collapse({
      get label() {
        return label();
      },
      get open() {
        return open();
      },
      get onOpenChange() {
        return accept() ? accepted : rejected;
      },
      children: () => View({}),
    });
    const trigger = named(scene.dom, 'Details');
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(rejected).toHaveBeenCalledExactlyOnceWith(true);
    setAccept(true);
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(accepted).toHaveBeenCalledExactlyOnceWith(true);
    setLabel('More');
    setOpen(false);
    expect(named(scene.dom, 'More')).toBe(trigger);
    expect(accepted).toHaveBeenCalledTimes(1);
  });

  it.each(['unmount', 'lazy', 'keepMounted'] as const)(
    'implements %s ownership and native-input state retention',
    (mountStrategy) => {
      const created = vi.fn();
      const cleaned = vi.fn();
      const scene = collapse({
        label: 'Details',
        mountStrategy,
        children: () => {
          created();
          onCleanup(cleaned);
          return TextField({
            'aria-label': 'Inner input',
            defaultValue: 'initial',
          });
        },
      });
      const trigger = named(scene.dom, 'Details');
      expect(created).toHaveBeenCalledTimes(
        mountStrategy === 'keepMounted' ? 1 : 0,
      );
      trigger.click();
      scene.settle();
      const input = scene.dom.querySelector<HTMLInputElement>('input')!;
      input.value = 'edited';
      expect(created).toHaveBeenCalledTimes(1);
      trigger.click();
      scene.settle();
      const region = panel(trigger);
      expect(region.hidden).toBe(true);
      expect(region.inert).toBe(true);
      expect(cleaned).toHaveBeenCalledTimes(
        mountStrategy === 'unmount' ? 1 : 0,
      );
      if (mountStrategy === 'unmount') expect(input.isConnected).toBe(false);
      else {
        expect(input.isConnected).toBe(true);
        expect(input.tabIndex).toBe(-1);
      }
      trigger.click();
      scene.settle();
      const reopened = scene.dom.querySelector<HTMLInputElement>('input')!;
      expect(reopened.value).toBe(
        mountStrategy === 'unmount' ? 'initial' : 'edited',
      );
      expect(created).toHaveBeenCalledTimes(
        mountStrategy === 'unmount' ? 2 : 1,
      );
      scene.stop();
      expect(cleaned).toHaveBeenCalledTimes(
        mountStrategy === 'unmount' ? 2 : 1,
      );
    },
  );

  it('reads defaultOpen once, suppresses disabled triggers, and restores focus before a controlled hide', () => {
    const [initial, setInitial] = createState(true);
    const [disabled, setDisabled] = createState(false);
    const [open, setOpen] = createState(true);
    const changed = vi.fn();
    let reads = 0;
    const scene = collapse({
      label: 'Details',
      get defaultOpen() {
        reads++;
        return initial();
      },
      get open() {
        return open();
      },
      get disabled() {
        return disabled();
      },
      mountStrategy: 'lazy',
      onOpenChange: changed,
      children: () => Button({ children: 'Inner' }),
    });
    const trigger = named(scene.dom, 'Details');
    const inner = named(scene.dom, 'Inner');
    const count = reads;
    setInitial(false);
    expect(reads).toBe(count);
    setDisabled(true);
    trigger.click();
    expect(changed).not.toHaveBeenCalled();
    expect(panel(trigger).hidden).toBe(false);
    setDisabled(false);
    inner.focus();
    setOpen(false);
    scene.settle();
    expect(document.activeElement).toBe(trigger);
    expect(inner.tabIndex).toBe(-1);
    expect(changed).not.toHaveBeenCalled();
  });
});

describe('Accordion', () => {
  it('reads a queued type getter when its deferred component factory initializes', () => {
    const changed = vi.fn();
    const scene = fixture(() => {
      const type = createMemo(() => 'single' as const);
      return Accordion({
        get type() {
          return type();
        },
        items,
        defaultValue: 'a',
        onValueChange: changed,
      });
    });
    expect(scene.errors).not.toHaveBeenCalled();
    const a = named(scene.dom, 'Alpha');
    const c = named(scene.dom, 'Gamma');
    expect(a.getAttribute('aria-expanded')).toBe('true');
    c.click();
    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(c.getAttribute('aria-expanded')).toBe('true');
    c.click();
    expect(c.getAttribute('aria-expanded')).toBe('false');
    expect(changed.mock.calls).toEqual([['c'], [null]]);
  });

  it.each([
    [{ ...items[0], label: '' }],
    [items[0], { ...items[2], value: 'a' }],
    [{ ...items[0], value: '' }],
  ])('rejects unnamed or ambiguous item identities', (...invalid) => {
    const list = invalid as DisclosureItem[];
    const scene = accordion({ type: 'single', items: list });
    expect(scene.errors).toHaveBeenCalled();
    expect(scene.dom.querySelector('[role="button"]')).toBeNull();
  });

  it('uses all enabled header Tab stops and optional vertical navigation without selection changes', () => {
    const changed = vi.fn();
    const scene = accordion({ type: 'single', items, onValueChange: changed });
    const a = named(scene.dom, 'Alpha');
    const b = named(scene.dom, 'Beta');
    const c = named(scene.dom, 'Gamma');
    expect(a.closest('[role="heading"]')?.getAttribute('aria-level')).toBe('3');
    expect([a.tabIndex, b.tabIndex, c.tabIndex]).toEqual([0, -1, 0]);
    a.focus();
    key(a, 'ArrowDown');
    expect(document.activeElement).toBe(c);
    key(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    key(a, 'End');
    expect(document.activeElement).toBe(c);
    key(c, 'Home');
    expect(document.activeElement).toBe(a);
    expect(key(a, 'ArrowDown', { isComposing: true }).defaultPrevented).toBe(
      false,
    );
    expect(key(a, 'ArrowDown', { keyCode: 229 }).defaultPrevented).toBe(false);
    expect(key(a, 'Tab').defaultPrevented).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('supports single opening and collapse, including the noncollapsible variant', () => {
    const changed = vi.fn();
    const [collapsible, setCollapsible] = createState(true);
    const scene = accordion({
      type: 'single',
      items,
      defaultValue: 'a',
      get collapsible() {
        return collapsible();
      },
      onValueChange: changed,
    });
    const a = named(scene.dom, 'Alpha');
    const c = named(scene.dom, 'Gamma');
    expect(a.getAttribute('aria-expanded')).toBe('true');
    c.click();
    expect(a.getAttribute('aria-expanded')).toBe('false');
    expect(c.getAttribute('aria-expanded')).toBe('true');
    c.click();
    expect(c.getAttribute('aria-expanded')).toBe('false');
    c.click();
    setCollapsible(false);
    c.click();
    expect(c.getAttribute('aria-expanded')).toBe('true');
    expect(changed.mock.calls).toEqual([['c'], [null], ['c']]);
  });

  it('supports independent multiple panels and filters unknown/duplicate controlled values', () => {
    const [selected, setSelected] = createState<readonly string[]>([
      'a',
      'missing',
      'a',
    ]);
    const changed = vi.fn((next: readonly string[]) => setSelected(next));
    const scene = accordion({
      type: 'multiple',
      items,
      get value() {
        return selected();
      },
      onValueChange: changed,
    });
    const a = named(scene.dom, 'Alpha');
    const c = named(scene.dom, 'Gamma');
    expect(changed).not.toHaveBeenCalled();
    c.click();
    expect(changed.mock.calls).toEqual([[['a', 'c']]]);
    expect(a.getAttribute('aria-expanded')).toBe('true');
    expect(c.getAttribute('aria-expanded')).toBe('true');
    a.click();
    expect(changed.mock.calls[1]).toEqual([['c']]);
    expect(c.getAttribute('aria-expanded')).toBe('true');
  });

  it('retains keyed headers, IDs, open panel content and callbacks on reorder/replacement', () => {
    const [list, setList] = createState(() => items);
    const cleaned = vi.fn();
    const content = () => {
      onCleanup(cleaned);
      return Button({ children: 'Persistent' });
    };
    setList(() => () => [{ ...items[0], children: content }, items[2]]);
    const scene = accordion({
      type: 'single',
      get items() {
        return list()();
      },
      defaultValue: 'a',
      mountStrategy: 'lazy',
    });
    const a = named(scene.dom, 'Alpha');
    const id = a.id;
    const input = named(scene.dom, 'Persistent');
    setList(() => () => [
      items[2],
      { ...items[0], label: 'Updated', children: content },
    ]);
    scene.settle();
    const updated = named(scene.dom, 'Updated');
    expect(updated).toBe(a);
    expect(updated.id).toBe(id);
    expect(named(scene.dom, 'Persistent')).toBe(input);
    expect(updated.getAttribute('aria-expanded')).toBe('true');
    expect(cleaned).not.toHaveBeenCalled();
    setList(() => () => [items[2]]);
    scene.settle();
    expect(updated.isConnected).toBe(false);
    expect(cleaned).toHaveBeenCalledTimes(1);
  });

  it('treats invalid/removed selection as empty without callbacks and keeps disabled expanded panels visible', () => {
    const [list, setList] = createState(items);
    const [value, setValue] = createState<string | null>('missing');
    const changed = vi.fn();
    const scene = accordion({
      type: 'single',
      get items() {
        return list();
      },
      get value() {
        return value();
      },
      onValueChange: changed,
    });
    const a = named(scene.dom, 'Alpha');
    expect(a.getAttribute('aria-expanded')).toBe('false');
    setValue('a');
    setList(items.map((item) => ({ ...item, disabled: true })));
    scene.settle();
    expect(a.disabled).toBe(true);
    expect(a.getAttribute('aria-expanded')).toBe('true');
    expect(panel(a).hidden).toBe(false);
    setList([items[2]]);
    scene.settle();
    expect(named(scene.dom, 'Gamma').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(changed).not.toHaveBeenCalled();
  });

  it.each(['node', 'owner'] as const)(
    'cleans all disclosure effects and semantic nodes on %s destruction',
    (method) => {
      const [label, setLabel] = createState('Details');
      const changed = vi.fn();
      const cleaned = vi.fn();
      let node!: PNode;
      const scene = collapse({
        get label() {
          return label();
        },
        defaultOpen: true,
        onOpenChange: changed,
        ref: (current) => {
          node = current;
        },
        children: () => {
          onCleanup(cleaned);
          return Button({ children: 'Inner' });
        },
      });
      const trigger = named(scene.dom, 'Details');
      const region = panel(trigger);
      if (method === 'node') node.destroyRecursive();
      else scene.stop();
      expect(cleaned).toHaveBeenCalledTimes(1);
      expect(trigger.isConnected).toBe(false);
      expect(region.isConnected).toBe(false);
      expect(() => {
        setLabel('Changed');
        scene.host.doLayout();
        trigger.click();
      }).not.toThrow();
      expect(changed).not.toHaveBeenCalled();
      expect(scene.errors).not.toHaveBeenCalled();
    },
  );
});

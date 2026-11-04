import 'pixi.js/events';
import {
  createState,
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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SplitPane, type SplitPaneProps, UIProvider } from '../dist/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
function fixture(props: Partial<SplitPaneProps> = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  let node!: PNode;
  const errors = vi.fn();
  const forwarded = Object.defineProperties(
    {
      name: 'Panels',
      first: () => View({}),
      second: () => View({}),
      style: { width: 300, height: 200 },
    },
    Object.getOwnPropertyDescriptors(props),
  ) as SplitPaneProps;
  const originalRef = props.ref;
  forwarded.ref = (current) => {
    node = current;
    originalRef?.(current);
  };
  const dispose = render(
    () =>
      UIProvider({
        reducedMotion: false,
        children: () => {
          onError(errors);
          return View({
            style: { width: 300, height: 250 },
            children: SplitPane(forwarded),
          });
        },
      }),
    host,
  );
  function settle() {
    for (const current of descendants(host))
      for (const child of current._view.children)
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
    host.doLayout();
    host.doLayout();
  }
  settle();
  const element = dom.querySelector<HTMLButtonElement>('[role="separator"]')!;
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  expect(errors.mock.calls, 'SplitPane construction errors').toEqual([]);
  const value = () => Number(element.getAttribute('aria-valuenow'));
  return {
    node,
    separator: node._children[1]!,
    host,
    dom,
    element,
    value,
    errors,
    dispose,
    settle,
  };
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
function sync(container: Container) {
  container.getGlobalTransform(container.worldTransform);
  for (const child of container.children) sync(child);
}
function pointer(
  node: PNode,
  x: number,
  y = 20,
  options: Partial<FederatedPointerEvent> = {},
) {
  let root = node;
  while (root.parentNode) root = root.parentNode;
  sync(root._view);
  const event = new FederatedPointerEvent(new EventBoundary(root._view));
  Object.assign(
    event,
    {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    },
    options,
  );
  event.global.copyFrom(node._view.toGlobal({ x, y }));
  return event;
}
function emit(
  node: PNode,
  type: string,
  x: number,
  y = 20,
  options: Partial<FederatedPointerEvent> = {},
) {
  const event = pointer(node, x, y, options);
  node._view.emit(type, event);
  return event;
}

describe('SplitPane', () => {
  it('uses one named separator with pixel range and preserves focus through updates', () => {
    const [size, setSize] = createState(100);
    const [name, setName] = createState('Panels');
    const changed = vi.fn();
    const created = vi.fn();
    const control = fixture({
      get size() {
        return size();
      },
      get name() {
        return name();
      },
      minSize: 40,
      maxSize: 240,
      minSecondSize: 50,
      ref: created,
      onSizeChange: changed,
    });
    expect(control.value()).toBe(100);
    expect(control.element.getAttribute('aria-valuemin')).toBe('40');
    expect(control.element.getAttribute('aria-valuemax')).toBe('240');
    expect(control.element.getAttribute('aria-orientation')).toBe('vertical');
    control.element.focus();
    setSize(120);
    setName('Inspector');
    control.settle();
    expect(control.value()).toBe(120);
    expect(control.node._children[0]._layoutNode.getComputedWidth()).toBe(120);
    expect(document.activeElement).toBe(control.element);
    expect(control.element.getAttribute('aria-label')).toBe('Inspector');
    expect(created).toHaveBeenCalledTimes(1);
    expect(changed).not.toHaveBeenCalled();
  });

  it('keeps controlled rejection authoritative and invokes latest callbacks', () => {
    const [accept, setAccept] = createState(false);
    const [size, setSize] = createState(100);
    const rejected = vi.fn();
    const accepted = vi.fn(setSize);
    const control = fixture({
      get size() {
        return size();
      },
      get onSizeChange() {
        return accept() ? accepted : rejected;
      },
    });
    control.element.focus();
    key(control.element, 'ArrowRight');
    expect(rejected).toHaveBeenCalledWith(110);
    expect(control.value()).toBe(100);
    setAccept(true);
    key(control.element, 'ArrowRight');
    expect(control.value()).toBe(110);
  });

  it.each(['horizontal', 'vertical'] as const)(
    'supports %s keyboard sizing, Home/End and leaves unrelated keys alone',
    (orientation) => {
      const changed = vi.fn();
      const control = fixture({
        orientation,
        defaultSize: 100,
        minSize: 30,
        maxSize: 150,
        step: 7,
        onSizeChange: changed,
      });
      expect(key(control.element, 'End').defaultPrevented).toBe(false);
      control.element.focus();
      key(
        control.element,
        orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown',
      );
      expect(control.value()).toBe(107);
      key(
        control.element,
        orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp',
        { repeat: true },
      );
      expect(control.value()).toBe(100);
      expect(
        key(
          control.element,
          orientation === 'horizontal' ? 'ArrowUp' : 'ArrowRight',
        ).defaultPrevented,
      ).toBe(false);
      for (const options of [
        { altKey: true },
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { isComposing: true },
        { keyCode: 229 },
      ])
        expect(key(control.element, 'End', options).defaultPrevented).toBe(
          false,
        );
      expect(key(control.element, 'Tab').defaultPrevented).toBe(false);
      key(control.element, 'Home');
      expect(control.value()).toBe(30);
      key(control.element, 'End');
      expect(control.value()).toBe(150);
      key(control.element, 'End');
      expect(changed).toHaveBeenCalledTimes(4);
    },
  );

  it('clamps for container resize and impossible minima without notifying, then restores requested size', () => {
    const [width, setWidth] = createState(300);
    const changed = vi.fn();
    const control = fixture({
      defaultSize: 180,
      minSize: 80,
      minSecondSize: 60,
      get style() {
        return { width: width(), height: 200 };
      },
      onSizeChange: changed,
    });
    expect(control.value()).toBe(180);
    setWidth(150);
    control.settle();
    expect(control.value()).toBe(82);
    setWidth(50);
    control.settle();
    expect(control.value()).toBe(0);
    setWidth(300);
    control.settle();
    expect(control.value()).toBe(180);
    expect(changed).not.toHaveBeenCalled();
  });

  it('uses local transformed drag coordinates, preserves grab offset, and clamps outside release', () => {
    const changed = vi.fn();
    const control = fixture({
      defaultSize: 100,
      minSize: 40,
      minSecondSize: 50,
      onSizeChange: changed,
    });
    control.node._view.scale.set(1.8, 0.7);
    control.node._view.rotation = Math.PI / 5;
    expect(emit(control.separator, 'pointerdown', 4, 20).defaultPrevented).toBe(
      true,
    );
    expect(document.activeElement).toBe(control.element);
    emit(control.separator, 'globalpointermove', 34, 20);
    expect(control.value()).toBeCloseTo(130);
    control.settle();
    emit(control.separator, 'pointerupoutside', 400, 400, { buttons: 0 });
    expect(control.value()).toBe(242);
    emit(control.separator, 'globalpointermove', -20);
    expect(control.value()).toBe(242);
  });

  it('handles touch and ignores nonprimary contacts, secondary buttons and other pointer IDs', () => {
    const control = fixture({ defaultSize: 100 });
    emit(control.separator, 'pointerdown', 4, 20, { button: 2 });
    emit(control.separator, 'pointerdown', 4, 20, { isPrimary: false });
    emit(control.separator, 'globalpointermove', 50);
    expect(control.value()).toBe(100);
    emit(control.separator, 'pointerdown', 4, 20, { pointerType: 'touch' });
    emit(control.separator, 'globalpointermove', 24, 20, { pointerId: 2 });
    expect(control.value()).toBe(100);
    emit(control.separator, 'globalpointermove', 24, 20, {
      pointerType: 'touch',
    });
    expect(control.value()).toBe(120);
  });

  it.each([
    'pointercancel',
    'blur',
    'disabled',
    'resize',
    'orientation',
    'lost-buttons',
  ] as const)('finishes a drag on %s and retains its latest size', (reason) => {
    const [disabled, setDisabled] = createState(false);
    const [width, setWidth] = createState(300);
    const [vertical, setVertical] = createState(false);
    const control = fixture({
      defaultSize: 100,
      get disabled() {
        return disabled();
      },
      get orientation() {
        return vertical() ? 'vertical' : 'horizontal';
      },
      get style() {
        return { width: width(), height: 200 };
      },
    });
    emit(control.separator, 'pointerdown', 4);
    emit(control.separator, 'globalpointermove', 24);
    expect(control.value()).toBe(120);
    if (reason === 'pointercancel')
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    else if (reason === 'blur') window.dispatchEvent(new Event('blur'));
    else if (reason === 'disabled') setDisabled(true);
    else if (reason === 'resize') {
      setWidth(280);
      control.settle();
    } else if (reason === 'orientation') setVertical(true);
    else
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          pointerType: 'mouse',
          buttons: 0,
        }),
      );
    emit(control.separator, 'globalpointermove', 74);
    expect(control.value()).toBe(120);
  });

  it('supports vertical drag, reactive constraints and independent instances', () => {
    const [max, setMax] = createState(160);
    const first = fixture({
      orientation: 'vertical',
      defaultSize: 100,
      get maxSize() {
        return max();
      },
    });
    const second = fixture({ defaultSize: 80 });
    emit(first.separator, 'pointerdown', 20, 4);
    emit(first.separator, 'globalpointermove', 20, 34);
    expect(first.value()).toBe(130);
    expect(second.value()).toBe(80);
    setMax(110);
    first.settle();
    expect(first.value()).toBe(110);
    emit(first.separator, 'globalpointermove', 20, 64);
    expect(first.value()).toBe(110);
    setMax(160);
    first.settle();
    expect(first.value()).toBe(130);
  });

  it('reads default only once, normalizes invalid sizes, and disables interaction', () => {
    const [initial, setInitial] = createState(90);
    const [disabled, setDisabled] = createState(false);
    const changed = vi.fn();
    let reads = 0;
    const control = fixture({
      get defaultSize() {
        reads++;
        return initial();
      },
      get disabled() {
        return disabled();
      },
      onSizeChange: changed,
    });
    const count = reads;
    setInitial(140);
    expect(reads).toBe(count);
    expect(control.value()).toBe(90);
    setDisabled(true);
    expect(control.element.disabled).toBe(true);
    expect(control.element.tabIndex).toBe(-1);
    control.element.focus();
    key(control.element, 'End');
    emit(control.separator, 'pointerdown', 4);
    emit(control.separator, 'globalpointermove', 44);
    expect(control.value()).toBe(90);
    expect(changed).not.toHaveBeenCalled();
    const invalid = fixture({
      size: Number.NaN,
      minSize: -1,
      maxSize: Number.NaN,
      minSecondSize: Number.POSITIVE_INFINITY,
    });
    expect(invalid.value()).toBe(160);
  });

  it('separator Enter and Space never activate a button action', () => {
    const control = fixture({ defaultSize: 100 });
    control.element.focus();
    const activate = vi.fn();
    control.element.addEventListener('click', activate);
    expect(key(control.element, 'Enter').defaultPrevented).toBe(true);
    expect(key(control.element, ' ').defaultPrevented).toBe(true);
    control.element.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }),
    );
    expect(activate).not.toHaveBeenCalled();
    expect(control.value()).toBe(100);
  });

  it('finishes on native release when Pixi does not deliver it', async () => {
    const control = fixture({ defaultSize: 100 });
    emit(control.separator, 'pointerdown', 4);
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2 }));
    emit(control.separator, 'globalpointermove', 24);
    expect(control.value()).toBe(120);
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await Promise.resolve();
    emit(control.separator, 'globalpointermove', 74);
    expect(control.value()).toBe(120);
  });

  it.each(['owner', 'node'] as const)(
    'releases %s drag guards and proxy without late effects',
    (method) => {
      const [size, setSize] = createState(100);
      const changed = vi.fn();
      const control = fixture({
        get size() {
          return size();
        },
        onSizeChange: changed,
      });
      const added = vi.spyOn(window, 'addEventListener');
      const removed = vi.spyOn(window, 'removeEventListener');
      emit(control.separator, 'pointerdown', 4);
      const guards = added.mock.calls.filter(([type]) =>
        ['pointercancel', 'pointermove', 'pointerup', 'blur'].includes(type),
      );
      expect(guards.length).toBeGreaterThanOrEqual(4);
      if (method === 'owner') control.dispose();
      else control.node.destroyRecursive();
      for (const guard of guards)
        expect(removed).toHaveBeenCalledWith(...guard);
      expect(control.element.isConnected).toBe(false);
      expect(control.separator._view.listenerCount('globalpointermove')).toBe(
        0,
      );
      expect(() => {
        setSize(150);
        control.settle();
      }).not.toThrow();
      expect(changed).not.toHaveBeenCalled();
      expect(control.errors).not.toHaveBeenCalled();
    },
  );
});

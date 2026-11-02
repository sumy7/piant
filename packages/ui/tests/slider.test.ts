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
import { Slider, type SliderProps, UIProvider } from '../dist/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
function fixture(props: Omit<SliderProps, 'name'> & { name?: string } = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  let node!: PNode;
  const errors = vi.fn();
  const forwarded = Object.defineProperties(
    { name: 'Volume', style: { width: 200, height: 40 } },
    Object.getOwnPropertyDescriptors(props),
  ) as SliderProps;
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
            children: Slider(forwarded),
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
  }
  settle();
  const element = dom.querySelector<HTMLButtonElement>('[role="slider"]')!;
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  expect(errors.mock.calls, 'Slider construction errors').toEqual([]);
  const value = () => Number(element.getAttribute('aria-valuenow'));
  return { node, host, dom, element, value, errors, dispose, settle };
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

describe('published Slider', () => {
  it('requires provider ownership and a nonempty accessible name', () => {
    expect(() => Slider({ name: 'Volume' })).toThrow('UIProvider');
    const host = new PRoot(new Container(), { width: 200, height: 40 });
    const errors = vi.fn();
    const stop = render(
      () =>
        UIProvider({
          reducedMotion: false,
          children: () => {
            onError(errors);
            return Slider({ name: '  ' });
          },
        }),
      host,
    );
    cleanups.push(() => {
      stop();
      host.destroyRecursive();
    });
    expect(
      errors.mock.calls.some(([error]) =>
        String(error).includes('non-empty accessible name'),
      ),
    ).toBe(true);
    expect(host.firstChild).toBeNull();
  });

  it('does not consume range keys without focus and supports held-arrow repetition', () => {
    const changed = vi.fn();
    const control = fixture({ defaultValue: 50, onValueChange: changed });
    const outside = document.createElement('button');
    document.body.append(outside);
    cleanups.push(() => outside.remove());
    outside.focus();
    expect(key(control.element, 'ArrowUp').defaultPrevented).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    control.element.focus();
    key(control.element, 'ArrowUp');
    key(control.element, 'ArrowUp', { repeat: true });
    expect(control.value()).toBe(52);
    expect(changed.mock.calls).toEqual([[51], [52]]);
  });

  it('retains one node and proxy while reactive style and range props update', () => {
    const [wide, setWide] = createState(false);
    const created = vi.fn();
    const control = fixture({
      ref: created,
      get style() {
        return { width: wide() ? 280 : 200, height: 40 };
      },
      get step() {
        return wide() ? 5 : 1;
      },
      defaultValue: 20,
    });
    const element = control.element;
    setWide(true);
    control.settle();
    expect(created).toHaveBeenCalledTimes(1);
    expect(control.node._layoutNode.getComputedWidth()).toBe(280);
    expect(control.dom.querySelector('[role="slider"]')).toBe(element);
    element.focus();
    key(element, 'ArrowUp');
    expect(control.value()).toBe(25);
  });

  it('ignores unrelated native cancellation and ends on native pointerup without Pixi delivery', async () => {
    const changed = vi.fn();
    const control = fixture({ defaultValue: 50, onValueChange: changed });
    emit(control.node, 'pointerdown', 100);
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2 }));
    emit(control.node, 'globalpointermove', 117);
    expect(control.value()).toBe(60);
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await Promise.resolve();
    emit(control.node, 'globalpointermove', 185);
    expect(control.value()).toBe(60);
    expect(changed).toHaveBeenCalledExactlyOnceWith(60);
  });

  it('ends a gesture when the document hides or its reactive geometry contract changes', () => {
    const [vertical, setVertical] = createState(false);
    const control = fixture({
      defaultValue: 50,
      get orientation() {
        return vertical() ? 'vertical' : 'horizontal';
      },
    });
    emit(control.node, 'pointerdown', 100);
    emit(control.node, 'globalpointermove', 117);
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    emit(control.node, 'globalpointermove', 185);
    expect(control.value()).toBe(60);
    visibility.mockRestore();
    emit(control.node, 'pointerdown', 117);
    setVertical(true);
    emit(control.node, 'globalpointermove', 20, 15);
    expect(control.value()).toBe(60);
  });

  it('exposes named range semantics and does not notify on mount or no-op interaction', () => {
    const changed = vi.fn();
    const { element, value, errors } = fixture({
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: 0.3,
      description: 'Master audio',
      valueText: (value) => `${value} dB`,
      onValueChange: changed,
    });
    expect(element.getAttribute('aria-label')).toBe('Volume');
    expect(element.getAttribute('aria-valuemin')).toBe('-1');
    expect(element.getAttribute('aria-valuemax')).toBe('1');
    expect(element.getAttribute('aria-valuetext')).toBe('0.3 dB');
    expect(element.getAttribute('aria-orientation')).toBe('horizontal');
    expect(
      document.getElementById(element.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Master audio');
    expect(value()).toBe(0.3);
    expect(changed).not.toHaveBeenCalled();
    element.focus();
    key(element, 'End');
    key(element, 'End');
    key(element, 'ArrowUp');
    expect(changed.mock.calls).toEqual([[1]]);
    key(element, 'Home');
    key(element, 'Home');
    key(element, 'ArrowDown');
    expect(changed.mock.calls).toEqual([[1], [-1]]);
    element.click();
    key(element, 'Enter');
    key(element, ' ');
    expect(changed).toHaveBeenCalledTimes(2);
    expect(errors).not.toHaveBeenCalled();
  });

  it('keeps controlled rejection authoritative and uses the latest getter callback', () => {
    const [value, change] = createState(30);
    const [accept, setAccept] = createState(false);
    const rejected = vi.fn();
    const accepted = vi.fn((next: number) => change(next));
    const control = fixture({
      get value() {
        return value();
      },
      get onValueChange() {
        return accept() ? accepted : rejected;
      },
    });
    control.element.focus();
    key(control.element, 'ArrowRight');
    expect(rejected).toHaveBeenCalledExactlyOnceWith(31);
    expect(control.value()).toBe(30);
    setAccept(true);
    key(control.element, 'ArrowRight');
    expect(accepted).toHaveBeenCalledExactlyOnceWith(31);
    expect(control.value()).toBe(31);
    change(50);
    expect(control.value()).toBe(50);
    expect(accepted).toHaveBeenCalledTimes(1);
  });

  it('reads default once and updates getter ranges and semantic text without synthetic notifications', () => {
    const [initial, setInitial] = createState(0.3);
    const [minimum, setMin] = createState(0);
    const [maximum, setMax] = createState(1);
    const [step, setStep] = createState(0.1);
    const [label, setLabel] = createState('Volume');
    let reads = 0;
    const changed = vi.fn();
    const control = fixture({
      get defaultValue() {
        reads++;
        return initial();
      },
      get min() {
        return minimum();
      },
      get max() {
        return maximum();
      },
      get step() {
        return step();
      },
      get name() {
        return label();
      },
      valueText: (value) => `${value}%`,
      onValueChange: changed,
    });
    const count = reads;
    setInitial(0.8);
    expect(reads).toBe(count);
    expect(control.value()).toBe(0.3);
    setMin(0.2);
    setStep(0.2);
    setMax(0.7);
    setLabel('Gain');
    expect(control.value()).toBe(0.4);
    expect(control.element.getAttribute('aria-label')).toBe('Gain');
    expect(control.element.getAttribute('aria-valuetext')).toBe('0.4%');
    expect(changed).not.toHaveBeenCalled();
    control.element.focus();
    key(control.element, 'End');
    expect(control.value()).toBe(0.6);
    expect(changed).toHaveBeenCalledExactlyOnceWith(0.6);
  });

  it.each(['horizontal', 'vertical'] as const)(
    'implements all directional keys for %s and leaves Tab and modifiers to the browser',
    (orientation) => {
      const changed = vi.fn();
      const { element, value } = fixture({
        orientation,
        defaultValue: 50,
        step: 5,
        onValueChange: changed,
      });
      element.focus();
      for (const direction of ['ArrowRight', 'ArrowUp'])
        key(element, direction);
      expect(value()).toBe(60);
      for (const direction of ['ArrowLeft', 'ArrowDown'])
        key(element, direction);
      expect(value()).toBe(50);
      expect(element.getAttribute('aria-orientation')).toBe(orientation);
      const count = changed.mock.calls.length;
      for (const option of [
        { altKey: true },
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { isComposing: true },
        { keyCode: 229 },
      ])
        expect(key(element, 'ArrowUp', option).defaultPrevented).toBe(false);
      expect(key(element, 'Tab').defaultPrevented).toBe(false);
      expect(changed).toHaveBeenCalledTimes(count);
    },
  );

  it('reverses horizontal RTL arrows while vertical Up always increases', () => {
    const [orientation, setOrientation] = createState<
      'horizontal' | 'vertical'
    >('horizontal');
    const { element, value } = fixture({
      dir: 'rtl',
      get orientation() {
        return orientation();
      },
      defaultValue: 50,
    });
    element.focus();
    key(element, 'ArrowRight');
    expect(value()).toBe(49);
    key(element, 'ArrowLeft');
    expect(value()).toBe(50);
    setOrientation('vertical');
    key(element, 'ArrowRight');
    expect(value()).toBe(51);
    key(element, 'ArrowUp');
    expect(value()).toBe(52);
  });

  it('disables keyboard and pointer changes and keeps fixed ranges stable', () => {
    const changed = vi.fn();
    const control = fixture({
      disabled: true,
      defaultValue: 50,
      onValueChange: changed,
    });
    expect(control.element.disabled).toBe(true);
    expect(control.element.tabIndex).toBe(-1);
    expect(control.element.getAttribute('aria-disabled')).toBe('true');
    control.element.focus();
    key(control.element, 'End');
    emit(control.node, 'pointerdown', 180);
    emit(control.node, 'pointerup', 190);
    expect(control.value()).toBe(50);
    const fixed = fixture({
      min: 7,
      max: 7,
      defaultValue: 50,
      onValueChange: changed,
    });
    fixed.element.focus();
    key(fixed.element, 'End');
    key(fixed.element, 'ArrowUp');
    emit(fixed.node, 'pointerdown', 180);
    emit(fixed.node, 'pointerup', 190);
    expect(fixed.value()).toBe(7);
    expect(changed).not.toHaveBeenCalled();
  });

  it('retains thumb grab offset and streams local values through transformed ancestors', () => {
    const changed = vi.fn();
    const { node, value, element } = fixture({
      defaultValue: 50,
      step: 1,
      onValueChange: changed,
    });
    const parent = node.parentNode!;
    parent._view.scale.set(1.8, 0.7);
    parent._view.rotation = Math.PI / 5;
    node._view.scale.set(0.8, 1.2);
    expect(emit(node, 'pointerdown', 105).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(element);
    expect(changed).not.toHaveBeenCalled();
    emit(node, 'globalpointermove', 122);
    expect(value()).toBe(60);
    emit(node, 'globalpointermove', 122);
    expect(changed).toHaveBeenCalledExactlyOnceWith(60);
    emit(node, 'pointerupoutside', 300, 400, { buttons: 0 });
    expect(value()).toBe(100);
    emit(node, 'globalpointermove', 15);
    expect(value()).toBe(100);
  });

  it.each([
    { orientation: 'horizontal', dir: 'ltr', x: 185, y: 20, expected: 100 },
    { orientation: 'horizontal', dir: 'rtl', x: 185, y: 20, expected: 0 },
    { orientation: 'vertical', dir: 'ltr', x: 20, y: 15, expected: 100 },
  ] as const)(
    'maps track clicks for $orientation/$dir',
    ({ orientation, dir, x, y, expected }) => {
      const changed = vi.fn();
      const control = fixture({
        orientation,
        dir,
        defaultValue: 50,
        style: {
          width: orientation === 'vertical' ? 40 : 200,
          height: orientation === 'vertical' ? 200 : 40,
        },
        onValueChange: changed,
      });
      emit(control.node, 'pointerdown', x, y);
      expect(control.value()).toBe(expected);
      emit(control.node, 'pointerup', x, y, { buttons: 0 });
      expect(changed).toHaveBeenCalledExactlyOnceWith(expected);
    },
  );

  it('ignores secondary buttons, nonprimary contacts, and unrelated pointer IDs', () => {
    const changed = vi.fn();
    const control = fixture({ defaultValue: 50, onValueChange: changed });
    emit(control.node, 'pointerdown', 185, 20, { button: 2 });
    emit(control.node, 'pointerdown', 185, 20, { isPrimary: false });
    expect(changed).not.toHaveBeenCalled();
    emit(control.node, 'pointerdown', 100);
    emit(control.node, 'globalpointermove', 185, 20, { pointerId: 2 });
    emit(control.node, 'pointerupoutside', 185, 20, { pointerId: 2 });
    expect(control.value()).toBe(50);
    emit(control.node, 'globalpointermove', 117);
    expect(control.value()).toBe(60);
  });

  it.each([
    'pointercancel',
    'lost-buttons',
    'window-blur',
    'element-blur',
    'disabled',
  ] as const)(
    'ends a drag on %s without rolling back its latest value',
    (reason) => {
      const [disabled, setDisabled] = createState(false);
      const changed = vi.fn();
      const control = fixture({
        defaultValue: 50,
        get disabled() {
          return disabled();
        },
        onValueChange: changed,
      });
      emit(control.node, 'pointerdown', 100);
      emit(control.node, 'globalpointermove', 117);
      expect(control.value()).toBe(60);
      if (reason === 'pointercancel')
        window.dispatchEvent(
          new PointerEvent('pointercancel', { pointerId: 1 }),
        );
      else if (reason === 'lost-buttons')
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            buttons: 0,
          }),
        );
      else if (reason === 'window-blur')
        window.dispatchEvent(new Event('blur'));
      else if (reason === 'element-blur') control.element.blur();
      else setDisabled(true);
      emit(control.node, 'globalpointermove', 185);
      emit(control.node, 'pointerupoutside', 185);
      expect(control.value()).toBe(60);
      expect(changed).toHaveBeenCalledExactlyOnceWith(60);
    },
  );

  it.each(['node', 'owner'] as const)(
    'releases %s resources during a drag without late callbacks on reactive updates',
    (method) => {
      for (let iteration = 0; iteration < 3; iteration++) {
        const [value, setValue] = createState(50);
        const changed = vi.fn();
        const control = fixture({
          get value() {
            return value();
          },
          onValueChange: changed,
        });
        const added = vi.spyOn(window, 'addEventListener');
        const removed = vi.spyOn(window, 'removeEventListener');
        emit(control.node, 'pointerdown', 100);
        const guards = added.mock.calls.filter(([type]) =>
          ['pointercancel', 'pointermove', 'pointerup', 'blur'].includes(type),
        );
        expect(guards.length).toBeGreaterThanOrEqual(4);
        if (method === 'node') control.node.destroyRecursive();
        else control.dispose();
        expect(control.element.isConnected).toBe(false);
        expect(control.node._view.listenerCount('globalpointermove')).toBe(0);
        expect(control.node._view.listenerCount('pointerdown')).toBe(0);
        for (const guard of guards)
          expect(removed).toHaveBeenCalledWith(...guard);
        expect(() => {
          setValue(70);
          control.host.doLayout();
          control.element.click();
          window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
        }).not.toThrow();
        expect(changed).not.toHaveBeenCalled();
        expect(control.errors).not.toHaveBeenCalled();
        added.mockRestore();
        removed.mockRestore();
      }
    },
  );
});

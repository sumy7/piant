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
import {
  ColorArea,
  type ColorAreaProps,
} from '../dist/components/internal/ColorArea.js';
import type { Hsva } from '../dist/components/internal/colorValue.js';
import { UIProvider } from '../dist/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
function fixture(props: Partial<ColorAreaProps> = {}) {
  const [value, setValue] = createState<Hsva>({
    h: 210,
    s: 0.5,
    v: 0.5,
    a: 128 / 255,
  });
  const changed = vi.fn((next: Hsva) => setValue(next));
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  let node!: PNode;
  const errors = vi.fn();
  const forwarded = Object.defineProperties(
    {
      name: 'Color plane',
      get value() {
        return value();
      },
      onValueChange: changed,
      style: { width: 200, height: 100 },
    },
    Object.getOwnPropertyDescriptors(props),
  ) as ColorAreaProps;
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
            children: ColorArea(forwarded),
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
  const element = dom.querySelector<HTMLButtonElement>('[role="group"]')!;
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  expect(errors.mock.calls, 'ColorArea construction errors').toEqual([]);
  return {
    node,
    host,
    dom,
    element,
    value: () => forwarded.value,
    changed,
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

describe('internal ColorArea', () => {
  it('uses a named group with linked channel alternatives and no false slider range', () => {
    const instructions = document.createElement('span');
    instructions.id = 'color-input-alternatives';
    instructions.textContent = 'Use saturation and brightness channel inputs';
    document.body.append(instructions);
    cleanups.push(() => instructions.remove());
    const [id, setId] = createState<string | undefined>(instructions.id);
    const scene = fixture({
      description: 'Arrow keys adjust saturation and brightness.',
      get descriptionId() {
        return id();
      },
    });
    expect(scene.element.getAttribute('role')).toBe('group');
    expect(scene.element.getAttribute('aria-label')).toBe('Color plane');
    expect(
      scene.element.getAttribute('aria-describedby')?.split(/\s+/),
    ).toContain(instructions.id);
    expect(scene.element.hasAttribute('aria-valuenow')).toBe(false);
    expect(scene.element.hasAttribute('aria-valuemin')).toBe(false);
    expect(scene.dom.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    setId(undefined);
    expect(
      scene.element.getAttribute('aria-describedby')?.split(/\s+/),
    ).not.toContain(instructions.id);
    expect(scene.element.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('maps transformed local pointer coordinates while preserving hue and alpha', () => {
    const scene = fixture();
    const parent = scene.node.parentNode!;
    parent._view.scale.set(1.8, 0.7);
    parent._view.rotation = Math.PI / 5;
    scene.node._view.scale.set(0.8, 1.2);
    expect(emit(scene.node, 'pointerdown', 150, 25).defaultPrevented).toBe(
      true,
    );
    expect(scene.value().s).toBeCloseTo(0.75);
    expect(scene.value().v).toBeCloseTo(0.75);
    expect(scene.value().h).toBe(210);
    expect(scene.value().a).toBe(128 / 255);
    expect(document.activeElement).toBe(scene.element);
    emit(scene.node, 'globalpointermove', 50, 75);
    expect(scene.value().s).toBeCloseTo(0.25);
    expect(scene.value().v).toBeCloseTo(0.25);
    emit(scene.node, 'pointerupoutside', 300, -100, { buttons: 0 });
    expect(scene.value()).toEqual({ h: 210, s: 1, v: 1, a: 128 / 255 });
    const count = scene.changed.mock.calls.length;
    emit(scene.node, 'globalpointermove', 0, 100);
    expect(scene.changed).toHaveBeenCalledTimes(count);
  });

  it('supports touch, clamps boundaries and ignores secondary/nonprimary/unrelated pointers', () => {
    const scene = fixture();
    emit(scene.node, 'pointerdown', 0, 100, { button: 2 });
    emit(scene.node, 'pointerdown', 0, 100, { isPrimary: false });
    expect(scene.changed).not.toHaveBeenCalled();
    emit(scene.node, 'pointerdown', 100, 50, { pointerType: 'touch' });
    expect(scene.changed).not.toHaveBeenCalled();
    emit(scene.node, 'globalpointermove', 0, 100, { pointerId: 2 });
    emit(scene.node, 'pointercancel', 0, 100, { pointerId: 2 });
    expect(scene.changed).not.toHaveBeenCalled();
    emit(scene.node, 'globalpointermove', -30, 130, { pointerType: 'touch' });
    expect(scene.value()).toEqual({ h: 210, s: 0, v: 0, a: 128 / 255 });
    emit(scene.node, 'pointerup', 0, 100, { pointerType: 'touch', buttons: 0 });
  });

  it('increments saturation and brightness by one percent with independent control authority', () => {
    const scene = fixture();
    expect(key(scene.element, 'ArrowRight').defaultPrevented).toBe(false);
    scene.element.focus();
    for (const direction of ['ArrowRight', 'ArrowUp'])
      expect(key(scene.element, direction).defaultPrevented).toBe(true);
    expect(scene.value()).toEqual({ h: 210, s: 0.51, v: 0.51, a: 128 / 255 });
    key(scene.element, 'ArrowRight', { repeat: true });
    key(scene.element, 'ArrowLeft');
    key(scene.element, 'ArrowDown');
    expect(scene.value()).toEqual({ h: 210, s: 0.51, v: 0.5, a: 128 / 255 });
    const count = scene.changed.mock.calls.length;
    for (const option of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { isComposing: true },
      { keyCode: 229 },
    ])
      expect(key(scene.element, 'ArrowRight', option).defaultPrevented).toBe(
        false,
      );
    for (const name of ['Tab', 'Home', 'End', 'Enter', ' '])
      expect(key(scene.element, name).defaultPrevented).toBe(false);
    expect(scene.changed).toHaveBeenCalledTimes(count);
  });

  it('keeps rejected values authoritative and reads the latest callback', () => {
    const [accept, setAccept] = createState(false);
    const [value, setValue] = createState<Hsva>({
      h: 42,
      s: 0.3,
      v: 0.6,
      a: 1,
    });
    const rejected = vi.fn();
    const accepted = vi.fn(setValue);
    const scene = fixture({
      get value() {
        return value();
      },
      get onValueChange() {
        return accept() ? accepted : rejected;
      },
    });
    scene.element.focus();
    key(scene.element, 'ArrowRight');
    expect(rejected).toHaveBeenCalledWith({ h: 42, s: 0.31, v: 0.6, a: 1 });
    expect(scene.value().s).toBe(0.3);
    setAccept(true);
    key(scene.element, 'ArrowUp');
    expect(accepted).toHaveBeenCalledWith({ h: 42, s: 0.3, v: 0.61, a: 1 });
    expect(scene.value().v).toBe(0.61);
  });

  it.each([
    'pointercancel',
    'lost-buttons',
    'window-blur',
    'element-blur',
    'disabled',
    'readonly',
    'hidden',
  ] as const)('finishes dragging on %s without rollback', (reason) => {
    const [disabled, setDisabled] = createState(false);
    const [readOnly, setReadOnly] = createState(false);
    const scene = fixture({
      get disabled() {
        return disabled();
      },
      get readOnly() {
        return readOnly();
      },
    });
    emit(scene.node, 'pointerdown', 150, 25);
    expect(scene.value().s).toBe(0.75);
    if (reason === 'pointercancel')
      window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    else if (reason === 'lost-buttons')
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 1,
          pointerType: 'mouse',
          buttons: 0,
        }),
      );
    else if (reason === 'window-blur') window.dispatchEvent(new Event('blur'));
    else if (reason === 'element-blur') scene.element.blur();
    else if (reason === 'disabled') setDisabled(true);
    else if (reason === 'readonly') setReadOnly(true);
    else {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    }
    emit(scene.node, 'globalpointermove', 0, 100);
    emit(scene.node, 'pointerupoutside', 0, 100);
    expect(scene.value().s).toBe(0.75);
    expect(scene.value().v).toBe(0.75);
    expect(scene.changed).toHaveBeenCalledTimes(1);
  });

  it('does not notify on mount, programmatic values or no-op boundary keys', () => {
    const [value, setValue] = createState<Hsva>({ h: 0, s: 0, v: 1, a: 1 });
    const changed = vi.fn();
    const scene = fixture({
      get value() {
        return value();
      },
      onValueChange: changed,
    });
    scene.element.focus();
    key(scene.element, 'ArrowLeft');
    key(scene.element, 'ArrowUp');
    expect(changed).not.toHaveBeenCalled();
    setValue({ h: 120, s: 1, v: 0, a: 1 });
    scene.settle();
    key(scene.element, 'ArrowRight');
    key(scene.element, 'ArrowDown');
    expect(changed).not.toHaveBeenCalled();
    expect(scene.node._view.hitArea?.contains(100, 50)).toBe(true);
    expect(scene.node._view.hitArea?.contains(201, 50)).toBe(false);
  });

  it('cancels when its retained node becomes hidden before later movement', () => {
    const [visible, setVisible] = createState(true);
    const scene = fixture({
      get style() {
        return {
          width: 200,
          height: 100,
          display: visible() ? ('flex' as const) : ('none' as const),
        };
      },
    });
    emit(scene.node, 'pointerdown', 150, 25);
    setVisible(false);
    scene.settle();
    emit(scene.node, 'globalpointermove', 0, 100);
    expect(scene.changed).toHaveBeenCalledTimes(1);
    expect(scene.node._view.listenerCount('globalpointermove')).toBe(0);
    setVisible(true);
    scene.settle();
    emit(scene.node, 'globalpointermove', 0, 100);
    expect(scene.changed).toHaveBeenCalledTimes(1);
  });

  it('ends on native release without Pixi delivery but ignores unrelated cancellation', async () => {
    const scene = fixture();
    emit(scene.node, 'pointerdown', 150, 25);
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 2 }));
    emit(scene.node, 'globalpointermove', 50, 75);
    expect(scene.value().s).toBe(0.25);
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await Promise.resolve();
    emit(scene.node, 'globalpointermove', 0, 0);
    expect(scene.value().s).toBe(0.25);
  });

  it('keeps read-only inspectable and disabled unavailable without changes', () => {
    const readOnly = fixture({ readOnly: true });
    readOnly.element.focus();
    expect(document.activeElement).toBe(readOnly.element);
    expect(key(readOnly.element, 'ArrowRight').defaultPrevented).toBe(false);
    emit(readOnly.node, 'pointerdown', 150, 25);
    expect(readOnly.changed).not.toHaveBeenCalled();
    const disabled = fixture({ disabled: true });
    disabled.element.focus();
    expect(document.activeElement).not.toBe(disabled.element);
    expect(disabled.element.tabIndex).toBe(-1);
    expect(disabled.element.getAttribute('aria-disabled')).toBe('true');
    emit(disabled.node, 'pointerdown', 150, 25);
    expect(disabled.changed).not.toHaveBeenCalled();
  });

  it.each(['owner', 'node'] as const)(
    'releases %s guards before reactive updates and ignores stale events',
    (method) => {
      const [hue, setHue] = createState(180);
      const changed = vi.fn();
      const scene = fixture({
        get value() {
          return { h: hue(), s: 0.5, v: 0.5, a: 1 };
        },
        onValueChange: changed,
      });
      const added = vi.spyOn(window, 'addEventListener');
      const removed = vi.spyOn(window, 'removeEventListener');
      emit(scene.node, 'pointerdown', 100, 50);
      const guards = added.mock.calls.filter(([type]) =>
        ['pointercancel', 'pointermove', 'pointerup', 'blur'].includes(type),
      );
      expect(guards.length).toBeGreaterThanOrEqual(4);
      if (method === 'owner') scene.dispose();
      else scene.node.destroyRecursive();
      for (const guard of guards)
        expect(removed).toHaveBeenCalledWith(...guard);
      expect(scene.element.isConnected).toBe(false);
      expect(scene.node._view.listenerCount('globalpointermove')).toBe(0);
      expect(scene.node._view.listenerCount('pointerdown')).toBe(0);
      expect(() => {
        setHue(90);
        scene.settle();
        window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      }).not.toThrow();
      expect(changed).not.toHaveBeenCalled();
      expect(scene.errors).not.toHaveBeenCalled();
    },
  );

  it('keeps two instances independent and supports synchronous consumer destruction', () => {
    const first = fixture();
    const second = fixture();
    emit(first.node, 'pointerdown', 150, 25);
    expect(second.value().s).toBe(0.5);
    expect(second.changed).not.toHaveBeenCalled();
    let node!: PNode;
    const destroyed = vi.fn(() => node.destroyRecursive());
    const third = fixture({
      ref(current) {
        node = current;
      },
      onValueChange: destroyed,
    });
    expect(() => emit(third.node, 'pointerdown', 150, 25)).not.toThrow();
    expect(destroyed).toHaveBeenCalledTimes(1);
    expect(third.element.isConnected).toBe(false);
    expect(third.node._view.listenerCount('globalpointermove')).toBe(0);
  });
});

import {
  createEffect,
  createState,
  Input,
  type PNode,
  PRoot,
  root,
  View,
} from '@piant/core';
import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFocusable,
  createRovingFocusGroup,
  type FocusableOptions,
  type FocusableState,
  type UIFocusScope,
  UIProvider,
  useUIFocus,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

function setup(
  run: (
    add: (options: FocusableOptions, native?: boolean) => FocusableState,
    scope: UIFocusScope,
  ) => void,
) {
  const host = document.createElement('div');
  document.body.append(host);
  const scene = new PRoot(new Container(), { width: 600, height: 400 });
  const nodes: PNode[] = [];
  let scope!: UIFocusScope;
  const stop = root((dispose) => {
    UIProvider({
      reducedMotion: false,
      children: () => {
        scope = useUIFocus();
        run((options, native = false) => {
          let state!: FocusableState;
          const node = (
            native
              ? Input({
                  defaultValue: 'native value',
                  ref: (node) => {
                    const nativeOptions = Object.create(
                      options,
                    ) as FocusableOptions;
                    nativeOptions.domElement = node.domElement;
                    state = createFocusable(node, nativeOptions);
                  },
                })
              : View({})
          ) as PNode;
          if (!native) state = createFocusable(node, options);
          nodes.push(node);
          scene.appendChild(node);
          node.setStyle({ width: 100, height: 30 });
          // DOMPipe is a renderer concern. Model only its real host attachment
          // here; browser fixtures exercise transforms and real Tab navigation.
          host.append(state.element.parentElement!);
          scene.doLayout();
          return state;
        }, scope);
        return undefined;
      },
    });
    return dispose;
  });
  cleanups.push(() => {
    stop();
    scene.destroyRecursive();
    host.remove();
  });
  return { host, nodes, scope, stop, scene };
}

function key(
  element: HTMLElement,
  type: 'keydown' | 'keyup',
  key: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}

describe('provider focus and semantic registration', () => {
  it('requires a provider and rejects duplicate nodes and cross-scope groups', () => {
    expect(() => useUIFocus()).toThrow('UIProvider');
    setup((add) => {
      const group = createRovingFocusGroup();
      const first = add({ name: 'first', group });
      const node = View({}) as PNode;
      const state = createFocusable(node, { name: 'once' });
      expect(() => createFocusable(node, { name: 'twice' })).toThrow(
        'only one',
      );
      state.dispose();
      node.destroyRecursive();
      UIProvider({
        focusScope: 'isolate',
        children: () => {
          const other = View({}) as PNode;
          expect(() =>
            createFocusable(other, { name: 'cross', group }),
          ).toThrow('same live');
          other.destroyRecursive();
          return undefined;
        },
      });
      expect(first.element.tabIndex).toBe(0);
    });
  });

  it('maps name/description/checked/expanded/range semantics reactively and removes obsolete attributes', () => {
    const [role, setRole] = createState<FocusableOptions['role']>('checkbox');
    const [checked, setChecked] = createState<boolean | 'mixed'>('mixed');
    const [name, setName] = createState('Choice');
    const [description, setDescription] = createState<string | undefined>(
      'Extra details',
    );
    let state!: FocusableState;
    setup((add) => {
      state = add({
        get name() {
          return name();
        },
        get role() {
          return role();
        },
        get checked() {
          return checked();
        },
        get description() {
          return description();
        },
        expanded: false,
        value: { now: 4, min: 0, max: 10, text: 'four' },
      });
    });
    const element = state.element;
    expect(element.getAttribute('role')).toBe('checkbox');
    expect(element.getAttribute('aria-checked')).toBe('mixed');
    expect(
      document.getElementById(element.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Extra details');
    expect(element.getAttribute('aria-expanded')).toBe('false');
    expect(element.hasAttribute('aria-valuenow')).toBe(false);
    setChecked(false);
    setName('New choice');
    expect(element.getAttribute('aria-label')).toBe('New choice');
    expect(element.getAttribute('aria-checked')).toBe('false');
    setRole('slider');
    expect(element.hasAttribute('aria-checked')).toBe(false);
    expect(element.getAttribute('aria-valuenow')).toBe('4');
    expect(element.getAttribute('aria-valuemin')).toBe('0');
    expect(element.getAttribute('aria-valuemax')).toBe('10');
    expect(element.getAttribute('aria-valuetext')).toBe('four');
    setDescription(undefined);
    expect(element.hasAttribute('aria-describedby')).toBe(false);
    setRole('switch');
    setChecked('mixed');
    expect(element.getAttribute('aria-checked')).toBe('false');
  });

  it('uses a single existing native input and preserves its editing/value and restored attributes', () => {
    let state!: FocusableState;
    const { host } = setup((add) => {
      state = add({ name: 'Native', description: 'Editable' }, true);
    });
    expect(host.querySelectorAll('input')).toHaveLength(1);
    expect(host.querySelectorAll('button')).toHaveLength(0);
    const input = state.element as HTMLInputElement;
    expect(input.value).toBe('native value');
    state.focus();
    expect(key(input, 'keydown', ' ').defaultPrevented).toBe(false);
    expect(key(input, 'keydown', 'Enter').defaultPrevented).toBe(false);
    expect(key(input, 'keydown', 'ArrowLeft').defaultPrevented).toBe(false);
    input.value = '中文 input';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(input.value).toBe('中文 input');
    state.dispose();
    expect(input.isConnected).toBe(true);
    expect(input.hasAttribute('aria-label')).toBe(false);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.tabIndex).toBe(0);
  });

  it('keeps one DOM order for canvas and input; explicit order changes preserve focused input', () => {
    const [order, setOrder] = createState(2);
    let first!: FocusableState;
    let input!: FocusableState;
    let last!: FocusableState;
    const { host } = setup((add) => {
      first = add({ name: 'first', order: 1 });
      input = add(
        {
          name: 'input',
          get order() {
            return order();
          },
        },
        true,
      );
      last = add({ name: 'last', order: 3 });
    });
    const names = () =>
      Array.from(host.querySelectorAll('button,input')).map((element) =>
        element.getAttribute('aria-label'),
      );
    expect(names()).toEqual(['first', 'input', 'last']);
    expect(input.focus()).toBe(true);
    setOrder(0);
    expect(names()).toEqual(['input', 'first', 'last']);
    expect(document.activeElement).toBe(input.element);
    expect([first, input, last].map((state) => state.element.tabIndex)).toEqual(
      [0, 0, 0],
    );
  });

  it('follows retained scene order rather than ref creation order after reconciliation', () => {
    let input!: FocusableState;
    let button!: FocusableState;
    const { host, nodes, scene } = setup((add) => {
      input = add({ name: 'input' }, true);
      button = add({ name: 'button' });
    });
    input.focus();
    (input.element as HTMLInputElement).setSelectionRange(1, 4);
    scene.insertBefore(nodes[1], nodes[0]);
    scene.doLayout();
    expect(
      Array.from(host.querySelectorAll('button,input')).map((element) =>
        element.getAttribute('aria-label'),
      ),
    ).toEqual(['button', 'input']);
    expect(document.activeElement).toBe(input.element);
    expect([
      (input.element as HTMLInputElement).selectionStart,
      (input.element as HTMLInputElement).selectionEnd,
    ]).toEqual([1, 4]);
    expect(button.element.tabIndex).toBe(0);
  });

  it('skips disabled/hidden nodes, recovers focus after hiding/destroy, and respects focus outside the scope', async () => {
    const [hidden, setHidden] = createState(false);
    let one!: FocusableState;
    let two!: FocusableState;
    let last!: FocusableState;
    const { nodes, scope } = setup((add) => {
      one = add({
        name: 'one',
        get hidden() {
          return hidden();
        },
      });
      add({ name: 'disabled', disabled: true });
      two = add({ name: 'two' });
      last = add({ name: 'last' });
    });
    expect(scope.focusFirst()).toBe(true);
    expect(one.focused()).toBe(true);
    setHidden(true);
    expect(one.element.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(two.element);
    nodes[2].destroyRecursive();
    expect(document.activeElement).toBe(last.element);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    last.dispose();
    await Promise.resolve();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('inherits nested scopes by default, isolates explicit scopes and separate roots, and tears down registrations', () => {
    let inherited!: UIFocusScope;
    let isolated!: UIFocusScope;
    let first!: FocusableState;
    const one = setup((add, scope) => {
      first = add({ name: 'one' });
      UIProvider({
        children: () => {
          inherited = useUIFocus();
          return undefined;
        },
      });
      UIProvider({
        focusScope: 'isolate',
        children: () => {
          isolated = useUIFocus();
          return undefined;
        },
      });
      expect(inherited).toBe(scope);
      expect(isolated).not.toBe(scope);
    });
    let second!: FocusableState;
    const two = setup((add) => {
      second = add({ name: 'two' });
    });
    first.focus();
    expect(one.scope.focused()).toBe(first.element);
    expect(two.scope.focused()).toBe(null);
    one.stop();
    expect(first.element.isConnected).toBe(false);
    expect(first.focused()).toBe(false);
    expect(one.scope.focused()).toBe(null);
    expect(second.focus()).toBe(true);
    expect(two.scope.focused()).toBe(second.element);
  });

  it('tracks native disabled and ancestor hiding without rebuilding the provider children', async () => {
    let input!: FocusableState;
    let next!: FocusableState;
    let creations = 0;
    const { nodes, scene, scope } = setup((add) => {
      creations++;
      input = add({ name: 'native' }, true);
      next = add({ name: 'next' });
    });
    input.focus();
    (input.element as HTMLInputElement).disabled = true;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(input.element.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(next.element);
    (input.element as HTMLInputElement).disabled = false;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const parent = View({}) as PNode;
    scene.appendChild(parent);
    parent.appendChild(nodes[0]);
    scene.doLayout();
    input.focus();
    parent.setStyle({ display: 'none' });
    scene.doLayout();
    expect(input.element.tabIndex).toBe(-1);
    expect(scope.focused()).toBe(next.element);
    expect(creations).toBe(1);
  });

  it('keeps item and scope focus consistent across window blur/focus and releases document listeners', async () => {
    const addListener = vi.spyOn(document, 'addEventListener');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    let state!: FocusableState;
    const { scope, stop } = setup((add) => {
      state = add({ name: 'action' });
    });
    state.focus();
    window.dispatchEvent(new Event('blur'));
    await Promise.resolve();
    expect(state.focused()).toBe(false);
    expect(scope.focused()).toBe(null);
    window.dispatchEvent(new Event('focus'));
    expect(state.focused()).toBe(true);
    expect(scope.focused()).toBe(state.element);
    const listeners = addListener.mock.calls.filter(([name]) =>
      ['focusin', 'focusout', 'keydown', 'pointerdown'].includes(name),
    );
    stop();
    for (const args of listeners)
      expect(removeListener).toHaveBeenCalledWith(...args);
  });
});

describe('focused keyboard activation', () => {
  it('activates Enter down and Space up once, ignores repeats, and accepts AT clicks independently', () => {
    const activate = vi.fn();
    let state!: FocusableState;
    setup((add) => {
      state = add({ name: 'action', onActivate: activate });
    });
    state.focus();
    expect(key(state.element, 'keydown', 'Enter').defaultPrevented).toBe(true);
    key(state.element, 'keydown', 'Enter', { repeat: true });
    expect(activate).toHaveBeenCalledTimes(1);
    key(state.element, 'keyup', 'Enter');
    key(state.element, 'keydown', ' ');
    expect(state.pressed()).toBe(true);
    expect(activate).toHaveBeenCalledTimes(1);
    key(state.element, 'keydown', ' ', { repeat: true });
    key(state.element, 'keyup', ' ');
    key(state.element, 'keyup', ' ');
    expect(state.pressed()).toBe(false);
    expect(activate).toHaveBeenCalledTimes(2);
    state.element.click();
    expect(activate).toHaveBeenCalledTimes(3);
  });

  it('cancels armed Space on blur, disable, window blur, and disposal; composition/modifiers do not activate', () => {
    const activate = vi.fn();
    const [disabled, setDisabled] = createState(false);
    let state!: FocusableState;
    setup((add) => {
      state = add({
        name: 'action',
        get disabled() {
          return disabled();
        },
        onActivate: activate,
      });
      add({ name: 'next' });
    });
    state.focus();
    key(state.element, 'keydown', 'Enter', { isComposing: true });
    key(state.element, 'keydown', 'Enter', { ctrlKey: true });
    expect(activate).not.toHaveBeenCalled();
    key(state.element, 'keydown', ' ');
    state.element.blur();
    key(state.element, 'keyup', ' ');
    state.focus();
    key(state.element, 'keydown', ' ');
    setDisabled(true);
    setDisabled(false);
    state.focus();
    key(state.element, 'keyup', ' ');
    key(state.element, 'keydown', ' ');
    window.dispatchEvent(new Event('blur'));
    key(state.element, 'keyup', ' ');
    key(state.element, 'keydown', ' ');
    state.dispose();
    key(state.element, 'keyup', ' ');
    expect(activate).not.toHaveBeenCalled();
    expect(state.pressed()).toBe(false);
  });

  it('respects widget key handlers and role-specific activation without affecting native input keys', () => {
    const activate = vi.fn();
    let checkbox!: FocusableState;
    let slider!: FocusableState;
    const change = vi.fn((event: KeyboardEvent) => event.preventDefault());
    setup((add) => {
      checkbox = add({ name: 'check', role: 'checkbox', onActivate: activate });
      slider = add({
        name: 'range',
        role: 'slider',
        onActivate: activate,
        onKeyDown: change,
      });
    });
    checkbox.focus();
    key(checkbox.element, 'keydown', 'Enter');
    expect(activate).not.toHaveBeenCalled();
    key(checkbox.element, 'keydown', ' ');
    key(checkbox.element, 'keyup', ' ');
    expect(activate).toHaveBeenCalledTimes(1);
    slider.focus();
    key(slider.element, 'keydown', 'ArrowRight');
    expect(change).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('does not activate if a pressed observer disables the registration synchronously', () => {
    const [disabled, setDisabled] = createState(false);
    const activate = vi.fn();
    let state!: FocusableState;
    setup((add) => {
      state = add({
        name: 'action',
        get disabled() {
          return disabled();
        },
        onActivate: activate,
      });
    });
    const stop = root((dispose) => {
      createEffect(() => {
        if (state.pressed()) setDisabled(true);
      });
      return dispose;
    });
    cleanups.push(stop);
    state.focus();
    key(state.element, 'keydown', 'Enter');
    key(state.element, 'keyup', 'Enter');
    expect(activate).not.toHaveBeenCalled();
  });
});

describe('roving focus', () => {
  it('uses one Tab stop and moves arrows/Home/End through available members with wrapping', () => {
    let one!: FocusableState;
    let two!: FocusableState;
    let disabled!: FocusableState;
    setup((add) => {
      const group = createRovingFocusGroup({
        role: 'toolbar',
        name: 'Actions',
      });
      one = add({ name: 'one', group });
      disabled = add({ name: 'disabled', disabled: true, group });
      two = add({ name: 'two', group });
    });
    expect([one, disabled, two].map((state) => state.element.tabIndex)).toEqual(
      [0, -1, -1],
    );
    one.focus();
    expect(key(one.element, 'keydown', 'ArrowRight').defaultPrevented).toBe(
      true,
    );
    expect(document.activeElement).toBe(two.element);
    expect([one, two].map((state) => state.element.tabIndex)).toEqual([-1, 0]);
    key(two.element, 'keydown', 'ArrowRight');
    expect(document.activeElement).toBe(one.element);
    key(one.element, 'keydown', 'End');
    expect(document.activeElement).toBe(two.element);
    key(two.element, 'keydown', 'Home');
    expect(document.activeElement).toBe(one.element);
    expect(key(one.element, 'keydown', 'ArrowDown').defaultPrevented).toBe(
      false,
    );
  });

  it('supports RTL/non-looping orientation, replacement on removal and group cleanup', () => {
    let one!: FocusableState;
    let two!: FocusableState;
    let dispose!: () => void;
    setup((add) => {
      const group = createRovingFocusGroup({ dir: 'rtl', loop: false });
      dispose = () => group.dispose();
      one = add({ name: 'one', group });
      two = add({ name: 'two', group });
    });
    one.focus();
    key(one.element, 'keydown', 'ArrowLeft');
    expect(document.activeElement).toBe(two.element);
    key(two.element, 'keydown', 'ArrowLeft');
    expect(document.activeElement).toBe(two.element);
    two.dispose();
    expect(document.activeElement).toBe(one.element);
    expect(one.element.tabIndex).toBe(0);
    dispose();
    expect(one.element.isConnected).toBe(false);
    one.dispose();
    dispose();
  });
});

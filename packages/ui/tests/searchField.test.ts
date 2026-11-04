import {
  createState,
  onError,
  type PInput,
  type PNode,
  PRoot,
  render,
  View,
} from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { UIProvider, type UIProviderProps } from '../dist/theme/UIProvider.js';

const cleanups: Array<() => void> = [];
const originalGetContext = Object.getOwnPropertyDescriptor(
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
          width: (text.length * size) / 2,
          actualBoundingBoxAscent: size * 0.75,
          actualBoundingBoxDescent: size * 0.25,
        };
      },
    }),
  });
});
afterAll(() => {
  if (originalGetContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext,
    );
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function fixture(create: () => unknown, options: UIProviderProps = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  const props = Object.create(options) as UIProviderProps;
  props.children = () =>
    View({
      style: { width: 400, alignItems: 'stretch' },
      children: create() as ReturnType<typeof View>,
    });
  const dispose = render(() => UIProvider(props), host);
  function syncDOM() {
    const visit = (node: PNode) => {
      for (const child of node._view.children) {
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
      }
      for (const child of node._children) visit(child);
    };
    visit(host);
    host.doLayout();
  }
  syncDOM();
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  return { host, dom, dispose, syncDOM };
}

import { NumberField } from '../dist/components/NumberField.js';
import { SearchField } from '../dist/components/SearchField.js';

function edit(node: PInput, value: string) {
  node.element.value = value;
  node.element.dispatchEvent(new InputEvent('input', { bubbles: true }));
}
function key(node: PInput, key: string) {
  node.element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
}
it('search submits, clears and retains its single input focus; IME never submits/clears', () => {
  let node!: PInput;
  const search = vi.fn();
  const changed = vi.fn();
  const cleared = vi.fn();
  const { dom } = fixture(() =>
    SearchField({
      'aria-label': 'Search',
      onSearch: search,
      onClear: cleared,
      onValueChange: changed,
      ref: (n) => {
        node = n;
      },
    }),
  );
  expect(node.element.type).toBe('text');
  expect(node.element.getAttribute('role')).toBe('searchbox');
  expect(node.element.getAttribute('enterkeyhint')).toBe('search');
  node.focus();
  edit(node, '图层');
  key(node, 'Enter');
  expect(search.mock.calls[0][0]).toBe('图层');
  node.element.dispatchEvent(new CompositionEvent('compositionstart'));
  key(node, 'Escape');
  key(node, 'Enter');
  expect(search).toHaveBeenCalledTimes(1);
  expect(cleared).not.toHaveBeenCalled();
  vi.useFakeTimers();
  node.element.dispatchEvent(new CompositionEvent('compositionend'));
  vi.advanceTimersByTime(1);
  for (const key of ['Escape', 'Enter'])
    node.element.dispatchEvent(
      new KeyboardEvent('keyup', { key, bubbles: true }),
    );
  key(node, 'Escape');
  expect(node.element.value).toBe('');
  expect(cleared).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(node.element);
  expect(dom.querySelectorAll('input')).toHaveLength(1);
});
it('search respects controlled rejection, callback updates and read-only/disabled state', () => {
  let node!: PInput;
  const [locked, setLocked] = createState(false);
  const changed = vi.fn();
  fixture(() =>
    SearchField({
      'aria-label': 'Search',
      value: 'kept',
      get readOnly() {
        return locked();
      },
      onValueChange: changed,
      ref: (n) => {
        node = n;
      },
    }),
  );
  key(node, 'Escape');
  expect(changed).toHaveBeenCalledWith('', expect.any(Event));
  expect(node.element.value).toBe('kept');
  setLocked(true);
  key(node, 'Escape');
  expect(changed).toHaveBeenCalledTimes(1);
});
it('number preserves temporary strings, rejects invalid commits, supports empty and finite range steps', () => {
  let node!: PInput;
  const change = vi.fn();
  fixture(() =>
    NumberField({
      'aria-label': 'Amount',
      defaultValue: 0.2,
      min: 0,
      max: 1,
      step: 0.1,
      onValueChange: change,
      ref: (n) => {
        node = n;
      },
    }),
  );
  edit(node, '-');
  expect(node.element.value).toBe('-');
  expect(change).not.toHaveBeenCalled();
  key(node, 'Enter');
  expect(node.element.value).toBe('0.2');
  edit(node, '.');
  key(node, 'Enter');
  expect(node.element.value).toBe('0.2');
  key(node, 'ArrowUp');
  expect(node.element.value).toBe('0.3');
  expect(change).toHaveBeenLastCalledWith(0.3);
  edit(node, '99');
  key(node, 'Enter');
  expect(node.element.value).toBe('1');
  key(node, 'ArrowUp');
  expect(node.element.value).toBe('1');
  edit(node, '');
  key(node, 'Enter');
  expect(change).toHaveBeenLastCalledWith(null);
  for (const value of ['Infinity', 'NaN', '0x10', '1e']) {
    edit(node, value);
    key(node, 'Enter');
    expect(node.element.value).toBe('');
  }
  edit(node, '0.75');
  node.element.dispatchEvent(new FocusEvent('blur'));
  expect(change).toHaveBeenLastCalledWith(0.75);
});
it('number controlled caller owns final value without resetting edits; external updates synchronize', () => {
  let node!: PInput;
  const [value, setValue] = createState<number | null>(2);
  const change = vi.fn();
  fixture(() =>
    NumberField({
      'aria-label': 'Amount',
      get value() {
        return value();
      },
      onValueChange: change,
      ref: (n) => {
        node = n;
      },
    }),
  );
  edit(node, '2.');
  expect(node.element.value).toBe('2.');
  key(node, 'ArrowUp');
  expect(change).toHaveBeenLastCalledWith(3);
  expect(node.element.value).toBe('2');
  setValue(4);
  expect(node.element.value).toBe('4');
  edit(node, '5');
  key(node, 'Escape');
  expect(node.element.value).toBe('4');
});
it.each([SearchField, NumberField])(
  'input extension tears down native listeners and styles on owner disposal',
  (component) => {
    let node!: PInput;
    const change = vi.fn();
    const scene = fixture(() =>
      component({
        'aria-label': 'Control',
        onValueChange: change,
        ref: (n) => {
          node = n;
        },
      }),
    );
    scene.dispose();
    edit(node, '9');
    key(node, 'Enter');
    expect(change).not.toHaveBeenCalled();
    expect(scene.dom.querySelectorAll('input,style')).toHaveLength(0);
  },
);

it('number ignores IME commit keys and disables stepping while read-only, with live semantic ranges', () => {
  let node!: PInput;
  const [locked, setLocked] = createState(false);
  const [min, setMin] = createState(-1);
  const change = vi.fn();
  fixture(() =>
    NumberField({
      'aria-label': 'Amount',
      defaultValue: 0,
      get readOnly() {
        return locked();
      },
      get min() {
        return min();
      },
      max: 3,
      onValueChange: change,
      ref: (n) => {
        node = n;
      },
    }),
  );
  expect(node.element.getAttribute('role')).toBe('spinbutton');
  expect(node.element.getAttribute('aria-valuemin')).toBe('-1');
  node.element.dispatchEvent(new CompositionEvent('compositionstart'));
  edit(node, '2');
  key(node, 'Enter');
  key(node, 'ArrowUp');
  expect(change).not.toHaveBeenCalled();
  vi.useFakeTimers();
  node.element.dispatchEvent(new CompositionEvent('compositionend'));
  vi.advanceTimersByTime(1);
  for (const key of ['Enter', 'ArrowUp'])
    node.element.dispatchEvent(
      new KeyboardEvent('keyup', { key, bubbles: true }),
    );
  key(node, 'Enter');
  expect(change).toHaveBeenLastCalledWith(2);
  setLocked(true);
  key(node, 'ArrowDown');
  expect(change).toHaveBeenCalledTimes(1);
  setMin(1);
  expect(node.element.getAttribute('aria-valuemin')).toBe('1');
});

it('two numbers isolate edits and keep updated callbacks after one component node is destroyed', () => {
  let first!: PInput;
  let second!: PInput;
  const initial = vi.fn();
  const updated = vi.fn();
  const [next, setNext] = createState(false);
  const scene = fixture(() =>
    View({
      children: [
        NumberField({
          'aria-label': 'First',
          defaultValue: 1,
          get onValueChange() {
            return next() ? updated : initial;
          },
          ref: (n) => {
            first = n;
          },
        }),
        NumberField({
          'aria-label': 'Second',
          defaultValue: 5,
          ref: (n) => {
            second = n;
          },
        }),
      ],
    }),
  );
  edit(first, '7');
  expect(second.element.value).toBe('5');
  setNext(true);
  key(first, 'Enter');
  expect(updated).toHaveBeenLastCalledWith(7);
  expect(initial).not.toHaveBeenCalled();
  first.destroyRecursive();
  setNext(false);
  key(first, 'ArrowUp');
  expect(initial).not.toHaveBeenCalled();
  key(second, 'ArrowUp');
  expect(second.element.value).toBe('6');
  scene.host.doLayout();
});

it.each([
  { min: 2, max: 1 },
  { min: NaN },
  { step: 0 },
  { step: Infinity },
  { defaultValue: Infinity },
  { value: NaN },
])('rejects invalid NumberField configuration %j', (options) => {
  const errors = vi.fn();
  fixture(() => {
    onError(errors);
    return NumberField({ 'aria-label': 'Invalid', ...options });
  });
  expect(errors).toHaveBeenCalled();
});
it('does not commit a number from a blur during IME composition', () => {
  let node!: PInput;
  const changed = vi.fn();
  fixture(() =>
    NumberField({
      'aria-label': 'Amount',
      defaultValue: 1,
      onValueChange: changed,
      ref: (n) => {
        node = n;
      },
    }),
  );
  node.element.dispatchEvent(new CompositionEvent('compositionstart'));
  edit(node, '2');
  node.element.dispatchEvent(new FocusEvent('blur'));
  expect(changed).not.toHaveBeenCalled();
});

it.each(
  (['input', 'owner'] as const).flatMap((disposal) =>
    (['button', 'Escape'] as const).flatMap((activation) =>
      (['onValueChange', 'onClear'] as const).map((hook) => ({
        disposal,
        activation,
        hook,
      })),
    ),
  ),
)(
  'search $activation stops clear callbacks/focus when $hook synchronously disposes its $disposal',
  ({ disposal, activation, hook }) => {
    let first!: PInput;
    let second!: PInput;
    let teardown = () => {};
    const siblingSearch = vi.fn();
    fixture(() =>
      SearchField({
        'aria-label': 'Surviving search',
        defaultValue: 'second',
        clearLabel: 'Clear surviving search',
        onSearch: siblingSearch,
        ref: (node) => {
          second = node;
        },
      }),
    );
    const disposeFromCallback = () => {
      if (disposal === 'input') first.destroyRecursive();
      else teardown();
      second.focus();
    };
    const change = vi.fn(() => {
      if (hook === 'onValueChange') disposeFromCallback();
    });
    const clear = vi.fn(() => {
      if (hook === 'onClear') disposeFromCallback();
    });
    const scene = fixture(() =>
      SearchField({
        'aria-label': 'Removed search',
        defaultValue: 'needle',
        clearLabel: 'Clear removed search',
        onValueChange: change,
        onClear: clear,
        ref: (node) => {
          first = node;
        },
      }),
    );
    teardown = scene.dispose;
    first.focus();
    const focus = vi.spyOn(first, 'focus');
    if (activation === 'button')
      scene.dom
        .querySelector<HTMLButtonElement>('[aria-label="Clear removed search"]')!
        .click();
    else key(first, 'Escape');
    if (disposal === 'input') expect(first.isDestroyed).toBe(true);
    else expect(first.element.isConnected).toBe(false);
    expect({
      changes: change.mock.calls.length,
      clears: clear.mock.calls.length,
      focusAttempts: focus.mock.calls.length,
    }).toEqual({
      changes: 1,
      clears: hook === 'onClear' ? 1 : 0,
      focusAttempts: 0,
    });
    expect(document.activeElement).toBe(second.element);
    // Detached native listeners must not run the same callbacks again.
    key(first, 'Escape');
    expect(change).toHaveBeenCalledTimes(1);
    key(second, 'Enter');
    expect(siblingSearch).toHaveBeenCalledWith('second', expect.any(KeyboardEvent));
    scene.host.doLayout();
  },
);

it.each(
  (['input', 'owner'] as const).flatMap((disposal) =>
    (['Enter', 'Escape'] as const).map((activation) => ({
      disposal,
      activation,
    })),
  ),
)(
  'search $activation skips built-in actions when onKeyDown synchronously disposes its $disposal',
  ({ disposal, activation }) => {
    let first!: PInput;
    let second!: PInput;
    let teardown = () => {};
    const siblingSearch = vi.fn();
    fixture(() =>
      SearchField({
        'aria-label': 'Surviving keyboard search',
        defaultValue: 'second',
        onSearch: siblingSearch,
        ref: (node) => {
          second = node;
        },
      }),
    );
    const search = vi.fn();
    const change = vi.fn();
    const clear = vi.fn();
    const keyDown = vi.fn(() => {
      if (disposal === 'input') first.destroyRecursive();
      else teardown();
      second.focus();
    });
    const scene = fixture(() =>
      SearchField({
        'aria-label': 'Removed keyboard search',
        defaultValue: 'needle',
        onKeyDown: keyDown,
        onSearch: search,
        onValueChange: change,
        onClear: clear,
        ref: (node) => {
          first = node;
        },
      }),
    );
    teardown = scene.dispose;
    first.focus();
    const focus = vi.spyOn(first, 'focus');
    key(first, activation);
    if (disposal === 'input') expect(first.isDestroyed).toBe(true);
    else expect(first.element.isConnected).toBe(false);
    expect({
      searches: search.mock.calls.length,
      changes: change.mock.calls.length,
      clears: clear.mock.calls.length,
      focusAttempts: focus.mock.calls.length,
    }).toEqual({ searches: 0, changes: 0, clears: 0, focusAttempts: 0 });
    expect(document.activeElement).toBe(second.element);
    key(first, activation);
    expect(keyDown).toHaveBeenCalledOnce();
    key(second, 'Enter');
    expect(siblingSearch).toHaveBeenCalledWith('second', expect.any(KeyboardEvent));
    scene.host.doLayout();
  },
);

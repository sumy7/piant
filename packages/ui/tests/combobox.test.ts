import './anchoredFixture';

import { createState, type PInput, type PNode } from '@piant/core';
import { Ticker } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from '../dist/index.js';
import { fixture, key, named, press, runtime, settle } from './anchoredFixture';

const options: readonly ComboboxOption[] = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two', disabled: true },
  { value: 'three', label: 'Three' },
];
function input(element: HTMLInputElement, value: string, isComposing = false) {
  element.value = value;
  element.dispatchEvent(
    new InputEvent('input', { bubbles: true, data: value, isComposing }),
  );
}

describe('editable Combobox', () => {
  it('separates input from value, skips disabled options and preserves the real input focus', async () => {
    const onValueChange = vi.fn();
    const onInputValueChange = vi.fn();
    fixture(() =>
      Combobox({ label: 'Preset', options, onValueChange, onInputValueChange }),
    );
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    input(element, 't');
    await settle();
    expect(element.getAttribute('role')).toBe('combobox');
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onInputValueChange).toHaveBeenLastCalledWith('t');
    expect(
      Array.from(document.querySelectorAll('[role=option]')).map(
        (row) => row.textContent,
      ),
    ).toEqual(['Two', 'Three']);
    key(element, 'ArrowDown');
    await settle();
    const active = document.getElementById(
      element.getAttribute('aria-activedescendant')!,
    );
    expect(active?.textContent).toBe('Three');
    key(element, 'Enter');
    await settle();
    expect(onValueChange).toHaveBeenLastCalledWith('three');
    expect(element.value).toBe('Three');
    expect(element.getAttribute('aria-expanded')).toBe('false');
    expect(element.hasAttribute('aria-activedescendant')).toBe(false);
    expect(document.activeElement).toBe(element);
  });

  it('keeps caret Home/End and text spaces native; Alt+Home/End navigate candidates', async () => {
    fixture(() => Combobox({ label: 'Preset', options }));
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    key(element, 'ArrowDown');
    await settle();
    expect(key(element, 'Home').defaultPrevented).toBe(false);
    expect(key(element, 'End').defaultPrevented).toBe(false);
    expect(key(element, ' ').defaultPrevented).toBe(false);
    expect(key(element, 'End', { altKey: true }).defaultPrevented).toBe(true);
    await settle();
    expect(
      document.getElementById(element.getAttribute('aria-activedescendant')!)
        ?.textContent,
    ).toBe('Three');
  });

  it('cancels uncommitted text on Escape but never clears or selects during IME', async () => {
    const onValueChange = vi.fn();
    fixture(() =>
      Combobox({
        label: 'Preset',
        options,
        defaultValue: 'one',
        onValueChange,
      }),
    );
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    input(element, 'draft');
    await settle();
    key(element, 'Escape');
    await settle();
    expect(element.value).toBe('One');
    expect(onValueChange).not.toHaveBeenCalled();
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    input(element, '中', true);
    await settle();
    key(element, 'Enter', { isComposing: true });
    key(element, 'Escape', { isComposing: true });
    await settle();
    expect(element.value).toBe('中');
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(onValueChange).not.toHaveBeenCalled();
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
  });

  it('updates candidates, drops removed or disabled highlights, and shows empty results without changing value', async () => {
    const [items, setItems] = createState(options);
    const onValueChange = vi.fn();
    fixture(() =>
      Combobox({
        label: 'Preset',
        get options() {
          return items();
        },
        onValueChange,
      }),
    );
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    key(element, 'ArrowDown');
    await settle();
    expect(element.hasAttribute('aria-activedescendant')).toBe(true);
    setItems([{ value: 'one', label: 'Renamed', disabled: true }]);
    await settle();
    expect(element.hasAttribute('aria-activedescendant')).toBe(false);
    key(element, 'Enter');
    expect(onValueChange).not.toHaveBeenCalled();
    input(element, 'missing');
    await settle();
    expect(document.querySelectorAll('[role=option]')).toHaveLength(0);
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(element.hasAttribute('aria-activedescendant')).toBe(false);
    setItems([]);
    await settle();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('treats controlled value/input/open as caller authority and reads current callbacks', async () => {
    const [value, setValue] = createState<string | null>(null);
    const [text, setText] = createState('');
    const [open, setOpen] = createState(false);
    const requests = vi.fn();
    fixture(() =>
      Combobox({
        label: 'Preset',
        options,
        get value() {
          return value();
        },
        get inputValue() {
          return text();
        },
        get open() {
          return open();
        },
        onValueChange: requests,
      }),
    );
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    key(element, 'ArrowDown');
    await settle();
    expect(document.querySelector('[role=listbox]')).toBeNull();
    setOpen(true);
    setText('th');
    await settle();
    key(element, 'ArrowDown');
    key(element, 'Enter');
    await settle();
    expect(requests).toHaveBeenLastCalledWith('three');
    expect(element.value).toBe('th');
    expect(element.getAttribute('aria-expanded')).toBe('true');
    setValue('three');
    expect(element.value).toBe('th');
    setText('Three');
    setOpen(false);
    await settle();
    expect(element.value).toBe('Three');
    expect(document.querySelector('[role=listbox]')).toBeNull();
  });

  it('clears value and input, retains focus, and respects disabled/readOnly getters', async () => {
    const [readOnly, setReadOnly] = createState(false);
    const changes = vi.fn();
    fixture(() =>
      Combobox({
        label: 'Preset',
        options,
        defaultValue: 'one',
        get readOnly() {
          return readOnly();
        },
        onValueChange: changes,
      }),
    );
    const element = named('Preset') as HTMLInputElement;
    element.focus();
    setReadOnly(true);
    press('Clear Preset');
    key(element, 'ArrowDown');
    await settle();
    expect(element.value).toBe('One');
    expect(changes).not.toHaveBeenCalled();
    setReadOnly(false);
    press('Clear Preset');
    await settle();
    expect(element.value).toBe('');
    expect(changes).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(element);
  });

  it('releases pending/open overlays on node destroy and isolates two instances', async () => {
    let first!: PNode;
    let firstInput!: PInput;
    const [text, setText] = createState('');
    fixture(() => [
      Combobox({
        label: 'First',
        options,
        get inputValue() {
          return text();
        },
        inputRef: (node) => {
          firstInput = node;
        },
        ref: (node) => {
          first = node;
        },
      }),
      Combobox({ label: 'Second', options }),
    ]);
    firstInput.focus();
    runtime.pending = true;
    key(firstInput.element, 'ArrowDown');
    first.destroyRecursive();
    setText('after destroy');
    runtime.pending = false;
    for (const finish of runtime.finish.splice(0)) finish();
    await settle();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    const second = named('Second');
    second.focus();
    key(second, 'ArrowDown');
    await settle();
    expect(document.querySelectorAll('[role=listbox]')).toHaveLength(1);
    expect(second.getAttribute('aria-expanded')).toBe('true');
    expect(firstInput.element.isConnected).toBe(false);
  });
  it('opens a default-open popup after the DOM bridge is attached', async () => {
    const ticks = vi.spyOn(Ticker.prototype, 'add');
    fixture(() => Combobox({ label: 'Preset', options, defaultOpen: true }));
    for (const [callback, context] of [...ticks.mock.calls])
      callback.call(context, Ticker.shared);
    await settle();
    expect(named('Preset').getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('[role=listbox]')).toHaveLength(1);
  });

  it('retains combobox semantics across theme/layout/focus registration refreshes', async () => {
    const [dark, setDark] = createState(false);
    fixture(() => Combobox({ label: 'Preset', options }), dark);
    const element = named('Preset');
    element.focus();
    key(element, 'ArrowDown');
    await settle();
    setDark(true);
    element.blur();
    element.focus();
    await settle();
    expect(element.getAttribute('role')).toBe('combobox');
    expect(element.getAttribute('aria-expanded')).toBe('true');
    expect(element.getAttribute('aria-haspopup')).toBe('listbox');
    expect(
      document
        .getElementById(element.getAttribute('aria-controls')!)
        ?.getAttribute('role'),
    ).toBe('listbox');
  });

  it.each(['input', 'select', 'clear'] as const)(
    'stops downstream callbacks after %s synchronously destroys the component',
    async (action) => {
      let node!: PNode;
      let armed = false;
      const opens = vi.fn();
      const cleared = vi.fn();
      fixture(() =>
        Combobox({
          label: 'Preset',
          options,
          defaultValue: action === 'clear' ? 'one' : null,
          ref: (current) => {
            node = current;
          },
          onInputValueChange() {
            if (armed && action !== 'clear') node.destroyRecursive();
          },
          onValueChange() {
            if (armed && action === 'clear') node.destroyRecursive();
          },
          onOpenChange: opens,
          onClear: cleared,
        }),
      );
      const element = named('Preset') as HTMLInputElement;
      element.focus();
      if (action === 'select') {
        key(element, 'ArrowDown');
        await settle();
        opens.mockClear();
      }
      armed = true;
      if (action === 'input') input(element, 'o');
      else if (action === 'select') key(element, 'Enter');
      else press('Clear Preset');
      await settle();
      expect(node.isDestroyed).toBe(true);
      expect(element.isConnected).toBe(false);
      expect(document.querySelector('[data-piant-overlay]')).toBeNull();
      expect(opens).not.toHaveBeenCalled();
      expect(cleared).not.toHaveBeenCalled();
    },
  );
});

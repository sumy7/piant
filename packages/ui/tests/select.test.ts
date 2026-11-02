import './anchoredFixture';

import { createState, type PNode, Show } from '@piant/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  type SelectOption,
  type SelectProps,
  SelectTrigger,
} from '../dist/index.js';
import {
  fixture,
  key,
  named,
  outside,
  pixiPointer,
  press,
  runtime,
  settle,
} from './anchoredFixture';

const options: readonly SelectOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta', disabled: true },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie' },
];
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
function select(props: Partial<Omit<SelectProps, 'label' | 'children'>> = {}) {
  return Select({
    label: 'Choice',
    get options() {
      return props.options ?? options;
    },
    get value() {
      return props.value;
    },
    defaultValue: props.defaultValue,
    onValueChange: props.onValueChange,
    get open() {
      return props.open;
    },
    defaultOpen: props.defaultOpen,
    onOpenChange: props.onOpenChange,
    get disabled() {
      return props.disabled;
    },
    placeholder: props.placeholder ?? 'Choose one',
    children: () => [SelectTrigger({}), SelectContent({})],
  });
}
function combo() {
  return document.querySelector<HTMLElement>('[role=combobox]')!;
}
function list() {
  return document.querySelector<HTMLElement>('[role=listbox]')!;
}
function active() {
  return document.getElementById(
    combo().getAttribute('aria-activedescendant') ?? '',
  );
}
function rows() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role=option]'));
}

describe('Select', () => {
  it('keeps DOM focus on a named select-only combobox and highlights the committed value without changing it', async () => {
    const changes = vi.fn();
    fixture(() => select({ defaultValue: 'bravo', onValueChange: changes }));
    expect(combo().textContent).toBe('Bravo');
    expect(combo().getAttribute('aria-haspopup')).toBe('listbox');
    press('Choice');
    await settle();
    expect(document.activeElement).toBe(combo());
    expect(list().getAttribute('aria-label')).toBe('Choice');
    expect(active()?.textContent).toBe('Bravo');
    expect(active()?.getAttribute('aria-selected')).toBe('true');
    expect(active()?.parentElement).toBe(list());
    expect(combo().getAttribute('aria-controls')).toBe(list().id);
    key(combo(), 'ArrowDown');
    expect(active()?.textContent).toBe('Charlie');
    expect(combo().textContent).toBe('Bravo');
    expect(changes).not.toHaveBeenCalled();
    key(combo(), 'Escape');
    expect(list()).toBeNull();
    expect(combo().textContent).toBe('Bravo');
  });

  it('clamps arrow navigation, includes disabled rows and commits only on explicit Enter or Space', async () => {
    const changes = vi.fn();
    fixture(() => select({ onValueChange: changes }));
    combo().focus();
    key(combo(), 'ArrowDown');
    await settle();
    key(combo(), 'ArrowUp');
    expect(active()?.textContent).toBe('Alpha');
    key(combo(), 'ArrowDown');
    expect(active()?.textContent).toBe('Beta');
    key(combo(), 'Enter');
    expect(changes).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    key(combo(), 'End');
    key(combo(), 'ArrowDown');
    expect(active()?.textContent).toBe('Charlie');
    key(combo(), ' ');
    expect(changes).toHaveBeenCalledExactlyOnceWith('charlie');
    expect(list()).toBeNull();
    expect(combo().textContent).toBe('Charlie');
    expect(document.activeElement).toBe(combo());
  });

  it('starts selected search from typed prefixes and cycles repeated characters after a 700ms timeout', async () => {
    const changes = vi.fn();
    fixture(() => select({ onValueChange: changes }));
    combo().focus();
    key(combo(), 'b');
    await settle();
    expect(active()?.textContent).toBe('Beta');
    key(combo(), 'b');
    expect(active()?.textContent).toBe('Bravo');
    vi.advanceTimersByTime(700);
    key(combo(), 'b');
    expect(active()?.textContent).toBe('Beta');
    key(combo(), 'r');
    expect(active()?.textContent).toBe('Bravo');
    expect(changes).not.toHaveBeenCalled();
    expect(combo().textContent).toBe('Choose one');
    key(combo(), ' ');
    expect(changes).toHaveBeenCalledExactlyOnceWith('bravo');
  });

  it('treats IME Enter/Escape and repeated Enter as editing boundaries rather than commit or close', async () => {
    const changes = vi.fn();
    fixture(() => select({ onValueChange: changes }));
    press('Choice');
    await settle();
    key(combo(), 'Enter', { isComposing: true });
    key(combo(), 'Enter', { keyCode: 229 });
    key(combo(), 'Escape', { isComposing: true });
    key(combo(), 'Enter', { repeat: true });
    expect(changes).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    key(combo(), 'Escape');
    expect(list()).toBeNull();
    expect(combo().textContent).toBe('Choose one');
  });

  it('cancels on Tab without committing and advances to the next registered control', async () => {
    const changes = vi.fn();
    fixture(() => [
      select({ defaultValue: 'alpha', onValueChange: changes }),
      Button({ children: 'After select' }),
    ]);
    press('Choice');
    await settle();
    key(combo(), 'End');
    const event = key(combo(), 'Tab');
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(named('After select'));
    expect(list()).toBeNull();
    expect(changes).not.toHaveBeenCalled();
    expect(combo().textContent).toBe('Alpha');
  });

  it('keeps controlled value and open state independent when either request is rejected', async () => {
    const [value, setValue] = createState<string | null>('alpha');
    const [open, setOpen] = createState(false);
    const values = vi.fn();
    const opens = vi.fn();
    fixture(() =>
      select({
        get value() {
          return value();
        },
        get open() {
          return open();
        },
        onValueChange: values,
        onOpenChange: opens,
      }),
    );
    press('Choice');
    await settle();
    expect(list()).toBeNull();
    expect(opens).toHaveBeenCalledWith(true);
    setOpen(true);
    await settle();
    const container = list();
    key(combo(), 'End');
    key(combo(), 'Enter');
    expect(values).toHaveBeenCalledExactlyOnceWith('charlie');
    expect(opens).toHaveBeenLastCalledWith(false);
    expect(combo().textContent).toBe('Alpha');
    expect(list()).toBe(container);
    setValue('charlie');
    expect(combo().textContent).toBe('Charlie');
    setOpen(false);
    expect(list()).toBeNull();
    setValue(null);
    expect(combo().textContent).toBe('Choose one');
  });

  it('preserves selected keys and semantic row identity through relabel/reorder, missing selection and readdition', async () => {
    const [data, setData] = createState(options);
    const values = vi.fn();
    fixture(() =>
      select({
        get options() {
          return data();
        },
        defaultValue: 'bravo',
        onValueChange: values,
      }),
    );
    press('Choice');
    await settle();
    const selected = active()!;
    setData([
      { value: 'bravo', label: 'Renamed Bravo' },
      options[3],
      options[0],
      options[1],
    ]);
    await settle();
    expect(active()).toBe(selected);
    expect(combo().textContent).toBe('Renamed Bravo');
    expect(rows()[0]).toBe(selected);
    expect(rows().map((row) => row.getAttribute('aria-posinset'))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    setData([options[3], options[0]]);
    await settle();
    expect(combo().textContent).toBe('Choose one');
    expect(values).not.toHaveBeenCalled();
    expect(active()?.textContent).toBe('Charlie');
    setData([
      options[3],
      options[0],
      { value: 'bravo', label: 'Returned Bravo' },
    ]);
    await settle();
    expect(combo().textContent).toBe('Returned Bravo');
    expect(values).not.toHaveBeenCalled();
    expect(
      rows()
        .find((row) => row.textContent === 'Returned Bravo')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('reveals a far selected option before publishing activeDescendant while retaining all semantic rows', async () => {
    const long = Array.from({ length: 40 }, (_, index) => ({
      value: String(index),
      label: `Option ${index}`,
    }));
    fixture(() => select({ options: long, defaultValue: '39' }));
    press('Choice');
    await settle();
    expect(rows()).toHaveLength(40);
    expect(active()?.textContent).toBe('Option 39');
    expect(active()?.isConnected).toBe(true);
    expect(active()?.hidden).toBe(false);
    expect(active()?.parentElement).toBe(list());
    expect(Number.parseFloat(active()!.style.top)).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(rows()[0].style.top)).toBeLessThan(0);
    key(combo(), 'Home');
    expect(active()?.textContent).toBe('Option 0');
    expect(Number.parseFloat(active()!.style.top)).toBeGreaterThanOrEqual(0);
  });

  it('keeps all-disabled options discoverable but disables and closes empty data', async () => {
    const [data, setData] = createState<readonly SelectOption[]>(
      options.map((option) => ({ ...option, disabled: true })),
    );
    const values = vi.fn();
    fixture(() =>
      select({
        get options() {
          return data();
        },
        onValueChange: values,
      }),
    );
    expect((combo() as HTMLButtonElement).disabled).toBe(false);
    press('Choice');
    await settle();
    key(combo(), 'End');
    key(combo(), 'Enter');
    expect(active()?.textContent).toBe('Charlie');
    expect(values).not.toHaveBeenCalled();
    setData([]);
    await settle();
    expect(list()).toBeNull();
    expect((combo() as HTMLButtonElement).disabled).toBe(true);
  });

  it('blocks a dismissing outside gesture and toggles its own trigger exactly once', async () => {
    const opens = vi.fn();
    const state = fixture(() => select({ onOpenChange: opens }));
    press('Choice');
    await settle();
    press('Choice');
    await settle();
    expect(list()).toBeNull();
    expect(opens.mock.calls).toEqual([[true], [false]]);
    press('Choice');
    await settle();
    expect(outside(state.target).defaultPrevented).toBe(true);
    expect(list()).toBeNull();
  });

  it('supports custom item veto and drops stale commits when selection removes the root', async () => {
    const [visible, setVisible] = createState(true);
    const values = vi.fn();
    const opens = vi.fn();
    let veto = true;
    let selections = 0;
    const state = fixture(() =>
      Show({
        get when() {
          return visible();
        },
        children: (_visible) =>
          Select({
            label: 'Custom choice',
            options,
            defaultOpen: true,
            onValueChange: values,
            onOpenChange: opens,
            children: () => [
              SelectTrigger({}),
              SelectContent({
                children: () => [
                  SelectItem({
                    value: 'alpha',
                    onSelect: (event) => {
                      selections++;
                      if (veto) event.preventDefault();
                      else setVisible(false);
                    },
                  }),
                ],
              }),
            ],
          }),
      }),
    );
    await settle();
    combo().focus();
    key(combo(), 'Enter');
    expect(selections).toBe(1);
    expect(values).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    rows()[0].click();
    expect(values).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    expect(selections).toBe(2);
    veto = false;
    rows()[0].click();
    state.sync();
    await settle();
    expect(values).not.toHaveBeenCalled();
    expect(opens).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
  });

  it('keeps a nested Select inside its modal and closes only the list on first Escape', async () => {
    fixture(() =>
      Dialog({
        children: () => [
          DialogTrigger({ children: 'Open select modal' }),
          DialogContent({ name: 'Select modal', children: () => select() }),
        ],
      }),
    );
    press('Open select modal');
    await settle();
    press('Choice');
    await settle();
    expect(document.activeElement).toBe(combo());
    key(combo(), 'Escape');
    expect(list()).toBeNull();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(document.activeElement).toBe(combo());
    key(combo(), 'Escape');
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('cancels pending openings and releases state after owner destruction', async () => {
    runtime.pending = true;
    const [open, setOpen] = createState(false);
    const state = fixture(() =>
      select({
        get open() {
          return open();
        },
      }),
    );
    setOpen(true);
    setOpen(false);
    setOpen(true);
    expect(runtime.finish).toHaveLength(2);
    state.dispose();
    for (const finish of runtime.finish.splice(0)) finish();
    await settle();
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed).toHaveLength(0);
  });
  it('keeps the committed value, active option and trigger focus stable across a theme change', async () => {
    const [dark, setDark] = createState(false);
    fixture(() => select({ defaultValue: 'bravo' }), dark);
    press('Choice');
    await settle();
    key(combo(), 'End');
    const trigger = combo();
    const container = list();
    const row = active();
    setDark(true);
    await settle();
    expect(combo()).toBe(trigger);
    expect(list()).toBe(container);
    expect(active()).toBe(row);
    expect(combo().textContent).toBe('Bravo');
    expect(document.activeElement).toBe(trigger);
  });

  it('releases an open owner and ignores detached option and trigger events after disposal', async () => {
    const values = vi.fn();
    const opens = vi.fn();
    const state = fixture(() =>
      select({ onValueChange: values, onOpenChange: opens }),
    );
    press('Choice');
    await settle();
    key(combo(), 'b');
    const trigger = combo();
    const staleOption = active()!;
    state.dispose();
    expect(opens.mock.calls).toEqual([[true]]);
    await settle();
    staleOption.click();
    key(trigger, 'Enter');
    vi.advanceTimersByTime(1000);
    expect(values).not.toHaveBeenCalled();
    expect(opens.mock.calls).toEqual([[true]]);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    fixture(() => select());
    press('Choice');
    await settle();
    expect(active()?.textContent).toBe('Alpha');
  });
  it('preserves combobox focus and keyboard navigation after a Canvas press with rejected close', async () => {
    let bravo!: PNode;
    const values = vi.fn();
    const opens = vi.fn();
    fixture(() =>
      Select({
        label: 'Held choice',
        options,
        open: true,
        defaultValue: 'alpha',
        onValueChange: values,
        onOpenChange: opens,
        children: () => [
          SelectTrigger({}),
          SelectContent({
            children: () => [
              SelectItem({ value: 'alpha' }),
              SelectItem({
                value: 'bravo',
                ref: (node) => {
                  bravo = node;
                },
              }),
              SelectItem({ value: 'charlie' }),
            ],
          }),
        ],
      }),
    );
    await settle();
    const trigger = combo();
    const container = list();
    document.body.tabIndex = -1;
    document.body.focus();
    pixiPointer(bravo, 'pointerenter');
    const down = pixiPointer(bravo, 'pointerdown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(trigger);
    pixiPointer(bravo, 'pointerup');
    expect(values).toHaveBeenCalledExactlyOnceWith('bravo');
    expect(opens).toHaveBeenCalledExactlyOnceWith(false);
    expect(list()).toBe(container);
    expect(combo().textContent).toBe('Bravo');
    expect(document.activeElement).toBe(trigger);
    key(trigger, 'ArrowDown');
    expect(active()?.textContent).toBe('Charlie');
  });
  it('requests one rejected close per independent Tab or Shift+Tab and preserves value while advancing focus', async () => {
    const opens = vi.fn();
    const values = vi.fn();
    fixture(() => [
      Button({ children: 'Before held select' }),
      select({
        open: true,
        defaultValue: 'alpha',
        onOpenChange: opens,
        onValueChange: values,
      }),
      Button({ children: 'After held select' }),
    ]);
    await settle();
    const container = list();
    for (const [index, shiftKey] of [false, true, false].entries()) {
      combo().focus();
      const before = opens.mock.calls.length;
      const target = named(
        shiftKey ? 'Before held select' : 'After held select',
      );
      const event = key(combo(), 'Tab', { shiftKey });
      // Model the browser default only when the manager leaves native Tab alone.
      if (!event.defaultPrevented) target.focus();
      expect(opens.mock.calls.slice(before)).toEqual([[false]]);
      expect(opens).toHaveBeenCalledTimes(index + 1);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(target);
      expect(list()).toBe(container);
      expect(combo().textContent).toBe('Alpha');
      expect(values).not.toHaveBeenCalled();
    }
  });

  it.each([false, true])(
    'lets a terminal trigger use native Tab once when Shift=%s and controlled close is rejected',
    async (shiftKey) => {
      const opens = vi.fn();
      const values = vi.fn();
      const external = document.createElement('button');
      external.textContent = 'External native target';
      if (shiftKey) document.body.append(external);
      fixture(() =>
        select({
          open: true,
          defaultValue: 'alpha',
          onOpenChange: opens,
          onValueChange: values,
        }),
      );
      if (!shiftKey) document.body.append(external);
      await settle();
      const container = list();
      combo().focus();
      const event = key(combo(), 'Tab', { shiftKey });
      expect(event.defaultPrevented).toBe(false);
      expect(opens.mock.calls).toEqual([[false]]);
      // Happy DOM does not perform native Tab traversal; simulate its destination.
      external.focus();
      expect(document.activeElement).toBe(external);
      expect(opens.mock.calls).toEqual([[false]]);
      expect(list()).toBe(container);
      expect(combo().textContent).toBe('Alpha');
      expect(values).not.toHaveBeenCalled();
    },
  );
  it.each(
    [false, true].flatMap((acceptClose) => [
      { acceptClose, shiftKey: false },
      { acceptClose, shiftKey: true },
    ]),
  )(
    'keeps singleton Dialog+Select Tab inside the modal (accepted=$acceptClose, Shift=$shiftKey)',
    async ({ acceptClose, shiftKey }) => {
      const [open, setOpen] = createState(true);
      const values = vi.fn();
      const opens = vi.fn((next: boolean) => {
        if (acceptClose) setOpen(next);
      });
      fixture(() =>
        Dialog({
          defaultOpen: true,
          children: () =>
            DialogContent({
              name: 'Singleton select modal',
              children: () =>
                select({
                  get open() {
                    return open();
                  },
                  defaultValue: 'alpha',
                  onOpenChange: opens,
                  onValueChange: values,
                }),
            }),
        }),
      );
      await settle();
      combo().focus();
      key(combo(), 'End');
      expect(active()?.textContent).toBe('Charlie');
      const event = key(combo(), 'Tab', { shiftKey });
      expect(event.defaultPrevented).toBe(true);
      expect(opens.mock.calls).toEqual([[false]]);
      expect(values).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(combo());
      expect(combo().textContent).toBe('Alpha');
      expect(
        document.querySelector(
          '[role=dialog][aria-label="Singleton select modal"]',
        ),
      ).not.toBeNull();
      if (acceptClose) expect(list()).toBeNull();
      else expect(list()).not.toBeNull();
    },
  );
  it.each(
    [false, true].flatMap((acceptClose) => [
      { acceptClose, shiftKey: false },
      { acceptClose, shiftKey: true },
    ]),
  )(
    'wraps a terminal Select to its Dialog sibling with one close request (accepted=$acceptClose, Shift=$shiftKey)',
    async ({ acceptClose, shiftKey }) => {
      const [open, setOpen] = createState(true);
      const values = vi.fn();
      const opens = vi.fn((next: boolean) => {
        if (acceptClose) setOpen(next);
      });
      const createSelect = () =>
        select({
          get open() {
            return open();
          },
          defaultValue: 'alpha',
          onOpenChange: opens,
          onValueChange: values,
        });
      fixture(() =>
        Dialog({
          defaultOpen: true,
          children: () =>
            DialogContent({
              name: 'Sibling select modal',
              children: () =>
                shiftKey
                  ? [createSelect(), Button({ children: 'Modal sibling' })]
                  : [Button({ children: 'Modal sibling' }), createSelect()],
            }),
        }),
      );
      await settle();
      combo().focus();
      key(combo(), 'End');
      expect(active()?.textContent).toBe('Charlie');
      const event = key(combo(), 'Tab', { shiftKey });
      expect(event.defaultPrevented).toBe(true);
      expect(opens.mock.calls).toEqual([[false]]);
      expect(values).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(named('Modal sibling'));
      expect(combo().textContent).toBe('Alpha');
      expect(
        document.querySelector(
          '[role=dialog][aria-label="Sibling select modal"]',
        ),
      ).not.toBeNull();
      if (acceptClose) expect(list()).toBeNull();
      else expect(list()).not.toBeNull();
    },
  );
});

import './anchoredFixture';

import { createState, type PNode, Show } from '@piant/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuItem,
  type MenuOption,
  type MenuProps,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
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

const items: readonly MenuOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta', disabled: true },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie' },
];
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
function menu(options: Partial<Omit<MenuProps, 'children' | 'label'>> = {}) {
  return Menu({
    label: 'Actions',
    get items() {
      return options.items ?? items;
    },
    get open() {
      return options.open;
    },
    defaultOpen: options.defaultOpen,
    get disabled() {
      return options.disabled;
    },
    onOpenChange: options.onOpenChange,
    onAction: options.onAction,
    children: () => [
      MenuTrigger({ children: 'Open actions' }),
      MenuContent({}),
    ],
  });
}
function list() {
  return document.querySelector<HTMLElement>('[role=menu]')!;
}
function active() {
  return document.getElementById(
    list().getAttribute('aria-activedescendant') ?? '',
  );
}
function rows() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]'));
}

describe('Menu', () => {
  it('focuses one named menu container and discovers disabled rows with wrapping arrows and Home/End', async () => {
    fixture(() => menu());
    press('Open actions');
    await settle();
    const container = list();
    expect(container.getAttribute('aria-label')).toBe('Actions');
    expect(document.activeElement).toBe(container);
    expect(active()?.textContent).toBe('Alpha');
    expect(
      rows().every(
        (row) => row.parentElement === container && row.tabIndex === -1,
      ),
    ).toBe(true);
    key(container, 'ArrowDown');
    expect(active()?.textContent).toBe('Beta');
    expect(active()?.getAttribute('aria-disabled')).toBe('true');
    key(container, 'End');
    expect(active()?.textContent).toBe('Charlie');
    key(container, 'ArrowDown');
    expect(active()?.textContent).toBe('Alpha');
    key(container, 'ArrowUp');
    expect(active()?.textContent).toBe('Charlie');
    key(container, 'Home');
    expect(active()?.textContent).toBe('Alpha');
    expect(document.activeElement).toBe(container);
  });

  it('opens at the last item with ArrowUp and ignores disabled activation before explicit commit', async () => {
    const actions = vi.fn();
    const changes = vi.fn();
    fixture(() => menu({ onAction: actions, onOpenChange: changes }));
    named('Open actions').focus();
    key(named('Open actions'), 'ArrowUp');
    await settle();
    expect(active()?.textContent).toBe('Charlie');
    key(list(), 'Home');
    key(list(), 'ArrowDown');
    key(list(), 'Enter');
    expect(actions).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    key(list(), 'ArrowDown');
    key(list(), 'Enter');
    expect(actions).toHaveBeenCalledTimes(1);
    expect(actions.mock.calls[0][0]).toBe('bravo');
    expect(document.querySelector('[role=menu]')).toBeNull();
    expect(document.activeElement).toBe(named('Open actions'));
    expect(changes.mock.calls).toEqual([[true], [false]]);
  });

  it('supports prefix and repeated-character search with a 700ms reset', async () => {
    const actions = vi.fn();
    fixture(() => menu({ onAction: actions }));
    press('Open actions');
    await settle();
    key(list(), 'b');
    expect(active()?.textContent).toBe('Beta');
    key(list(), 'b');
    expect(active()?.textContent).toBe('Bravo');
    vi.advanceTimersByTime(700);
    key(list(), 'b');
    expect(active()?.textContent).toBe('Beta');
    key(list(), 'r');
    expect(active()?.textContent).toBe('Bravo');
    vi.advanceTimersByTime(700);
    key(list(), 'c');
    expect(active()?.textContent).toBe('Charlie');
    key(list(), ' ');
    expect(actions.mock.calls[0][0]).toBe('charlie');
  });

  it('does not activate or dismiss for IME Enter/Escape or repeated Enter', async () => {
    const actions = vi.fn();
    fixture(() => menu({ onAction: actions }));
    press('Open actions');
    await settle();
    key(list(), 'Enter', { isComposing: true });
    key(list(), 'Enter', { keyCode: 229 });
    key(list(), 'Escape', { isComposing: true });
    key(list(), 'Enter', { repeat: true });
    expect(actions).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    key(list(), ' ');
    expect(actions.mock.calls[0][0]).toBe('alpha');
    expect(document.querySelector('[role=menu]')).toBeNull();
  });

  it('preserves a controlled open menu after rejected requests and retoggles the trigger once', async () => {
    const [open, setOpen] = createState(false);
    const changes = vi.fn();
    const actions = vi.fn();
    fixture(() =>
      menu({
        get open() {
          return open();
        },
        onOpenChange: changes,
        onAction: actions,
      }),
    );
    press('Open actions');
    await settle();
    expect(document.querySelector('[role=menu]')).toBeNull();
    setOpen(true);
    await settle();
    const container = list();
    press('Open actions');
    await settle();
    expect(list()).toBe(container);
    expect(changes.mock.calls).toEqual([[true], [false]]);
    container.focus();
    key(container, 'Enter');
    expect(actions).toHaveBeenCalledTimes(1);
    expect(list()).toBe(container);
    setOpen(false);
    expect(document.querySelector('[role=menu]')).toBeNull();
  });

  it('consumes outside gestures and restores logical Tab/Shift+Tab exits', async () => {
    const state = fixture(() => [
      menu(),
      Button({ children: 'After actions' }),
    ]);
    press('Open actions');
    await settle();
    key(list(), 'Tab');
    expect(document.activeElement).toBe(named('After actions'));
    expect(document.querySelector('[role=menu]')).toBeNull();
    press('Open actions');
    await settle();
    key(list(), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(named('Open actions'));
    press('Open actions');
    await settle();
    expect(outside(state.target).defaultPrevented).toBe(true);
    expect(document.querySelector('[role=menu]')).toBeNull();
  });

  it('retains keyed row identities on reorder and repairs an active key removed from data', async () => {
    const [data, setData] = createState(items);
    fixture(() =>
      menu({
        get items() {
          return data();
        },
      }),
    );
    press('Open actions');
    await settle();
    const alpha = active()!;
    key(list(), 'End');
    setData([items[3], items[2], items[1], items[0]]);
    await settle();
    expect(active()?.textContent).toBe('Charlie');
    expect(rows().at(-1)).toBe(alpha);
    expect(rows().map((row) => row.textContent)).toEqual([
      'Charlie',
      'Bravo',
      'Beta',
      'Alpha',
    ]);
    setData([items[2], items[1], items[0]]);
    await settle();
    expect(active()?.textContent).toBe('Bravo');
    expect(rows().map((row) => row.getAttribute('aria-posinset'))).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(
      rows().every((row) => row.getAttribute('aria-setsize') === '3'),
    ).toBe(true);
  });

  it('keeps all-disabled items discoverable but disables and closes an empty menu', async () => {
    const [data, setData] = createState<readonly MenuOption[]>(
      items.map((item) => ({ ...item, disabled: true })),
    );
    const actions = vi.fn();
    fixture(() =>
      menu({
        get items() {
          return data();
        },
        onAction: actions,
      }),
    );
    expect((named('Open actions') as HTMLButtonElement).disabled).toBe(false);
    press('Open actions');
    await settle();
    key(list(), 'End');
    key(list(), 'Enter');
    expect(active()?.textContent).toBe('Charlie');
    expect(actions).not.toHaveBeenCalled();
    setData([]);
    await settle();
    expect(document.querySelector('[role=menu]')).toBeNull();
    expect((named('Open actions') as HTMLButtonElement).disabled).toBe(true);
  });

  it('vetoes custom item selection and supports Canvas pointer movement and explicit click activation', async () => {
    const actions = vi.fn();
    const veto = vi.fn((event: Event) => event.preventDefault());
    let alpha!: PNode;
    fixture(() =>
      Menu({
        label: 'Custom actions',
        items,
        onAction: actions,
        children: () => [
          MenuTrigger({ children: 'Custom trigger' }),
          MenuContent({
            children: () => [
              MenuItem({
                value: 'alpha',
                onSelect: veto,
                ref: (node) => {
                  alpha = node;
                },
              }),
              MenuItem({ value: 'bravo' }),
            ],
          }),
        ],
      }),
    );
    press('Custom trigger');
    await settle();
    key(list(), 'Enter');
    expect(veto).toHaveBeenCalledTimes(1);
    expect(actions).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    pixiPointer(alpha, 'pointerenter');
    expect(active()?.textContent).toBe('Alpha');
    rows()
      .find((row) => row.textContent === 'Alpha')!
      .click();
    expect(veto).toHaveBeenCalledTimes(2);
    expect(actions).not.toHaveBeenCalled();
    expect(list()).not.toBeNull();
    rows()
      .find((row) => row.textContent === 'Bravo')!
      .click();
    expect(actions.mock.calls[0][0]).toBe('bravo');
    expect(document.querySelector('[role=menu]')).toBeNull();
  });

  it.each(['dialog', 'popover'] as const)(
    'closes a nested menu before its owning %s',
    async (parent) => {
      fixture(() =>
        parent === 'dialog'
          ? Dialog({
              children: () => [
                DialogTrigger({ children: 'Outer trigger' }),
                DialogContent({ name: 'Outer dialog', children: () => menu() }),
              ],
            })
          : Popover({
              children: () => [
                PopoverTrigger({ children: 'Outer trigger' }),
                PopoverContent({
                  name: 'Outer popover',
                  children: () => menu(),
                }),
              ],
            }),
      );
      press('Outer trigger');
      await settle();
      press('Open actions');
      await settle();
      expect(list()).not.toBeNull();
      key(list(), 'Escape');
      expect(document.querySelector('[role=menu]')).toBeNull();
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      expect(document.activeElement).toBe(named('Open actions'));
      key(named('Open actions'), 'Escape');
      expect(document.querySelector('[role=dialog]')).toBeNull();
    },
  );

  it('drops stale actions and close requests when custom selection synchronously unmounts the root', async () => {
    const [visible, setVisible] = createState(true);
    const actions = vi.fn();
    const changes = vi.fn();
    const state = fixture(() =>
      Show({
        get when() {
          return visible();
        },
        children: (_visible) =>
          Menu({
            label: 'Unmount actions',
            items,
            defaultOpen: true,
            onAction: actions,
            onOpenChange: changes,
            children: () => [
              MenuTrigger({ children: 'Unmount menu trigger' }),
              MenuContent({
                children: () =>
                  MenuItem({
                    value: 'alpha',
                    onSelect: () => setVisible(false),
                  }),
              }),
            ],
          }),
      }),
    );
    await settle();
    rows()[0].click();
    state.sync();
    await settle();
    expect(actions).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
  });

  it('cancels rapid async openings and releases search timers on owner disposal', async () => {
    runtime.pending = true;
    const [open, setOpen] = createState(false);
    const state = fixture(() =>
      menu({
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
  it.each(['duplicate keys', 'empty label'])(
    'reports invalid %s once and recovers after valid root data is supplied',
    async (invalid) => {
      const errors = vi.fn();
      const [data, setData] = createState<readonly MenuOption[]>(
        invalid === 'duplicate keys'
          ? [
              { value: 'duplicate', label: 'First' },
              { value: 'duplicate', label: 'Second' },
            ]
          : [{ value: 'blank', label: '  ' }],
      );
      fixture(() =>
        Menu({
          label: 'Validated actions',
          get items() {
            return data();
          },
          children: () => [
            MenuTrigger({ children: 'Validation trigger' }),
            MenuContent({ onError: errors }),
          ],
        }),
      );
      await settle();
      expect(errors).toHaveBeenCalledTimes(1);
      expect((named('Validation trigger') as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect(document.querySelector('[role=menu]')).toBeNull();
      setData(items);
      await settle();
      expect((named('Validation trigger') as HTMLButtonElement).disabled).toBe(
        false,
      );
      press('Validation trigger');
      await settle();
      expect(active()?.textContent).toBe('Alpha');
      expect(errors).toHaveBeenCalledTimes(1);
    },
  );
  it('allows an action callback to prevent close after one explicit keyboard activation', async () => {
    const actions = vi.fn((_value: string, event: Event) =>
      event.preventDefault(),
    );
    fixture(() => menu({ onAction: actions }));
    press('Open actions');
    await settle();
    key(list(), 'Enter');
    expect(actions).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role=menu]')).not.toBeNull();
    expect(document.activeElement).toBe(list());
  });
  it('preserves active row identity and list focus when the theme changes', async () => {
    const [dark, setDark] = createState(false);
    fixture(() => menu(), dark);
    press('Open actions');
    await settle();
    key(list(), 'End');
    const container = list();
    const row = active();
    setDark(true);
    await settle();
    expect(list()).toBe(container);
    expect(active()).toBe(row);
    expect(document.activeElement).toBe(container);
    expect(active()?.textContent).toBe('Charlie');
  });

  it('releases an open owner, pending search and detached row listeners before a fresh mount', async () => {
    const actions = vi.fn();
    const changes = vi.fn();
    const state = fixture(() =>
      menu({ onAction: actions, onOpenChange: changes }),
    );
    press('Open actions');
    await settle();
    key(list(), 'b');
    const staleRow = active()!;
    state.dispose();
    expect(changes.mock.calls).toEqual([[true]]);
    await settle();
    staleRow.click();
    vi.advanceTimersByTime(1000);
    expect(actions).not.toHaveBeenCalled();
    expect(changes.mock.calls).toEqual([[true]]);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    fixture(() => menu());
    press('Open actions');
    await settle();
    expect(active()?.textContent).toBe('Alpha');
  });
  it('preserves menu-container focus and keyboard navigation after a Canvas press with rejected close', async () => {
    let bravo!: PNode;
    const actions = vi.fn();
    const opens = vi.fn();
    fixture(() =>
      Menu({
        label: 'Held actions',
        items,
        open: true,
        onAction: actions,
        onOpenChange: opens,
        children: () => [
          MenuTrigger({ children: 'Held menu trigger' }),
          MenuContent({
            children: () => [
              MenuItem({ value: 'alpha' }),
              MenuItem({
                value: 'bravo',
                ref: (node) => {
                  bravo = node;
                },
              }),
              MenuItem({ value: 'charlie' }),
            ],
          }),
        ],
      }),
    );
    await settle();
    const container = list();
    document.body.tabIndex = -1;
    document.body.focus();
    pixiPointer(bravo, 'pointerenter');
    const down = pixiPointer(bravo, 'pointerdown');
    // Cancel the Canvas mousedown default that would otherwise blur semantic focus.
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(container);
    pixiPointer(bravo, 'pointerup');
    expect(actions).toHaveBeenCalledTimes(1);
    expect(actions.mock.calls[0][0]).toBe('bravo');
    expect(opens).toHaveBeenCalledExactlyOnceWith(false);
    expect(list()).toBe(container);
    expect(document.activeElement).toBe(container);
    key(container, 'ArrowDown');
    expect(active()?.textContent).toBe('Charlie');
  });
});

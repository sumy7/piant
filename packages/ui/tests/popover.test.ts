import './anchoredFixture';

import { createState, type PInput, Show, View } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Popover,
  PopoverClose,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
  TextField,
} from '../dist/index.js';
import {
  fixture,
  key,
  named,
  outside,
  press,
  runtime,
  settle,
} from './anchoredFixture';

function popup(
  options: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    content?: Partial<PopoverContentProps>;
  } = {},
) {
  return Popover({
    get open() {
      return options.open;
    },
    defaultOpen: options.defaultOpen,
    onOpenChange: options.onOpenChange,
    children: () => [
      PopoverTrigger({ children: 'Open popover' }),
      PopoverContent({
        name: 'Profile popover',
        ...options.content,
        children: () =>
          TextField({
            'aria-label': 'Popover field',
            defaultValue: '初始草稿',
          }),
        actions: () => PopoverClose({ children: 'Close popover' }),
      }),
    ],
  });
}

describe('Popover', () => {
  it('opens anchored named nonmodal content and toggles once when its trigger is pressed again', async () => {
    const changes = vi.fn();
    fixture(() => popup({ onOpenChange: changes }));
    expect(named('Open popover').getAttribute('aria-expanded')).toBe('false');
    press('Open popover');
    await settle();
    const surface = document.querySelector<HTMLElement>('[role=dialog]')!;
    expect(surface.getAttribute('aria-label')).toBe('Profile popover');
    expect(surface.getAttribute('aria-modal')).toBe('false');
    expect(document.activeElement).toBe(named('Popover field'));
    expect(named('Open popover').getAttribute('aria-controls')).toBe(
      surface.id,
    );
    press('Open popover');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(changes.mock.calls).toEqual([[true], [false]]);
    expect(named('Open popover').hasAttribute('aria-controls')).toBe(false);
  });

  it('returns Shift+Tab to the trigger and Tab after the final action to the next background control', async () => {
    fixture(() => [popup(), Button({ children: 'After trigger' })]);
    press('Open popover');
    await settle();
    key(named('Popover field'), 'Tab', { shiftKey: true });
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('Open popover'));
    press('Open popover');
    await settle();
    named('Close popover').focus();
    key(named('Close popover'), 'Tab');
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('After trigger'));
  });

  it('dismisses for background focus and pointer without preventing the background gesture', async () => {
    const { target } = fixture(() => [
      popup(),
      TextField({ 'aria-label': 'Background editor' }),
    ]);
    press('Open popover');
    await settle();
    named('Background editor').focus();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('Background editor'));
    press('Open popover');
    await settle();
    expect(outside(target).defaultPrevented).toBe(false);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('honors controlled refusal without replacing an open draft or its selection on theme changes', async () => {
    const [open, setOpen] = createState(false);
    const [dark, setDark] = createState(false);
    const changes = vi.fn();
    fixture(
      () =>
        popup({
          get open() {
            return open();
          },
          onOpenChange: changes,
        }),
      dark,
    );
    press('Open popover');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    setOpen(true);
    await settle();
    const input = named('Popover field') as HTMLInputElement;
    input.value = '已编辑';
    input.setSelectionRange(1, 2);
    key(input, 'Escape');
    await settle();
    expect(changes).toHaveBeenLastCalledWith(false);
    expect(named('Popover field')).toBe(input);
    setDark(true);
    await settle();
    expect(named('Popover field')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 2]);
    setOpen(false);
    setOpen(true);
    await settle();
    expect(named('Popover field')).not.toBe(input);
    expect((named('Popover field') as HTMLInputElement).value).toBe('初始草稿');
  });

  it('resolves initial focus once and allows dismissal policies to be disabled', async () => {
    let input!: PInput;
    const initialFocus = vi.fn(() => input.element);
    fixture(() => [
      Popover({
        children: () => [
          PopoverTrigger({ children: 'Policy trigger' }),
          PopoverContent({
            name: 'Policy popup',
            initialFocus,
            dismissOnEscape: false,
            dismissOnOutsidePointer: false,
            dismissOnFocusOutside: false,
            children: () => [
              Button({ children: 'First action' }),
              TextField({
                'aria-label': 'Chosen input',
                ref: (node) => {
                  input = node;
                },
              }),
            ],
          }),
        ],
      }),
      Button({ children: 'Other control' }),
    ]);
    press('Policy trigger');
    await settle();
    expect(document.activeElement).toBe(input.element);
    key(input.element, 'Escape');
    named('Other control').focus();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(initialFocus).toHaveBeenCalledTimes(1);
  });

  it('keeps nested popover in its parent modal and restores the nested trigger on Escape', async () => {
    fixture(() =>
      Dialog({
        children: () => [
          DialogTrigger({ children: 'Open parent' }),
          DialogContent({
            name: 'Parent modal',
            children: () => popup(),
            actions: () => DialogClose({ children: 'Parent close' }),
          }),
        ],
      }),
    );
    press('Open parent');
    await settle();
    press('Open popover');
    await settle();
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
    key(named('Popover field'), 'Escape');
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
    expect(document.activeElement).toBe(named('Open popover'));
    key(named('Open popover'), 'Escape');
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('Open parent'));
  });

  it('releases its visual content when the controlled trigger disappears, even if closure is rejected', async () => {
    const [visible, setVisible] = createState(true);
    const changes = vi.fn();
    const state = fixture(() => [
      Button({ children: 'Fallback control' }),
      Popover({
        open: true,
        onOpenChange: changes,
        children: () => [
          Show({
            get when() {
              return visible();
            },
            children: (_visible) =>
              PopoverTrigger({ children: 'Removable anchor' }),
          }),
          PopoverContent({
            name: 'Removed anchor popup',
            children: () => TextField({ 'aria-label': 'Anchored draft' }),
          }),
        ],
      }),
    ]);
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    setVisible(false);
    state.sync();
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(changes).toHaveBeenCalledWith(false);
    named('Fallback control').focus();
    expect(document.activeElement).toBe(named('Fallback control'));
  });

  it('cancels pending mounts and releases mounted descendants on owner disposal', async () => {
    runtime.pending = true;
    const [open, setOpen] = createState(false);
    const state = fixture(() =>
      popup({
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
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed).toHaveLength(0);
  });

  it('reports an empty name once and releases the invalid content', async () => {
    const errors = vi.fn();
    fixture(() =>
      Popover({
        defaultOpen: true,
        children: () => [
          PopoverTrigger({ children: 'Invalid trigger' }),
          PopoverContent({
            name: '  ',
            onError: errors,
            children: () => View({}),
          }),
        ],
      }),
    );
    await settle();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    named('Invalid trigger').focus();
    expect(document.activeElement).toBe(named('Invalid trigger'));
  });

  it('does not dispatch a stale close when an action synchronously removes its root', async () => {
    const [visible, setVisible] = createState(true);
    const changes = vi.fn();
    const state = fixture(() =>
      Show({
        get when() {
          return visible();
        },
        children: (_visible) =>
          Popover({
            defaultOpen: true,
            onOpenChange: changes,
            children: () => [
              PopoverTrigger({ children: 'Unmount trigger' }),
              PopoverContent({
                name: 'Unmount popup',
                children: () => View({}),
                actions: () =>
                  PopoverClose({
                    children: 'Unmount action',
                    onPress: () => setVisible(false),
                  }),
              }),
            ],
          }),
      }),
    );
    await settle();
    press('Unmount action');
    state.sync();
    await settle();
    expect(changes).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
  });
  it('updates reactive content metadata and dimensions without replacing the focused input', async () => {
    const [name, setName] = createState('Original popup name');
    const [width, setWidth] = createState(250);
    const [placement, setPlacement] = createState<'top' | 'right-end'>('top');
    const errors = vi.fn();
    fixture(() =>
      Popover({
        defaultOpen: true,
        children: () => [
          PopoverTrigger({ children: 'Reactive anchor' }),
          PopoverContent({
            get name() {
              return name();
            },
            get width() {
              return width();
            },
            get placement() {
              return placement();
            },
            onError: errors,
            children: () => TextField({ 'aria-label': 'Reactive popup input' }),
          }),
        ],
      }),
    );
    await settle();
    const surface = document.querySelector<HTMLElement>('[role=dialog]')!;
    const input = named('Reactive popup input');
    expect(surface.style.width).toBe('250px');
    setName('Updated popup name');
    setWidth(290);
    setPlacement('right-end');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBe(surface);
    expect(surface.getAttribute('aria-label')).toBe('Updated popup name');
    expect(surface.style.width).toBe('290px');
    expect(named('Reactive popup input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(errors).not.toHaveBeenCalled();
  });

  it('keeps independent instances open and removes only the surface belonging to a removed host', async () => {
    const instance = (label: string) =>
      Popover({
        defaultOpen: true,
        children: () => [
          PopoverTrigger({ children: `${label} trigger` }),
          PopoverContent({
            name: `${label} popup`,
            children: () => TextField({ 'aria-label': `${label} input` }),
          }),
        ],
      });
    const left = fixture(() => instance('Left'));
    await settle();
    fixture(() => instance('Right'));
    await settle();
    named('Left input').focus();
    expect(document.activeElement).toBe(named('Left input'));
    named('Right input').focus();
    expect(document.activeElement).toBe(named('Right input'));
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
    left.target.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(document.querySelector('[aria-label="Left popup"]')).toBeNull();
    expect(document.querySelector('[aria-label="Right popup"]')).not.toBeNull();
    expect(document.activeElement).toBe(named('Right input'));
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    expect(runtime.destroyed[1]).not.toHaveBeenCalled();
  });
  it.each(['disabled', 'loading', 'hidden'] as const)(
    'releases a controlled surface when its trigger becomes %s',
    async (reason) => {
      const [unavailable, setUnavailable] = createState(false);
      const changes = vi.fn();
      const state = fixture(() => [
        Button({ children: 'Available fallback' }),
        Popover({
          open: true,
          onOpenChange: changes,
          children: () => [
            PopoverTrigger({
              children: 'Unavailable anchor',
              get disabled() {
                return reason === 'disabled' && unavailable();
              },
              get loading() {
                return reason === 'loading' && unavailable();
              },
              get style() {
                return {
                  display:
                    reason === 'hidden' && unavailable()
                      ? ('none' as const)
                      : ('flex' as const),
                };
              },
            }),
            PopoverContent({
              name: 'Unavailable popup',
              children: () => TextField({ 'aria-label': 'Unavailable draft' }),
            }),
          ],
        }),
      ]);
      await settle();
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      setUnavailable(true);
      state.sync();
      await settle();
      expect(document.querySelector('[role=dialog]')).toBeNull();
      expect(changes).toHaveBeenCalledWith(false);
      expect(named('Unavailable anchor').getAttribute('aria-expanded')).toBe(
        'false',
      );
      named('Available fallback').focus();
      expect(document.activeElement).toBe(named('Available fallback'));
    },
  );
});

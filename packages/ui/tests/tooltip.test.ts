import './anchoredFixture';

import { createState, mergeProps, type PNode, Show } from '@piant/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  Dialog,
  DialogContent,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  TextField,
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  TooltipTrigger,
  UIProvider,
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

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
function tooltip(
  options: {
    open?: boolean;
    defaultOpen?: boolean;
    openDelay?: number;
    closeDelay?: number;
    disabled?: boolean;
    onOpenChange?: (open: boolean) => void;
    onPress?: () => void;
    content?: Partial<TooltipContentProps>;
  } = {},
) {
  let trigger!: PNode;
  const create = () =>
    Tooltip({
      get open() {
        return options.open;
      },
      defaultOpen: options.defaultOpen,
      get openDelay() {
        return options.openDelay;
      },
      get closeDelay() {
        return options.closeDelay;
      },
      onOpenChange: options.onOpenChange,
      children: () => [
        TooltipTrigger({
          children: 'Tooltip action',
          get disabled() {
            return options.disabled;
          },
          onPress: options.onPress,
          ref: (node) => {
            trigger = node;
          },
        }),
        TooltipContent(
          mergeProps(
            { children: 'Helpful action description' },
            options.content ?? {},
          ) as TooltipContentProps,
        ),
      ],
    });
  return { create, trigger: () => trigger };
}
async function advance(milliseconds: number) {
  vi.advanceTimersByTime(milliseconds);
  await settle();
}
const surface = () => document.querySelector<HTMLElement>('[role=tooltip]');

describe('Tooltip', () => {
  it('delays hover opening and grace closing without moving the current input focus or selection', async () => {
    const tip = tooltip();
    fixture(() => [
      TextField({ 'aria-label': 'Background draft', defaultValue: '输入选区' }),
      tip.create(),
    ]);
    const input = named('Background draft') as HTMLInputElement;
    input.focus();
    input.setSelectionRange(1, 3);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(499);
    expect(surface()).toBeNull();
    await advance(1);
    expect(surface()).not.toBeNull();
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    expect(surface()?.textContent).toContain('Helpful action description');
    expect(surface()?.querySelector('button,input,[tabindex="0"]')).toBeNull();
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(199);
    expect(surface()).not.toBeNull();
    await advance(1);
    expect(surface()).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('opens immediately for keyboard focus and balances focus against pointer leave', async () => {
    const tip = tooltip();
    fixture(() => [tip.create(), Button({ children: 'Next action' })]);
    named('Tooltip action').focus();
    await settle();
    expect(surface()).not.toBeNull();
    expect(document.activeElement).toBe(named('Tooltip action'));
    pixiPointer(tip.trigger(), 'pointerenter');
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(1000);
    expect(surface()).not.toBeNull();
    named('Next action').focus();
    await advance(199);
    expect(surface()).not.toBeNull();
    await advance(1);
    expect(surface()).toBeNull();
    expect(document.activeElement).toBe(named('Next action'));
  });

  it('keeps content open while the pointer crosses its grace area and hovers the tooltip', async () => {
    const tip = tooltip();
    fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    const content = surface()!;
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(100);
    content.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    );
    await advance(1000);
    expect(surface()).toBe(content);
    content.dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse' }),
    );
    await advance(199);
    expect(surface()).toBe(content);
    await advance(1);
    expect(surface()).toBeNull();
  });

  it('dismisses hover tooltips with document Escape and suppresses reopening until a new hover cycle', async () => {
    const changes = vi.fn();
    const tip = tooltip({ onOpenChange: changes });
    fixture(tip.create);
    document.body.tabIndex = -1;
    document.body.focus();
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    key(document.body, 'Escape', { isComposing: true });
    expect(surface()).not.toBeNull();
    key(document.body, 'Escape');
    expect(surface()).toBeNull();
    await advance(5000);
    expect(surface()).toBeNull();
    pixiPointer(tip.trigger(), 'pointerleave');
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    expect(surface()).not.toBeNull();
    expect(changes.mock.calls).toEqual([[true], [false], [true]]);
  });

  it('suppresses touch hints while preserving the trigger business action', async () => {
    const action = vi.fn();
    const tip = tooltip({ onPress: action });
    fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter', { pointerType: 'touch' });
    pixiPointer(tip.trigger(), 'pointerdown', { pointerType: 'touch' });
    pixiPointer(tip.trigger(), 'pointerup', { pointerType: 'touch' });
    await advance(2000);
    expect(action).toHaveBeenCalledTimes(1);
    expect(surface()).toBeNull();
  });

  it('retains the live describedBy target through theme/font changes and cleans it on close', async () => {
    const [dark, setDark] = createState(false);
    const [fontScale, setFontScale] = createState(1);
    const tip = tooltip({
      content: {
        width: 120,
        children: 'A description that wraps across several lines.',
      },
    });
    fixture(
      () =>
        UIProvider({
          get fontScale() {
            return fontScale();
          },
          children: tip.create,
        }),
      dark,
    );
    named('Tooltip action').focus();
    await settle();
    const trigger = named('Tooltip action');
    const content = surface()!;
    expect(trigger.getAttribute('aria-describedby')?.split(/\s+/)).toContain(
      content.id,
    );
    expect(document.getElementById(content.id)).toBe(content);
    const originalHeight = Number.parseFloat(content.style.height);
    setDark(true);
    setFontScale(1.5);
    await settle();
    expect(surface()).toBe(content);
    expect(named('Tooltip action')).toBe(trigger);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-describedby')?.split(/\s+/)).toContain(
      content.id,
    );
    expect(Number.parseFloat(content.style.height)).toBeGreaterThan(
      originalHeight,
    );
    key(trigger, 'Escape');
    expect(surface()).toBeNull();
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
  });

  it('honors controlled open and close refusal without replacing the existing tooltip', async () => {
    const [open, setOpen] = createState(false);
    const changes = vi.fn();
    const tip = tooltip({
      get open() {
        return open();
      },
      onOpenChange: changes,
    });
    fixture(tip.create);
    named('Tooltip action').focus();
    await settle();
    expect(changes).toHaveBeenCalledWith(true);
    expect(surface()).toBeNull();
    setOpen(true);
    await settle();
    const content = surface()!;
    key(named('Tooltip action'), 'Escape');
    await settle();
    expect(changes).toHaveBeenLastCalledWith(false);
    expect(surface()).toBe(content);
    expect(named('Tooltip action').getAttribute('aria-describedby')).toContain(
      content.id,
    );
    setOpen(false);
    expect(surface()).toBeNull();
  });

  it('cancels pending hover timers when its trigger is disabled or removed', async () => {
    const [disabled, setDisabled] = createState(false);
    const [visible, setVisible] = createState(true);
    const changes = vi.fn();
    let trigger!: PNode;
    const state = fixture(() =>
      Tooltip({
        onOpenChange: changes,
        children: () => [
          Show({
            get when() {
              return visible();
            },
            children: (_visible) =>
              TooltipTrigger({
                children: 'Temporary action',
                get disabled() {
                  return disabled();
                },
                ref: (node) => {
                  trigger = node;
                },
              }),
          }),
          TooltipContent({ children: 'Temporary hint' }),
        ],
      }),
    );
    pixiPointer(trigger, 'pointerenter');
    await advance(100);
    setDisabled(true);
    state.sync();
    await advance(1000);
    expect(surface()).toBeNull();
    expect(changes).not.toHaveBeenCalled();
    setDisabled(false);
    state.sync();
    pixiPointer(trigger, 'pointerenter');
    await advance(100);
    setVisible(false);
    state.sync();
    await advance(1000);
    expect(surface()).toBeNull();
    expect(changes).not.toHaveBeenCalled();
  });

  it('reconciles changed delays and clears timer/listener effects when the owner is destroyed', async () => {
    const [delay, setDelay] = createState(500);
    const changes = vi.fn();
    const tip = tooltip({
      get openDelay() {
        return delay();
      },
      onOpenChange: changes,
    });
    const state = fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(100);
    setDelay(10);
    await advance(9);
    expect(surface()).toBeNull();
    await advance(1);
    expect(surface()).not.toBeNull();
    state.dispose();
    await advance(2000);
    expect(surface()).toBeNull();
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls).toEqual([[true]]);
  });

  it('cancels rapid async openings before a stale tooltip can attach or describe its trigger', async () => {
    runtime.pending = true;
    const [open, setOpen] = createState(false);
    const tip = tooltip({
      get open() {
        return open();
      },
    });
    const state = fixture(tip.create);
    setOpen(true);
    setOpen(false);
    setOpen(true);
    expect(runtime.finish).toHaveLength(2);
    state.dispose();
    for (const finish of runtime.finish.splice(0)) finish();
    await settle();
    expect(surface()).toBeNull();
    expect(runtime.destroyed).toHaveLength(0);
  });

  it('removes an invalid description once without leaving a describedBy link', async () => {
    const errors = vi.fn();
    const [description, setDescription] = createState('Valid hint');
    const tip = tooltip({
      content: {
        get children() {
          return description();
        },
        onError: errors,
      },
    });
    fixture(tip.create);
    named('Tooltip action').focus();
    await settle();
    expect(surface()).not.toBeNull();
    setDescription('  ');
    await settle();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(surface()).toBeNull();
    expect(named('Tooltip action').hasAttribute('aria-describedby')).toBe(
      false,
    );
  });
  it('cleans a removed host and creates fresh tooltip semantics after remount', async () => {
    vi.useRealTimers();
    const firstTip = tooltip();
    const first = fixture(firstTip.create);
    named('Tooltip action').focus();
    await settle();
    const oldTrigger = named('Tooltip action');
    const oldSurface = surface()!;
    first.target.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(surface()).toBeNull();
    expect(oldTrigger.hasAttribute('aria-describedby')).toBe(false);
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    const nextTip = tooltip();
    fixture(nextTip.create);
    named('Tooltip action').focus();
    await settle();
    expect(named('Tooltip action')).not.toBe(oldTrigger);
    expect(surface()).not.toBe(oldSurface);
    expect(named('Tooltip action').getAttribute('aria-describedby')).toContain(
      surface()!.id,
    );
  });
  it('cancels opening on an early leave and resets open hover state on pointer cancellation or window blur', async () => {
    const changes = vi.fn();
    const tip = tooltip({ onOpenChange: changes });
    fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(100);
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(1000);
    expect(surface()).toBeNull();
    expect(changes).not.toHaveBeenCalled();
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    expect(surface()).not.toBeNull();
    pixiPointer(tip.trigger(), 'pointercancel');
    await advance(1000);
    expect(surface()).toBeNull();
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(100);
    window.dispatchEvent(new Event('blur'));
    await advance(1000);
    expect(surface()).toBeNull();
    expect(changes.mock.calls).toEqual([[true], [false]]);
  });
  it.each(['focus', 'pointer', 'tab'] as const)(
    'does not let a nested Tooltip shield Popover from background %s dismissal',
    async (dismissal) => {
      const state = fixture(() => [
        Popover({
          children: () => [
            PopoverTrigger({ children: 'Nested popup trigger' }),
            PopoverContent({
              name: 'Popup with help',
              actions: () => PopoverClose({ children: 'Nested popup close' }),
              children: () =>
                Tooltip({
                  children: () => [
                    TooltipTrigger({ children: 'Nested help action' }),
                    TooltipContent({ children: 'Nested help text' }),
                  ],
                }),
            }),
          ],
        }),
        Button({ children: 'Outside nested popup' }),
      ]);
      press('Nested popup trigger');
      await settle();
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      expect(surface()).not.toBeNull();
      surface()!.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX: 200,
          clientY: 200,
          button: 0,
          isPrimary: true,
        }),
      );
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      if (dismissal === 'focus') named('Outside nested popup').focus();
      else if (dismissal === 'pointer')
        expect(outside(state.target).defaultPrevented).toBe(false);
      else {
        named('Nested popup close').focus();
        key(named('Nested popup close'), 'Tab');
      }
      await settle();
      expect(document.querySelector('[role=dialog]')).toBeNull();
      expect(surface()).toBeNull();
      if (dismissal !== 'pointer')
        expect(document.activeElement).toBe(named('Outside nested popup'));
    },
  );

  it('returns disallowed background focus to an interactive Dialog control instead of its open Tooltip', async () => {
    let trigger!: PNode;
    fixture(() => [
      TextField({ 'aria-label': 'Modal background editor' }),
      Dialog({
        defaultOpen: true,
        children: () =>
          DialogContent({
            name: 'Modal with help',
            children: () => [
              TextField({ 'aria-label': 'Actual dialog editor' }),
              Tooltip({
                children: () => [
                  TooltipTrigger({
                    children: 'Dialog help action',
                    ref: (node) => {
                      trigger = node;
                    },
                  }),
                  TooltipContent({ children: 'Dialog help text' }),
                ],
              }),
            ],
          }),
      }),
    ]);
    await settle();
    expect(document.activeElement).toBe(named('Actual dialog editor'));
    pixiPointer(trigger, 'pointerenter');
    await advance(500);
    expect(surface()).not.toBeNull();
    named('Modal background editor').focus();
    await settle();
    expect(document.activeElement).toBe(named('Actual dialog editor'));
    expect(document.activeElement).not.toBe(surface());
    expect(surface()).not.toBeNull();
    key(named('Actual dialog editor'), 'Escape');
    await settle();
    expect(surface()).toBeNull();
    key(named('Actual dialog editor'), 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });
  it('dismisses the top Tooltip before its owning Popover with successive Escape keys', async () => {
    fixture(() =>
      Popover({
        children: () => [
          PopoverTrigger({ children: 'Escape popup trigger' }),
          PopoverContent({
            name: 'Escape popup',
            children: () =>
              Tooltip({
                children: () => [
                  TooltipTrigger({ children: 'Escape help action' }),
                  TooltipContent({ children: 'Escape help text' }),
                ],
              }),
          }),
        ],
      }),
    );
    press('Escape popup trigger');
    await settle();
    expect(surface()).not.toBeNull();
    key(named('Escape help action'), 'Escape');
    await settle();
    expect(surface()).toBeNull();
    expect(
      document.querySelector('[aria-label="Escape popup"]'),
    ).not.toBeNull();
    expect(document.activeElement).toBe(named('Escape help action'));
    await advance(1000);
    expect(surface()).toBeNull();
    key(named('Escape help action'), 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('Escape popup trigger'));
  });
  it('clears removed-content hover after Escape so a fresh hover cycle closes normally', async () => {
    const tip = tooltip();
    fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    const content = surface()!;
    pixiPointer(tip.trigger(), 'pointerleave');
    content.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    );
    key(document.body, 'Escape');
    await settle();
    expect(surface()).toBeNull();
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    expect(surface()).not.toBeNull();
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(200);
    expect(surface()).toBeNull();
  });

  it('clears stale content-hover intent when a controlled parent closes the tooltip', async () => {
    const [open, setOpen] = createState(false);
    const changes = vi.fn((value: boolean) => setOpen(value));
    const tip = tooltip({
      get open() {
        return open();
      },
      onOpenChange: changes,
    });
    fixture(tip.create);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    const content = surface()!;
    pixiPointer(tip.trigger(), 'pointerleave');
    content.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    );
    setOpen(false);
    await advance(2000);
    expect(surface()).toBeNull();
    expect(changes.mock.calls).toEqual([[true]]);
    pixiPointer(tip.trigger(), 'pointerenter');
    await advance(500);
    expect(surface()).not.toBeNull();
    pixiPointer(tip.trigger(), 'pointerleave');
    await advance(200);
    expect(surface()).toBeNull();
    expect(changes.mock.calls).toEqual([[true], [true], [false]]);
  });
});

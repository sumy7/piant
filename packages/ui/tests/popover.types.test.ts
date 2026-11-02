import type { PNode, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  type ButtonPressEvent,
  Popover,
  PopoverClose,
  type PopoverCloseProps,
  PopoverContent,
  type PopoverContentProps,
  type PopoverProps,
  PopoverTrigger,
  type PopoverTriggerProps,
} from '../dist/index.js';

it('exports complete anchored popover root, content and button contracts', () => {
  const check = (element: HTMLElement) => {
    const root: PopoverProps = {
      open: false,
      defaultOpen: true,
      children: () => undefined,
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
    };
    expectTypeOf(Popover(root)).toEqualTypeOf<ReturnType<typeof View>>();
    const trigger: PopoverTriggerProps = {
      children: 'Open',
      variant: 'secondary',
      onPress(event, node) {
        expectTypeOf(event).toEqualTypeOf<ButtonPressEvent>();
        expectTypeOf(node).toEqualTypeOf<PNode>();
        event.preventDefault();
      },
    };
    const close: PopoverCloseProps = trigger;
    PopoverTrigger(trigger);
    PopoverClose(close);
    const content: PopoverContentProps = {
      name: 'Profile',
      width: 320,
      height: 240,
      initialFocus: () => element,
      dismissOnEscape: false,
      dismissOnOutsidePointer: false,
      dismissOnFocusOutside: false,
      scrollLabel: 'Scrollable profile',
      placement: 'right-end',
      gap: 8,
      padding: 12,
      flip: false,
      shift: false,
      children: () => undefined,
      actions: () => undefined,
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    PopoverContent(content);
    // @ts-expect-error A nonmodal dialog still requires an accessible name.
    PopoverContent({ children: () => undefined });
    // @ts-expect-error Content is deferred into the captured owner.
    PopoverContent({ ...content, children: 'eager content' });
    // @ts-expect-error Popover placement uses the overlay placement union.
    PopoverContent({ ...content, placement: 'diagonal' });
    // @ts-expect-error Popover is nonmodal; modality is not configurable.
    PopoverContent({ ...content, modal: true });
    // @ts-expect-error Trigger keeps Button's name requirement.
    PopoverTrigger({});
  };
  expectTypeOf(check).toBeFunction();
});

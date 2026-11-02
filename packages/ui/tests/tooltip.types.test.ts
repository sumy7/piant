import type { PNode, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  type ButtonPressEvent,
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  type TooltipProps,
  TooltipTrigger,
  type TooltipTriggerProps,
} from '../dist/index.js';

it('exports tooltip delays and string-only noninteractive content contracts', () => {
  const check = () => {
    const root: TooltipProps = {
      open: false,
      defaultOpen: true,
      openDelay: 500,
      closeDelay: 200,
      children: () => undefined,
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
    };
    expectTypeOf(Tooltip(root)).toEqualTypeOf<ReturnType<typeof View>>();
    const trigger: TooltipTriggerProps = {
      children: 'Save',
      onPress(event, node) {
        expectTypeOf(event).toEqualTypeOf<ButtonPressEvent>();
        expectTypeOf(node).toEqualTypeOf<PNode>();
      },
    };
    TooltipTrigger(trigger);
    const content: TooltipContentProps = {
      children: 'Save the current draft',
      width: 220,
      placement: 'top-end',
      gap: 8,
      padding: 12,
      flip: true,
      shift: true,
      style: { padding: 8 },
      textStyle: { fontSize: 12 },
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    TooltipContent(content);
    TooltipContent({
      // @ts-expect-error Tooltip cannot contain interactive or deferred content.
      children: () => TooltipTrigger({ children: 'Nested action' }),
    });
    // @ts-expect-error Tooltip content height is measured from its text.
    TooltipContent({ ...content, height: 200 });
    // @ts-expect-error Tooltip must not move focus into its content.
    TooltipContent({ ...content, initialFocus: () => document.body });
    // @ts-expect-error Trigger retains the accessible name requirement.
    TooltipTrigger({});
    // @ts-expect-error Delay is milliseconds, not a duration string.
    Tooltip({ ...root, openDelay: '500ms' });
  };
  expectTypeOf(check).toBeFunction();
});

import type { View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  type ChoiceSelectEvent,
  Menu,
  MenuContent,
  type MenuContentProps,
  MenuItem,
  type MenuItemProps,
  type MenuOption,
  type MenuProps,
  MenuTrigger,
  type MenuTriggerProps,
} from '../dist/index.js';

it('exports named action-menu options, deferred parts and cancellable selection contracts', () => {
  const check = () => {
    const options: readonly MenuOption[] = [
      { value: 'open', label: 'Open' },
      { value: 'delete', label: 'Delete', disabled: true },
    ];
    const root: MenuProps = {
      label: 'Actions',
      items: options,
      open: false,
      defaultOpen: true,
      disabled: false,
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
      onAction(value, event) {
        expectTypeOf(value).toEqualTypeOf<string>();
        expectTypeOf(event).toEqualTypeOf<ChoiceSelectEvent>();
        event.preventDefault();
      },
      children: () => undefined,
    };
    expectTypeOf(Menu(root)).toEqualTypeOf<ReturnType<typeof View>>();
    const trigger: MenuTriggerProps = {
      children: 'Open actions',
      variant: 'secondary',
    };
    MenuTrigger(trigger);
    const content: MenuContentProps = {
      width: 250,
      height: 300,
      placement: 'bottom-end',
      gap: 8,
      padding: 4,
      flip: true,
      shift: true,
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    MenuContent(content);
    MenuContent({ ...content, children: () => MenuItem({ value: 'open' }) });
    const item: MenuItemProps = {
      value: 'open',
      onSelect(event) {
        expectTypeOf(event).toEqualTypeOf<ChoiceSelectEvent>();
        event.preventDefault();
      },
      textStyle: { fontSize: 12 },
    };
    MenuItem(item);
    // @ts-expect-error Menu item labels and disabled state come from root data.
    MenuItem({ ...item, label: 'Inline label' });
    // @ts-expect-error Menu has action callbacks, not selected values.
    Menu({ ...root, value: 'open' });
    // @ts-expect-error Options require labels.
    Menu({ ...root, items: [{ value: 'open' }] });
    // @ts-expect-error Custom content is deferred.
    MenuContent({ children: 'eager items' });
    // @ts-expect-error Trigger retains Button's accessible-name requirement.
    MenuTrigger({});
  };
  expectTypeOf(check).toBeFunction();
});

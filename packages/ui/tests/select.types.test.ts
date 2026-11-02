import type { View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  type ChoiceSelectEvent,
  Select,
  SelectContent,
  type SelectContentProps,
  SelectItem,
  type SelectItemProps,
  type SelectOption,
  type SelectProps,
  SelectTrigger,
  type SelectTriggerProps,
} from '../dist/index.js';

it('exports select-only combobox value, options and root-owned trigger presentation contracts', () => {
  const check = () => {
    const options: readonly SelectOption[] = [
      { value: 'one', label: 'One' },
      { value: 'two', label: 'Two', disabled: true },
    ];
    const root: SelectProps = {
      label: 'Choice',
      options,
      value: null,
      defaultValue: 'one',
      placeholder: 'Choose one',
      open: false,
      defaultOpen: true,
      disabled: false,
      children: () => undefined,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string | null>();
      },
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
    };
    expectTypeOf(Select(root)).toEqualTypeOf<ReturnType<typeof View>>();
    const trigger: SelectTriggerProps = { variant: 'secondary', size: 'sm' };
    SelectTrigger(trigger);
    SelectTrigger({});
    const content: SelectContentProps = {
      width: 280,
      height: 300,
      placement: 'top-start',
      gap: 8,
      padding: 4,
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    SelectContent(content);
    SelectContent({ ...content, children: () => SelectItem({ value: 'one' }) });
    const item: SelectItemProps = {
      value: 'one',
      onSelect(event) {
        expectTypeOf(event).toEqualTypeOf<ChoiceSelectEvent>();
        event.preventDefault();
      },
    };
    SelectItem(item);
    // @ts-expect-error Select does not accept free-form text input values.
    Select({ ...root, value: 1 });
    // @ts-expect-error Select trigger text is the committed root value.
    SelectTrigger({ children: 'Custom label' });
    // @ts-expect-error Root data owns option labels and disabled state.
    SelectItem({ ...item, disabled: true });
    // @ts-expect-error Options require stable string identity keys.
    Select({ ...root, options: [{ value: 1, label: 'One' }] });
    // @ts-expect-error Custom content is deferred under the list owner.
    SelectContent({ children: 'eager options' });
  };
  expectTypeOf(check).toBeFunction();
});

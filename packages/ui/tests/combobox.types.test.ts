import type { PInput, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  Combobox,
  type ComboboxOption,
  type ComboboxProps,
} from '../dist/index.js';

it('exports independent editable text, selected candidate and controlled popup contracts', () => {
  const check = () => {
    const options: readonly ComboboxOption[] = [
      { value: 'one', label: 'One', disabled: false },
    ];
    const props: ComboboxProps = {
      label: 'Preset',
      options,
      value: null,
      defaultValue: 'one',
      inputValue: '',
      defaultInputValue: 'Draft',
      open: false,
      defaultOpen: true,
      disabled: false,
      readOnly: false,
      clearable: true,
      size: 'sm',
      popupWidth: 260,
      popupHeight: 200,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string | null>();
      },
      onInputValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string>();
      },
      onOpenChange(value) {
        expectTypeOf(value).toEqualTypeOf<boolean>();
      },
      filter(option, text) {
        expectTypeOf(option).toEqualTypeOf<ComboboxOption>();
        return option.label.includes(text);
      },
      inputRef(node) {
        expectTypeOf(node).toEqualTypeOf<PInput>();
      },
    };
    expectTypeOf(Combobox(props)).toEqualTypeOf<ReturnType<typeof View>>();
    // @ts-expect-error Candidate identity must be a string.
    Combobox({ ...props, value: 1 });
    // @ts-expect-error Text and numeric values are separate contracts.
    Combobox({ ...props, inputValue: null });
    // @ts-expect-error Options are local candidates with stable string keys.
    Combobox({ ...props, options: [{ value: 1, label: 'One' }] });
  };
  expectTypeOf(check).toBeFunction();
});

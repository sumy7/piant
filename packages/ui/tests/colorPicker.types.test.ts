import type { View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  ColorPicker,
  type ColorPickerProps,
} from '../dist/index.js';

it('exports a canonical string color and independent popup control contract', () => {
  const check = () => {
    const props: ColorPickerProps = {
      label: 'Fill',
      value: '#f008',
      defaultValue: '#3366ffff',
      alpha: false,
      readOnly: true,
      disabled: false,
      open: false,
      defaultOpen: true,
      size: 'sm',
      popupWidth: 360,
      popupHeight: 520,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string>();
      },
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    expectTypeOf(ColorPicker(props)).toEqualTypeOf<ReturnType<typeof View>>();
    // @ts-expect-error Single color strings, not arrays or multi-selection.
    ColorPicker({ ...props, value: ['#fff'] });
    // @ts-expect-error Color does not accept numeric values.
    ColorPicker({ ...props, value: 0xff0000 });
  };
  expectTypeOf(check).toBeFunction();
});

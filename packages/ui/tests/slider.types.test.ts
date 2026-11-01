import type { PNode, StyleValue, ViewStyles } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import { Slider, type SliderProps } from '../dist/index.js';

it('exports a single numeric range with required accessible name and reactive props', () => {
  const check = (style: StyleValue<ViewStyles>, value: number) => {
    const props: SliderProps = {
      name: 'Volume',
      get value() {
        return value;
      },
      defaultValue: 0.5,
      min: -1,
      max: 1,
      step: 0.1,
      orientation: 'vertical',
      dir: 'rtl',
      description: 'Master channel',
      disabled: false,
      style,
      valueText(current) {
        expectTypeOf(current).toEqualTypeOf<number>();
        return `${current} dB`;
      },
      onValueChange(current) {
        expectTypeOf(current).toEqualTypeOf<number>();
      },
      ref(node) {
        expectTypeOf(node).toExtend<PNode>();
      },
    };
    Slider(props);
    Slider({ name: 'Default range' });
    // @ts-expect-error Every slider requires an accessible name.
    Slider({ value: 1 });
    // @ts-expect-error Slider is single-valued.
    Slider({ name: 'Invalid range', value: [1, 2] });
    // @ts-expect-error Only the two supported orientations are valid.
    Slider({ name: 'Invalid orientation', orientation: 'diagonal' });
    // @ts-expect-error valueText is a formatter with a string result.
    Slider({ name: 'Invalid formatter', valueText: () => 12 });
    // @ts-expect-error Arbitrary DOM attributes are not silently forwarded.
    Slider({ name: 'Invalid attribute', tabIndex: 5 });
  };
  expectTypeOf(check).toBeFunction();
});

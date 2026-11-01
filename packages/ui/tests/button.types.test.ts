import type { Getter, PNode } from '@piant/core';
import { View } from '@piant/core';
import type { FederatedPointerEvent } from 'pixi.js';
import { expectTypeOf, it } from 'vitest';
import {
  Button,
  type ButtonProps,
  IconButton,
  type IconButtonProps,
} from '../dist/index.js';

it('exports named, typed Button and IconButton contracts for text and custom content', () => {
  expectTypeOf<ReturnType<typeof Button>>().toEqualTypeOf<
    ReturnType<typeof View>
  >();
  expectTypeOf<ReturnType<typeof IconButton>>().toEqualTypeOf<
    ReturnType<typeof View>
  >();
  expectTypeOf<
    Parameters<NonNullable<ButtonProps['onPress']>>[0]
  >().toEqualTypeOf<MouseEvent | FederatedPointerEvent>();
  expectTypeOf<
    Parameters<NonNullable<ButtonProps['onPress']>>[1]
  >().toEqualTypeOf<PNode>();
  const graphic: NonNullable<ButtonProps['icon']> = (context) => {
    expectTypeOf(context.size).toEqualTypeOf<Getter<number>>();
    expectTypeOf(context.color).toEqualTypeOf<Getter<string>>();
    return View({
      get style() {
        return {
          width: context.size(),
          height: context.size(),
          backgroundColor: context.color(),
        };
      },
    });
  };
  const text: ButtonProps = {
    children: 'Save',
    size: 'sm',
    variant: 'primary',
    icon: graphic,
    textStyle: { fontSize: 16 },
  };
  const icon: IconButtonProps = {
    name: 'Close',
    icon: graphic,
    size: 'lg',
    variant: 'ghost',
    loading: true,
  };
  expectTypeOf(text.size).toEqualTypeOf<'sm' | 'md' | 'lg' | undefined>();
  expectTypeOf(icon.name).toBeString();
  const errors = () => {
    // @ts-expect-error Custom Canvas content needs a semantic name.
    Button({ children: View({}) });
    // @ts-expect-error Icon-only buttons require a name.
    IconButton({ icon: graphic });
    // @ts-expect-error Icon-only buttons require an icon rendering entry.
    IconButton({ name: 'Close' });
    // @ts-expect-error IconButton content comes only from its icon entry.
    IconButton({ name: 'Close', icon: graphic, children: 'Close' });
    // @ts-expect-error The component owns its single activation path.
    Button({ children: 'Save', onClick: () => {} });
    // @ts-expect-error Use the declared semantic variants.
    Button({ children: 'Save', variant: 'accent' });
    // @ts-expect-error Positive custom Tab order is not a button styling prop.
    Button({ children: 'Save', tabIndex: 2 });
  };
  expectTypeOf(errors).toBeFunction();
});

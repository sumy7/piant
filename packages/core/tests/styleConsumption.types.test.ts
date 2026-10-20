import { describe, expectTypeOf, it } from 'vitest';
import { bindStyle } from '../src/components/bindStyle';
import type { ImageProps } from '../src/components/Image';
import type { TextProps } from '../src/components/Text';
import type { ViewProps } from '../src/components/View';
import type { PText } from '../src/elements/PText';
import type { TextLayoutStyle } from '../src/elements/text';
import type { TextStyles } from '../src/elements/text/textStyles';
import { StyleSheet } from '../src/styleSheet';
import flattenStyle from '../src/styleSheet/flattenStyle';
import type { StyleValue } from '../src/styleSheet/types';

describe('style consumption types', () => {
  it('infers heterogeneous and deeply readonly flattened styles', () => {
    const style = [
      { width: 10 },
      [{ color: 'red' as const }, false],
      null,
    ] as const;

    const flattened = flattenStyle(style);

    expectTypeOf(flattened.width).toEqualTypeOf<10 | undefined>();
    expectTypeOf(flattened.color).toEqualTypeOf<'red' | undefined>();

    const mutableStyles = [{ width: 10 }, { color: 'blue' }];
    const mutableFlattened = flattenStyle(mutableStyles);
    expectTypeOf(mutableFlattened.width).toEqualTypeOf<number | undefined>();
    expectTypeOf(mutableFlattened.color).toEqualTypeOf<string | undefined>();

    const resolved = StyleSheet.resolve(style);
    expectTypeOf(resolved.width).toEqualTypeOf<10 | undefined>();
    expectTypeOf(resolved.color).toEqualTypeOf<'red' | undefined>();

    const mutableNested: ({ width: number } | { color: string }[])[] = [
      { width: 10 },
      [{ color: 'blue' }],
    ];
    const mutableNestedFlattened = flattenStyle(mutableNested);
    expectTypeOf(mutableNestedFlattened.width).toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf(mutableNestedFlattened.color).toEqualTypeOf<
      string | undefined
    >();
  });

  it('supports explicit style generics', () => {
    type ExampleStyle = {
      width: number;
      color: string;
    };

    const mutableStyle: StyleValue<ExampleStyle> = [{ width: 10 }];
    mutableStyle.push({ color: 'blue' });

    const style: StyleValue<ExampleStyle> = [{ width: 10 }, [{ color: 'red' }]];
    const flattened = flattenStyle<ExampleStyle>(style);

    expectTypeOf(flattened).toEqualTypeOf<Partial<ExampleStyle> | undefined>();

    const consumeDynamicStyle = (dynamicStyle: StyleValue<ExampleStyle>) => {
      const inferred = flattenStyle(dynamicStyle);
      expectTypeOf(inferred).toEqualTypeOf<Partial<ExampleStyle> | undefined>();
    };
    expectTypeOf(consumeDynamicStyle).toBeFunction();

    expectTypeOf(flattenStyle()).toEqualTypeOf<undefined>();
    expectTypeOf(StyleSheet.flatten()).toEqualTypeOf<undefined>();

    const broadStyle: StyleValue<object> = [{ width: 10 }];
    expectTypeOf(flattenStyle<object>(broadStyle)).toEqualTypeOf<
      Partial<object> | undefined
    >();
    expectTypeOf(StyleSheet.resolve<object>(broadStyle)).toEqualTypeOf<
      Partial<object> | undefined
    >();

    const resolveGeneric = <T extends object>(value: StyleValue<T>) =>
      StyleSheet.resolve<T>(value);
    expectTypeOf(resolveGeneric).toBeFunction();

    const resolveDefault = (value: StyleValue) => StyleSheet.resolve(value);
    expectTypeOf(resolveDefault).toBeFunction();
  });

  it('preserves direct interfaces and readonly component styles', () => {
    interface InterfaceStyle {
      width?: number;
      color?: string;
    }

    const interfaceStyle: InterfaceStyle = { width: 10 };
    expectTypeOf(flattenStyle(interfaceStyle)).toEqualTypeOf<InterfaceStyle>();
    expectTypeOf(flattenStyle({})).toMatchTypeOf<object>();

    const readonlyStyle = [{ width: 100 }, [{ opacity: 0.5 }, false]] as const;
    const viewProps: ViewProps = { style: readonlyStyle };
    const textProps: TextProps = { style: readonlyStyle };
    const imageProps = {
      style: readonlyStyle,
    } satisfies Pick<ImageProps, 'style'>;

    expectTypeOf(viewProps.style).toMatchTypeOf<StyleValue<object>>();
    expectTypeOf(textProps.style).toMatchTypeOf<StyleValue<object>>();
    expectTypeOf(imageProps.style).toMatchTypeOf<StyleValue<object>>();
  });

  it('rejects primitive style inputs', () => {
    // @ts-expect-error primitives are ignored defensively at runtime, but are not style inputs
    flattenStyle('invalid');
    // @ts-expect-error primitives are ignored defensively at runtime, but are not style inputs
    flattenStyle(42);
    // @ts-expect-error callable objects are ignored at runtime, but are not style objects
    flattenStyle(() => ({ width: 10 }));
    // @ts-expect-error resolve exposes the same non-callable style contract
    StyleSheet.resolve(() => ({ width: 10 }));
    // @ts-expect-error callable entries are not valid inside style arrays
    flattenStyle([{ width: 10 }, () => ({ color: 'red' })]);
    // @ts-expect-error nested callable entries are not valid styles either
    StyleSheet.resolve([[() => ({ width: 10 })]] as const);
    const callableArray: (() => { width: number })[] = [];
    // @ts-expect-error dynamically sized arrays cannot contain callable styles
    flattenStyle(callableArray);
  });

  it('types reset patches without widening setters to any', () => {
    type ExampleStyle = { width?: number; label?: string };
    const target = {
      _layoutStyle: {} as ExampleStyle,
      setStyle(_style: {
        width?: number | undefined;
        label?: string | undefined;
      }) {},
    };

    bindStyle<ExampleStyle>(target, () => ({ width: 10 }));
    bindStyle<ExampleStyle>(target, () => ({ width: undefined }));

    // @ts-expect-error resolved values must match the target style
    bindStyle<ExampleStyle>(target, () => ({ width: 'wide' }));
  });

  it('projects text styles onto the text layout state', () => {
    expectTypeOf<PText['_textLayoutStyle']>().toEqualTypeOf<TextLayoutStyle>();
    type PTextStyle = NonNullable<Parameters<PText['setStyle']>[0]>;
    expectTypeOf<PTextStyle['fontSize']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<PTextStyle['width']>().toEqualTypeOf<
      TextStyles['width'] | undefined
    >();

    const checkCalls = (text: PText) => {
      text.setStyle({ fontSize: 18, width: 120 });
      text.setStyle({ fontSize: undefined, width: undefined });
      // @ts-expect-error invalid text style values are rejected
      text.setStyle({ fontSize: 'large' });
    };
    expectTypeOf(checkCalls).toBeFunction();
  });
});

import type { PNode, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  Checkbox,
  type CheckboxProps,
  RadioGroup,
  type RadioGroupOption,
  type RadioGroupProps,
  ToggleSwitch,
  type ToggleSwitchProps,
} from '../dist/index.js';

it('exports bounded checkable and radio state contracts with typed retained refs', () => {
  expectTypeOf<ReturnType<typeof Checkbox>>().toEqualTypeOf<
    ReturnType<typeof View>
  >();
  expectTypeOf<ReturnType<typeof ToggleSwitch>>().toEqualTypeOf<
    ReturnType<typeof View>
  >();
  expectTypeOf<ReturnType<typeof RadioGroup>>().toEqualTypeOf<
    ReturnType<typeof View>
  >();
  expectTypeOf<
    Parameters<NonNullable<CheckboxProps['onCheckedChange']>>[0]
  >().toEqualTypeOf<boolean | 'mixed'>();
  expectTypeOf<
    Parameters<NonNullable<ToggleSwitchProps['onCheckedChange']>>[0]
  >().toBeBoolean();
  expectTypeOf<
    Parameters<NonNullable<RadioGroupProps['onValueChange']>>[0]
  >().toBeString();
  const ref: NonNullable<CheckboxProps['ref']> = (node) => {
    expectTypeOf(node).toExtend<PNode>();
  };
  const checkbox: CheckboxProps = {
    label: 'Files',
    checked: 'mixed',
    defaultChecked: false,
    ref,
    textStyle: { color: '#fff' },
  };
  const toggle: ToggleSwitchProps = {
    label: 'Auto save',
    checked: true,
    disabled: false,
    ref,
  };
  const option: RadioGroupOption = {
    value: 'one',
    label: 'One',
    description: 'First choice',
    disabled: false,
  };
  const group: RadioGroupProps = {
    label: 'Choice',
    options: [option],
    value: 'one',
    orientation: 'horizontal',
    dir: 'rtl',
    ref,
  };
  expectTypeOf(checkbox.checked).toEqualTypeOf<boolean | 'mixed' | undefined>();
  expectTypeOf(toggle.checked).toEqualTypeOf<boolean | undefined>();
  expectTypeOf(group.options).toEqualTypeOf<readonly RadioGroupOption[]>();
  const errors = () => {
    // @ts-expect-error A switch exposes only boolean state.
    ToggleSwitch({ label: 'Auto save', checked: 'mixed' });
    // @ts-expect-error A switch cannot initialize mixed state either.
    ToggleSwitch({ label: 'Auto save', defaultChecked: 'mixed' });
    // @ts-expect-error Checkbox state is boolean or mixed, not a string value.
    Checkbox({ label: 'Files', checked: 'true' });
    // @ts-expect-error A named selection control requires its label.
    Checkbox({ defaultChecked: true });
    // @ts-expect-error Radio values match the option's string keys.
    RadioGroup({ label: 'Choice', options: [option], value: 1 });
    // @ts-expect-error RadioGroup is a single-value selection contract.
    RadioGroup({ label: 'Choice', options: [option], value: ['one'] });
    // @ts-expect-error Native semantic activation is composed internally.
    ToggleSwitch({ label: 'Auto save', onClick: () => {} });
    // @ts-expect-error Selection controls do not expose arbitrary Tab order.
    Checkbox({ label: 'Files', tabIndex: 1 });
  };
  expectTypeOf(errors).toBeFunction();
});

import type { Input, PInput } from '@piant/core';
import { View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  Field,
  type FieldProps,
  TextField,
  type TextFieldProps,
} from '../dist/index.js';

it('exports native TextField editing/ref types and deferred Field content with a bounded single-line API', () => {
  expectTypeOf<ReturnType<typeof TextField>>().toEqualTypeOf<
    ReturnType<typeof Input>
  >();
  const ref: NonNullable<TextFieldProps['ref']> = (node) => {
    expectTypeOf(node).toEqualTypeOf<PInput>();
    expectTypeOf(node.element).toEqualTypeOf<HTMLInputElement>();
    expectTypeOf(node.focus).toBeFunction();
    expectTypeOf(node.blur).toBeFunction();
  };
  const onValueChange: NonNullable<TextFieldProps['onValueChange']> = (
    value,
    event,
  ) => {
    expectTypeOf(value).toBeString();
    expectTypeOf(event).toEqualTypeOf<Event>();
  };
  const text: TextFieldProps = {
    'aria-label': 'Name',
    defaultValue: 'Name',
    type: 'email',
    size: 'sm',
    invalid: true,
    onValueChange,
    ref,
    style: { fontSize: 18, color: '#fff', caretColor: '#fff' },
  };
  const field: FieldProps = {
    label: 'Name',
    description: 'Help',
    error: 'Required',
    required: true,
    children: () => TextField({}),
  };
  expectTypeOf(text.type).toEqualTypeOf<
    'text' | 'search' | 'email' | 'url' | 'tel' | 'password' | undefined
  >();
  expectTypeOf(field.children).toBeFunction();
  const errors = () => {
    // @ts-expect-error TextField only exposes the supported text input types.
    TextField({ 'aria-label': 'Quantity', type: 'number' });
    // @ts-expect-error Native input editing owns its semantics and Tab behavior.
    TextField({ 'aria-label': 'Name', role: 'button' });
    // @ts-expect-error Positive custom Tab order is not part of the UI field contract.
    TextField({ 'aria-label': 'Name', tabIndex: 2 });
    // @ts-expect-error A single-line native input does not accept Canvas children.
    TextField({ 'aria-label': 'Name', children: 'Text' });
    // @ts-expect-error Field creates its child only after establishing context.
    Field({ label: 'Name', children: View({}) });
    // @ts-expect-error A Field requires a label.
    Field({ children: () => TextField({}) });
  };
  expectTypeOf(errors).toBeFunction();
});

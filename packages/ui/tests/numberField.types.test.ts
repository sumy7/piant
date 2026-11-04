import { expectTypeOf, it } from 'vitest';
import type { NumberFieldProps, SearchFieldProps } from '../dist/index.js';

it('separates numerical commits from native editing and search submission', () => {
  expectTypeOf<NumberFieldProps['value']>().toEqualTypeOf<
    number | null | undefined
  >();
  expectTypeOf<NonNullable<NumberFieldProps['onValueChange']>>().toEqualTypeOf<
    (value: number | null) => void
  >();
  expectTypeOf<
    NonNullable<NumberFieldProps['onInputValueChange']>
  >().toEqualTypeOf<(text: string, event: Event) => void>();
  expectTypeOf<NonNullable<SearchFieldProps['onSearch']>>().toEqualTypeOf<
    (value: string, event: KeyboardEvent) => void
  >();
});

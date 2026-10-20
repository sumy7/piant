import { expect, expectTypeOf, it, vi } from 'vitest';
import type {
  ImageStyles,
  ViewStyles,
} from '../src/elements/layout/viewStyles';
import type { TextStyles } from '../src/elements/text/textStyles';
import type {
  ResolvedStyleSheet,
  StyleReference,
  StyleSheetDefinition,
} from '../src/styleSheet';
import { StyleSheet } from '../src/styleSheet';

it('keeps exact sheet keys and required plain properties', () => {
  const plain = { width: 100, padding: 8 };
  const sheet = StyleSheet.create({ plain, label: { fontSize: 16 } });
  expectTypeOf(sheet.plain).toEqualTypeOf<typeof plain>();
  expectTypeOf(sheet.plain.width).toEqualTypeOf<number>();
  expectTypeOf(sheet.label.fontSize).toEqualTypeOf<16>();
  expectTypeOf<keyof typeof sheet>().toEqualTypeOf<'plain' | 'label'>();

  const checkErrors = () => {
    // @ts-expect-error the definition has no other sheet keys
    sheet.missing;
    // @ts-expect-error misspelled style properties cannot infer a custom style schema
    StyleSheet.create({ box: { widht: 100 } });
    // @ts-expect-error invalid built-in property values are rejected
    StyleSheet.create({ box: { width: 'banana' } });
    // @ts-expect-error unknown keys are rejected even alongside valid ones
    StyleSheet.create({ box: { width: 100, widht: 100 } });
    // @ts-expect-error invalid image style values are rejected
    StyleSheet.create({ image: { objectFit: 'stretch' } });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('resolves ordered parents and child overrides in the output type', () => {
  const sheet = StyleSheet.create({
    base: { padding: 8, color: 'red', width: 100 },
    text: { fontSize: 16, color: 'blue' },
    child: StyleSheet.extend(['base', 'text', { opacity: 0.5 }], {
      width: '50%',
    }),
    grandchild: StyleSheet.extend('child', { color: 'green' }),
  });
  expectTypeOf(sheet.child.padding).toEqualTypeOf<8>();
  expectTypeOf(sheet.child.color).toEqualTypeOf<'blue'>();
  expectTypeOf(sheet.child.fontSize).toEqualTypeOf<16>();
  expectTypeOf(sheet.child.opacity).toEqualTypeOf<0.5>();
  expectTypeOf(sheet.child.width).toEqualTypeOf<'50%'>();
  expectTypeOf(sheet.grandchild.padding).toEqualTypeOf<8>();
  expectTypeOf(sheet.grandchild.color).toEqualTypeOf<'green'>();

  const definition = {
    base: { padding: 4 },
    child: StyleSheet.extend('base', { color: 'red' }),
  };
  expectTypeOf<
    ResolvedStyleSheet<typeof definition>['child']['padding']
  >().toEqualTypeOf<number>();

  const checkErrors = () => {
    // @ts-expect-error literal parent names are checked against this sheet
    StyleSheet.create({
      base: { padding: 4 },
      child: StyleSheet.extend('bsae'),
    });
    // @ts-expect-error every literal in a parent tuple is validated
    StyleSheet.create({
      base: { padding: 4 },
      child: StyleSheet.extend(['base', 'missing']),
    });
    // @ts-expect-error overrides have the same validation as plain styles
    StyleSheet.extend('base', { widht: 10 });
    // @ts-expect-error object parents have the same validation as plain styles
    StyleSheet.extend({ width: 'banana' });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('keeps explicit generic and annotated definitions compatible', () => {
  const view = StyleSheet.create<ViewStyles>({ box: { width: 100 } });
  const text = StyleSheet.create<TextStyles>({ label: { fontSize: 16 } });
  const image = StyleSheet.create<ImageStyles>({
    image: { objectFit: 'cover' },
  });
  expectTypeOf(view.box!.width).toEqualTypeOf<ViewStyles['width']>();
  expectTypeOf(text.label!.fontSize).toEqualTypeOf<number | undefined>();
  expectTypeOf(image.image!.objectFit).toEqualTypeOf<
    ImageStyles['objectFit']
  >();
  const reference: StyleReference<TextStyles> = StyleSheet.extend<TextStyles>(
    'base',
    { color: 'red' },
  );
  expectTypeOf<StyleReference<TextStyles>['parents'][number]>().toEqualTypeOf<
    string | Partial<TextStyles>
  >();
  const definition: StyleSheetDefinition<TextStyles> = {
    base: { fontSize: 16 },
    child: reference,
  };
  expectTypeOf(
    StyleSheet.create<TextStyles>(definition).child!.color,
  ).toEqualTypeOf<string | undefined>();
  expectTypeOf(StyleSheet.create(definition).child!.color).toEqualTypeOf<
    string | undefined
  >();

  const checkErrors = () => {
    // @ts-expect-error explicit legacy generic still validates property values
    StyleSheet.create<ViewStyles>({ box: { width: 'banana' } });
    // @ts-expect-error explicit legacy generic still validates known properties
    StyleSheet.create<ViewStyles>({ box: { widht: 100 } });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('preserves precise keys for custom styles with the curried form', () => {
  type CustomStyle = { tone?: 'warm' | 'cool'; size?: number };
  const create = StyleSheet.create<CustomStyle>();
  const extend = StyleSheet.extend<CustomStyle>();
  const sheet = create({
    base: { size: 12 },
    child: extend('base', { tone: 'warm' }),
  });
  expectTypeOf<keyof typeof sheet>().toEqualTypeOf<'base' | 'child'>();
  expectTypeOf(sheet.child.size).toEqualTypeOf<12>();
  expectTypeOf(sheet.child.tone).toEqualTypeOf<'warm'>();
  const legacy = StyleSheet.create<CustomStyle>({ item: { tone: 'cool' } });
  expectTypeOf(legacy.item!.tone).toEqualTypeOf<'warm' | 'cool' | undefined>();

  const checkErrors = () => {
    // @ts-expect-error the selected custom schema is validated
    create({ item: { tone: 'other' } });
    // @ts-expect-error custom schema does not accept built-in properties implicitly
    create({ item: { width: 100 } });
    // @ts-expect-error exact custom references also check parent keys
    create({ item: extend('missing') });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('keeps cycle resolution finite and models the skipped edge', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const sheet = StyleSheet.create({
      a: StyleSheet.extend('b', { padding: 4 }),
      b: StyleSheet.extend('a', { color: 'blue' }),
    });
    expectTypeOf(sheet.a.padding).toEqualTypeOf<4>();
    expectTypeOf(sheet.a.color).toEqualTypeOf<'blue'>();
    expectTypeOf(sheet.b.padding).toEqualTypeOf<4>();
    expectTypeOf(sheet.b.color).toEqualTypeOf<'blue'>();
  } finally {
    warning.mockRestore();
  }
});

it('bounds deep inheritance types without limiting runtime resolution', () => {
  const sheet = StyleSheet.create({
    base: { width: 10 },
    a: StyleSheet.extend('base'),
    b: StyleSheet.extend('a'),
    c: StyleSheet.extend('b'),
    d: StyleSheet.extend('c'),
    e: StyleSheet.extend('d'),
    f: StyleSheet.extend('e'),
    g: StyleSheet.extend('f'),
    h: StyleSheet.extend('g'),
    i: StyleSheet.extend('h'),
    j: StyleSheet.extend('i'),
    k: StyleSheet.extend('j'),
    l: StyleSheet.extend('k'),
    m: StyleSheet.extend('l'),
    n: StyleSheet.extend('m'),
    o: StyleSheet.extend('n'),
    p: StyleSheet.extend('o'),
    q: StyleSheet.extend('p'),
  });
  expectTypeOf(sheet.q.width).toEqualTypeOf<ViewStyles['width']>();
  expect(sheet.q.width).toBe(10);
});

it('retains inherited values when later optional properties are absent', () => {
  const optional: { color?: 'blue' } = {};
  const sheet = StyleSheet.create({
    base: { color: 'red' },
    parent: StyleSheet.extend(['base', optional]),
    override: StyleSheet.extend('base', optional),
  });
  expectTypeOf(sheet.parent.color).toEqualTypeOf<'red' | 'blue' | undefined>();
  expectTypeOf(sheet.override.color).toEqualTypeOf<
    'red' | 'blue' | undefined
  >();
  expectTypeOf<
    typeof sheet.parent extends { color: unknown } ? true : false
  >().toEqualTypeOf<true>();
  expect(sheet.parent.color).toBe('red');
  expect(sheet.override.color).toBe('red');
});

it('models both branches of union object parents', () => {
  const create = (parent: { color: 'blue' } | { padding: 8 }) =>
    StyleSheet.create({
      base: { color: 'red' },
      child: StyleSheet.extend(['base', parent]),
    });
  const sheet = create({ color: 'blue' });
  expectTypeOf(sheet.child.color).toEqualTypeOf<'red' | 'blue'>();
  expect(sheet.child.color).toBe('blue');
});

it('handles optional parent tuples and dynamic mixed arrays', () => {
  const create = (parents: readonly ['base', { color: 'blue' }?]) =>
    StyleSheet.create({
      base: { color: 'red' },
      child: StyleSheet.extend(parents),
    });
  const sheet = create(['base']);
  expectTypeOf(sheet.child.color).toEqualTypeOf<'red' | 'blue'>();
  expect(sheet.child.color).toBe('red');

  const parents: (string | { opacity: number })[] = ['base', { opacity: 0.5 }];
  const dynamic = StyleSheet.create({
    base: { color: 'red' },
    child: StyleSheet.extend(parents),
  });
  expectTypeOf(dynamic.child.opacity).toEqualTypeOf<number | undefined>();
  expect(dynamic.child.opacity).toBe(0.5);
  const checkErrors = (invalid: readonly ['base', 'missing'?]) => {
    // @ts-expect-error optional parent keys are checked too
    StyleSheet.create({
      base: { color: 'red' },
      child: StyleSheet.extend(invalid),
    });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('supports custom union schemas without permitting mixed variants', () => {
  type CustomStyle =
    | { kind?: 'size'; size?: number }
    | { kind?: 'tone'; tone?: 'warm' | 'cool' };
  const create = StyleSheet.create<CustomStyle>();
  const sheet = create({
    sized: { kind: 'size', size: 12 },
    toned: { kind: 'tone', tone: 'warm' },
  });
  expectTypeOf(sheet.sized.size).toEqualTypeOf<12>();
  expectTypeOf(sheet.toned.tone).toEqualTypeOf<'warm'>();
  const checkErrors = () => {
    // @ts-expect-error properties must belong to the selected union variant
    create({ mixed: { kind: 'size', tone: 'warm' } });
    // @ts-expect-error unrelated properties are still rejected
    create({ wrong: { kind: 'tone', other: true } });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

it('keeps numeric keys compatible and rejects non-style entries', () => {
  const sheet = StyleSheet.create({
    0: { width: 12 },
    child: StyleSheet.extend('0'),
  });
  expectTypeOf(sheet.child.width).toEqualTypeOf<12>();
  const checkErrors = () => {
    // @ts-expect-error style entries are property objects, not callable values
    StyleSheet.create({ callable: () => ({ width: 10 }) });
    // @ts-expect-error object parents cannot be callable values
    StyleSheet.extend(() => ({ width: 10 }));
    // @ts-expect-error overrides cannot be callable values
    StyleSheet.extend('base', () => ({ width: 10 }));
    // @ts-expect-error create resolves individual entries; arrays belong in style props
    StyleSheet.create({ array: [{ width: 10 }] });
    const key = Symbol('style');
    // @ts-expect-error symbols are not enumerated by the stylesheet runtime
    StyleSheet.create({ [key]: { width: 10 } });
  };
  expectTypeOf(checkErrors).toBeFunction();
});

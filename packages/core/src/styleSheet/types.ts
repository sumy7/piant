/**
 * A style reference for inheritance, created by `StyleSheet.extend()`.
 * Used to declare that a style inherits from one or more parent styles.
 */
export interface StyleReference<
  T extends object = object,
  TParents extends readonly (string | Partial<T> | undefined)[] = readonly (
    | string
    | Partial<T>
  )[],
  TOverride extends Partial<T> = Partial<T>,
> {
  readonly __isStyleRef: true;
  readonly parents: TParents;
  readonly style: TOverride;
}

/**
 * A flexible style value accepted by component `style` props.
 * Supports plain style objects, arrays (including nested), and falsy values
 * (`false`, `null`, `undefined`) which are ignored during flattening.
 *
 * @example
 * ```ts
 * const style: StyleValue<ViewStyles> = [
 *   styles.base,
 *   isActive && styles.active,
 *   props.style,
 * ];
 * ```
 */
export type StyleValue<T extends object = object> =
  | Partial<T>
  | StyleValue<T>[]
  // Keep mutable initializers narrowed to the mutable branch so existing
  // StyleValue-annotated arrays retain push(), while accepting readonly inputs.
  | (readonly StyleValue<T>[] & { readonly push?: never })
  | false
  | null
  | undefined;

/**
 * A single entry accepted by `StyleSheet.create`.
 * Either a plain partial style object, or a `StyleReference` created by `StyleSheet.extend`.
 */
export type StyleEntry<T extends object> = Partial<T> | StyleReference<T>;

/**
 * Shorthand for `Partial<T>` — a plain style object with all properties optional.
 *
 * @example
 * ```ts
 * const style: StyleObject<ViewStyles> = { padding: 12, flex: 1 };
 * ```
 */
export type StyleObject<T extends object> = Partial<T>;

/**
 * The shape of an object passed to `StyleSheet.create`.
 * Maps style keys to either plain style objects or `StyleReference` inheritance declarations.
 *
 * @example
 * ```ts
 * const def: StyleSheetDefinition<ViewStyles> = {
 *   base: { padding: 12 },
 *   primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
 * };
 * ```
 */
export type StyleSheetDefinition<T extends object> = Record<
  string,
  StyleEntry<T>
>;

/**
 * Computes the resolved output type of `StyleSheet.create`.
 * Plain entries retain their exact type. References merge parents from left to
 * right, then apply the child override, matching runtime inheritance resolution.
 * Dynamic parent arrays and very deep chains use the selected style schema as
 * a conservative fallback instead of claiming that a property is present.
 */
type OptionalKeys<T> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never;
}[keyof T];

// Optional right-hand properties may be absent at runtime. In that case the
// left-hand value survives the spread; required right-hand properties replace it.
type MergeOne<Left, Right> = Omit<Left, keyof Right> & {
  [K in keyof Left as K extends OptionalKeys<Right> ? K : never]:
    | Left[K]
    | (K extends keyof Right ? Right[K] : never);
} & Omit<Right, Extract<keyof Left, OptionalKeys<Right>>>;

type Merge<Left, Right> = Left extends unknown
  ? Right extends unknown
    ? MergeOne<Left, Right>
    : never
  : never;

type ParentKey<Parent, Definition> = Parent extends keyof Definition
  ? Parent
  : Parent extends `${infer NumericKey extends number}`
    ? Extract<NumericKey, keyof Definition>
    : never;

type ResolveParent<
  Parent,
  Definition,
  Style,
  Seen,
  Depth extends unknown[],
> = Parent extends string
  ? string extends Parent
    ? Partial<Style>
    : ParentKey<Parent, Definition> extends Seen
      ? Record<never, never>
      : ParentKey<Parent, Definition> extends never
        ? Record<never, never>
        : ParentKey<Parent, Definition> extends keyof Definition
          ? ResolveStyleEntry<
              Definition[ParentKey<Parent, Definition>],
              Definition,
              Style,
              Seen | ParentKey<Parent, Definition>,
              [...Depth, unknown]
            >
          : Record<never, never>
  : Parent extends object
    ? Parent
    : Record<never, never>;

type ResolveParents<
  Parents extends readonly unknown[],
  Definition,
  Style,
  Seen,
  Depth extends unknown[],
  Result = Record<never, never>,
> = number extends Parents['length']
  ? Partial<Style>
  : Parents extends readonly [infer Parent, ...infer Rest]
    ? ResolveParents<
        Rest,
        Definition,
        Style,
        Seen,
        Depth,
        Merge<Result, ResolveParent<Parent, Definition, Style, Seen, Depth>>
      >
    : Parents extends readonly []
      ? Result
      : Parents extends readonly [Parent?: infer Parent, ...infer Rest]
        ?
            | Result
            | ResolveParents<
                Rest,
                Definition,
                Style,
                Seen,
                Depth,
                Merge<
                  Result,
                  ResolveParent<Parent, Definition, Style, Seen, Depth>
                >
              >
        : Result;

type ResolveStyleEntry<
  Entry,
  Definition,
  Style,
  Seen,
  Depth extends unknown[],
> = Depth['length'] extends 16
  ? Partial<Style>
  : Entry extends {
        readonly __isStyleRef: true;
        readonly parents: infer Parents extends readonly unknown[];
        readonly style: infer Override;
      }
    ? Merge<ResolveParents<Parents, Definition, Style, Seen, Depth>, Override>
    : Entry;

export type ResolvedStyleSheet<
  T extends Record<string, object>,
  TStyle extends object = object,
> = {
  [K in keyof T]: ResolveStyleEntry<T[K], T, TStyle, K, []>;
};

/** Reject unknown keys while retaining the inferred object and its literals. */
export type ValidateStyle<TStyle extends object, Actual> = Actual extends
  | readonly unknown[]
  | ((...args: never[]) => unknown)
  ? never
  : TStyle extends unknown
    ? Actual &
        Partial<TStyle> &
        Record<Exclude<keyof Actual, keyof TStyle>, never>
    : never;

export type StyleParents<TStyle extends object> =
  | string
  | Partial<TStyle>
  | readonly (string | Partial<TStyle>)[];

export type ParentList<
  Parents,
  TStyle extends object,
> = Parents extends readonly (string | Partial<TStyle> | undefined)[]
  ? Parents
  : readonly [Extract<Parents, string | Partial<TStyle>>];

type ValidateParent<TStyle extends object, Parent> = Parent extends
  | string
  | undefined
  ? Parent
  : ValidateStyle<TStyle, Parent>;

export type ValidateParents<
  TStyle extends object,
  Parents,
> = Parents extends readonly unknown[]
  ? {
      [K in keyof Parents]: ValidateParent<TStyle, Parents[K]>;
    }
  : Parents extends string
    ? Parents
    : ValidateStyle<TStyle, Parents>;

type ValidateParentKey<Parent, Keys> = Parent extends string
  ? string extends Parent
    ? Parent
    : Parent extends Keys | `${Extract<Keys, number>}`
      ? Parent
      : never
  : Parent;

type ValidateParentKeys<Parents extends readonly unknown[], Keys> = {
  [K in keyof Parents]: ValidateParentKey<Parents[K], Keys>;
};

export type ValidateDefinition<TStyle extends object, Definition> = {
  [K in keyof Definition]: K extends symbol
    ? never
    : Definition[K] extends {
          readonly __isStyleRef: true;
          readonly parents: infer Parents extends readonly unknown[];
          readonly style: infer Override;
        }
      ? Definition[K] & {
          readonly parents: ValidateParents<TStyle, Parents> &
            ValidateParentKeys<Parents, keyof Definition>;
          readonly style: ValidateStyle<TStyle, Override>;
        }
      : ValidateStyle<TStyle, Definition[K]>;
};

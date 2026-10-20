import type { StyleValue } from './types';

type IgnoredStyle = false | null | undefined;
type IsAny<T> = 0 extends 1 & T ? true : false;
type RuntimeFunction =
  | ((...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown);
type NonArrayStyleObject<T> = T extends
  | IgnoredStyle
  | readonly unknown[]
  | RuntimeFunction
  ? never
  : T extends object
    ? T
    : never;

type ValidateInferredStyle<
  T,
  Depth extends readonly unknown[] = [],
> = Depth['length'] extends 8
  ? T
  : T extends IgnoredStyle
    ? T
    : T extends RuntimeFunction
      ? never
      : T extends readonly unknown[]
        ? number extends T['length']
          ? readonly ValidateInferredStyle<
              T[number],
              readonly [...Depth, unknown]
            >[]
          : {
              readonly [Key in keyof T]: ValidateInferredStyle<
                T[Key],
                readonly [...Depth, unknown]
              >;
            }
        : T extends object
          ? T
          : never;

type ValidDirectStyle<T extends object> = T extends
  | readonly unknown[]
  | RuntimeFunction
  ? never
  : unknown;

type ValidStyleSchema<T extends object> =
  ValidDirectStyle<T> extends never
    ? never
    : keyof T extends never
      ? never
      : unknown;

type StyleObjects<T, Depth extends readonly unknown[] = []> =
  IsAny<T> extends true
    ? Readonly<Record<PropertyKey, unknown>>
    : Depth['length'] extends 8
      ? NonArrayStyleObject<T>
      : T extends readonly (infer Item)[]
        ? StyleObjects<Item, readonly [...Depth, unknown]>
        : NonArrayStyleObject<T>;

type UnionKeys<T> = T extends T ? keyof T : never;

type MergedStyle<T> = [T] extends [never]
  ? object
  : {
      [Key in UnionKeys<T>]?: T extends T
        ? Key extends keyof T
          ? T[Key]
          : never
        : never;
    };

type FlattenedStyle<T> = T extends IgnoredStyle
  ? undefined
  : T extends readonly unknown[]
    ? MergedStyle<StyleObjects<T>>
    : T extends object
      ? T
      : never;

/**
 * Flattens an array (or nested arrays) of plain style objects into one merged
 * object. Later entries override earlier ones. Falsy values (`null`,
 * `undefined`, `false`) and non-object inputs are silently ignored.
 *
 * Scope: `flattenStyle` only expands **array nesting**. It does **not** process
 * `StyleReference` inheritance declarations — those are resolved at
 * `StyleSheet.create` time before any flattening occurs.
 *
 * Use `StyleSheet.resolve` when you need a single entry point that handles
 * any `StyleValue` shape (plain object, array, falsy).
 */
function flattenStyle<const T extends readonly (object | IgnoredStyle)[]>(
  style: T & ValidateInferredStyle<T>,
): FlattenedStyle<T>;
function flattenStyle<const T extends object, const Input extends T>(
  style: Input & ValidDirectStyle<Input>,
): Input;
function flattenStyle(): undefined;
function flattenStyle(style: IgnoredStyle): undefined;
function flattenStyle<T extends object>(
  style: StyleValue<T> &
    (object | IgnoredStyle) &
    ValidStyleSchema<T>,
): Partial<T> | undefined;
function flattenStyle<const Input>(
  style: Input &
    ([StyleValue<object>] extends [Input] ? unknown : never) &
    (object | IgnoredStyle),
): Partial<object> | undefined;
function flattenStyle<T extends object = never>(
  style: StyleValue<NoInfer<T>> & (object | IgnoredStyle),
): Partial<T> | undefined;
function flattenStyle(style?: unknown): object | undefined {
  return flattenUnknownStyle(style);
}

function flattenUnknownStyle(style: unknown): object | undefined {
  if (style === null || typeof style !== 'object') {
    return undefined;
  }

  if (!Array.isArray(style)) {
    return style;
  }

  const result: Record<string, unknown> = {};
  for (let i = 0, styleLength = style.length; i < styleLength; ++i) {
    const computedStyle = flattenUnknownStyle(style[i]);
    if (computedStyle) {
      for (const key in computedStyle) {
        result[key] = computedStyle[key as keyof typeof computedStyle];
      }
    }
  }
  return result;
}

export default flattenStyle;

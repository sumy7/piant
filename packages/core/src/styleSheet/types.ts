/**
 * A style reference for inheritance, created by `StyleSheet.extend()`.
 * Used to declare that a style inherits from one or more parent styles.
 */
export interface StyleReference<T extends object = object> {
  readonly __isStyleRef: true;
  readonly parents: readonly (string | Partial<T>)[];
  readonly style: Partial<T>;
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
export type StyleSheetDefinition<T extends object> = Record<string, StyleEntry<T>>;

/**
 * Computes the resolved output type of `StyleSheet.create`.
 * Each `StyleReference<S>` entry maps to `Partial<S>`; plain style object entries keep their type.
 */
export type ResolvedStyleSheet<T extends Record<string, StyleEntry<any>>> = {
  [K in keyof T]: T[K] extends StyleReference<infer S> ? Partial<S> : T[K];
};

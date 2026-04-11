/**
 * A style reference for inheritance, created by `StyleSheet.extend()`.
 * Used to declare that a style inherits from one or more parent styles.
 */
export interface StyleReference<T extends object = object> {
  readonly __isStyleRef: true;
  readonly parents: Array<string | Partial<T>>;
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

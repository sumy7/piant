/**
 * Combines two **already-flattened** style objects such that `style2` will
 * override any styles in `style1`.
 *
 * If either argument is falsy the other is returned without allocating a new
 * array, preserving reference equality (useful for PureComponent / memo checks).
 *
 * When both are present an `[style1, style2]` tuple is returned; pass it to
 * `StyleSheet.flatten` or `StyleSheet.resolve` to obtain a single merged object.
 *
 * Limitation: `compose` only accepts plain (already-flat) style objects. It
 * does not handle arrays, `StyleReference` values, or other nested `StyleValue`
 * shapes. Use `StyleSheet.resolve` for those cases.
 */
export default function composeStyles<T extends object = object>(
  style1?: Partial<T> | null,
  style2?: Partial<T> | null,
): Partial<T> | [Partial<T>, Partial<T>] | undefined {
  if (!style1) {
    return style2 ?? undefined;
  }
  if (!style2) {
    return style1;
  }
  return [style1, style2];
}

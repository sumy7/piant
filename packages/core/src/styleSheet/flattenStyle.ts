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
function flattenStyle(style?: any): any {
  if (style === null || typeof style !== 'object') {
    return undefined;
  }

  if (!Array.isArray(style)) {
    return style;
  }

  const result: Record<string, any> = {};
  for (let i = 0, styleLength = style.length; i < styleLength; ++i) {
    const computedStyle = flattenStyle(style[i]);
    if (computedStyle) {
      for (const key in computedStyle) {
        result[key] = computedStyle[key];
      }
    }
  }
  return result;
}

export default flattenStyle;

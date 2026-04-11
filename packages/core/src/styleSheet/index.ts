import type { ViewStyles } from '../elements/layout/viewStyles';
import composeStyles from './composeStyles';
import flatten from './flattenStyle';
import type { StyleEntry, StyleReference, StyleValue } from './types';

export type { StyleEntry, StyleReference, StyleValue } from './types';

function isStyleRef<T extends object>(x: unknown): x is StyleReference<T> {
  return x != null && typeof x === 'object' && (x as StyleReference<T>).__isStyleRef === true;
}

function resolveEntry<T extends object>(
  entry: StyleEntry<T>,
  definition: Record<string, StyleEntry<T>>,
  visited: Set<string>,
): Partial<T> {
  if (!isStyleRef(entry)) return entry;
  let merged: Partial<T> = {};
  for (const parent of entry.parents) {
    if (typeof parent === 'string') {
      if (visited.has(parent)) continue;
      const parentEntry = definition[parent];
      if (parentEntry) {
        const inner = new Set(visited);
        inner.add(parent);
        merged = { ...merged, ...resolveEntry(parentEntry, definition, inner) };
      }
    } else {
      merged = { ...merged, ...parent };
    }
  }
  return { ...merged, ...entry.style };
}

/**
 * A StyleSheet is an abstraction similar to CSS StyleSheets.
 *
 * Create a new StyleSheet:
 *
 * ```
 * const styles = StyleSheet.create({
 *   container: {
 *     borderRadius: 4,
 *     borderWidth: 0.5,
 *     borderColor: '#d6d7da',
 *   },
 *   title: {
 *     fontSize: 19,
 *     fontWeight: 'bold',
 *   },
 *   activeTitle: StyleSheet.extend('title', {
 *     color: 'red',
 *   }),
 * });
 * ```
 *
 * Use a StyleSheet:
 *
 * ```
 * <View style={styles.container}>
 *   <Text style={[styles.title, this.props.isActive && styles.activeTitle]} />
 * </View>
 * ```
 */
export const StyleSheet = {
  /**
   * Combines two styles such that `style2` will override any styles in `style1`.
   * If either style is falsy, the other one is returned without allocating an
   * array, saving allocations and maintaining reference equality for
   * PureComponent checks.
   */
  compose: composeStyles,

  /**
   * Flattens an array of style objects into one aggregated style object.
   * Later entries override earlier ones. Falsy values are ignored.
   *
   * @example
   * ```
   * StyleSheet.flatten([styles.listItem, styles.selectedListItem])
   * // returns { flex: 1, fontSize: 16, color: 'green' }
   * ```
   */
  flatten,

  /**
   * Creates a typed style sheet. Entries may be plain style objects or
   * `StyleReference` values created with `StyleSheet.extend` — the latter are
   * resolved eagerly so the returned object always contains plain style objects.
   *
   * @example
   * ```ts
   * const styles = StyleSheet.create({
   *   base: { padding: 12, borderRadius: 8 },
   *   primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
   * });
   * ```
   */
  create<T extends object = ViewStyles>(
    obj: Record<string, StyleEntry<T>>,
  ): Record<string, Partial<T>> {
    const result: Record<string, Partial<T>> = {};
    for (const key in obj) {
      const entry = obj[key]!;
      if (isStyleRef<T>(entry)) {
        result[key] = resolveEntry(entry, obj, new Set([key]));
      } else {
        result[key] = entry;
      }
    }
    return result;
  },

  /**
   * Creates a style inheritance reference for use inside `StyleSheet.create`.
   * The child style inherits all properties from its parents and overrides them
   * with its own values.
   *
   * - Single parent by key: `StyleSheet.extend('base', { color: 'red' })`
   * - Multiple parents: `StyleSheet.extend(['rounded', 'elevated'], { backgroundColor: '#fff' })`
   * - From a standalone style object: `StyleSheet.extend(baseStyle, { color: 'red' })`
   *
   * When multiple parents are provided, they are merged left-to-right (later
   * parents override earlier ones), and the child's own properties are applied last.
   */
  extend<T extends object = ViewStyles>(
    parents: string | Array<string | Partial<T>> | Partial<T>,
    override: Partial<T> = {} as Partial<T>,
  ): StyleReference<T> {
    const parentArr: Array<string | Partial<T>> = Array.isArray(parents)
      ? (parents as Array<string | Partial<T>>)
      : [parents as string | Partial<T>];
    return {
      __isStyleRef: true,
      parents: parentArr,
      style: override,
    };
  },

  /**
   * Resolves a `StyleValue` (which may be a plain object, an array, or falsy)
   * into a single flat style object. Equivalent to `flatten` but semantically
   * describes the intent to fully resolve a style before consuming it.
   *
   * @example
   * ```ts
   * const resolved = StyleSheet.resolve([styles.base, isActive && styles.active]);
   * ```
   */
  resolve<T extends object = ViewStyles>(
    style: StyleValue<T>,
  ): Partial<T> | undefined {
    return flatten(style) as Partial<T> | undefined;
  },
};

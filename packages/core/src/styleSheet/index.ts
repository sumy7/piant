import type { ViewStyles } from '../elements/layout/viewStyles';
import composeStyles from './composeStyles';
import flatten from './flattenStyle';
import type {
  ResolvedStyleSheet,
  StyleEntry,
  StyleReference,
  StyleValue,
} from './types';

export type {
  StyleEntry,
  StyleObject,
  StyleReference,
  StyleSheetDefinition,
  StyleValue,
} from './types';

function isStyleRef<T extends object>(x: unknown): x is StyleReference<T> {
  return x != null && typeof x === 'object' && (x as StyleReference<T>).__isStyleRef === true;
}

function resolveEntry<T extends object>(
  entry: StyleEntry<T>,
  definition: Record<string, StyleEntry<T>>,
  visited: Set<string>,
  chain: string[],
): Partial<T> {
  if (!isStyleRef(entry)) return entry;
  let merged: Partial<T> = {};
  for (const parent of entry.parents) {
    if (typeof parent === 'string') {
      if (visited.has(parent)) {
        console.warn(
          `[StyleSheet] Circular style inheritance detected: ${[...chain, parent].join(' → ')}. Parent "${parent}" will be skipped.`,
        );
        continue;
      }
      const parentEntry = definition[parent];
      if (parentEntry) {
        const inner = new Set(visited);
        inner.add(parent);
        merged = { ...merged, ...resolveEntry(parentEntry, definition, inner, [...chain, parent]) };
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
   * Combines two **already-flattened** style objects such that `style2` will
   * override any styles in `style1`. If either style is falsy, the other one is
   * returned without allocating an array, saving allocations and maintaining
   * reference equality for PureComponent checks.
   *
   * Note: `compose` only handles plain (already-flat) style objects. If your
   * input may be arrays, `StyleReference` values, or other `StyleValue` shapes,
   * use `StyleSheet.resolve` instead.
   */
  compose: composeStyles,

  /**
   * Flattens an array of **plain style objects** (and nested arrays thereof)
   * into one aggregated style object. Later entries override earlier ones.
   * Falsy values (`null`, `undefined`, `false`) are ignored.
   *
   * Scope: `flatten` only expands array nesting — it does **not** process
   * `StyleReference` inheritance declarations. For full style resolution
   * including inheritance, use `StyleSheet.resolve`.
   *
   * @example
   * ```
   * StyleSheet.flatten([styles.listItem, styles.selectedListItem])
   * // returns { flex: 1, fontSize: 16, color: 'green' }
   * ```
   */
  flatten,

  /**
   * Creates a typed style sheet. All keys from the input object are preserved
   * in the returned type. Entries may be plain style objects or `StyleReference`
   * values created with `StyleSheet.extend` — the latter are resolved eagerly so
   * the returned object always contains plain style objects ready for use.
   *
   * Circular inheritance chains are detected at creation time: the circular
   * edge is skipped and a warning is logged so the issue is visible during
   * development.
   *
   * @example
   * ```ts
   * const styles = StyleSheet.create({
   *   base: { padding: 12, borderRadius: 8 },
   *   primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
   * });
   * // styles.base    => { padding: 12, borderRadius: 8 }
   * // styles.primary => { padding: 12, borderRadius: 8, backgroundColor: '#0055ff' }
   * ```
   */
  create<T extends Record<string, StyleEntry<any>>>(
    obj: T,
  ): ResolvedStyleSheet<T> {
    const result = {} as ResolvedStyleSheet<T>;
    for (const key in obj) {
      const entry = obj[key]!;
      if (isStyleRef(entry)) {
        (result as Record<string, unknown>)[key] = resolveEntry(
          entry,
          obj,
          new Set([key]),
          [key],
        );
      } else {
        (result as Record<string, unknown>)[key] = entry;
      }
    }
    return result;
  },

  /**
   * Creates a style inheritance reference for use inside `StyleSheet.create`.
   * The child style inherits all properties from its parents and overrides them
   * with its own values.
   *
   * **Recommended usage — inherit by key name (within the same `create` call):**
   * ```ts
   * StyleSheet.extend('base', { color: 'red' })
   * ```
   *
   * **Multiple parents (merged left-to-right, child wins):**
   * ```ts
   * StyleSheet.extend(['rounded', 'elevated'], { backgroundColor: '#fff' })
   * ```
   *
   * **Advanced — inherit from a standalone style object (mixin-style):**
   * This skips the key-based lookup and merges the object directly.
   * Prefer key-based inheritance for clarity; reserve object parents for
   * one-off style reuse outside a `create` definition.
   * ```ts
   * StyleSheet.extend(baseStyleObject, { color: 'red' })
   * ```
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
   * Resolves any `StyleValue` — a plain object, an array (including nested
   * arrays), or falsy values — into a single flat style object. Falsy entries
   * (`false`, `null`, `undefined`) are ignored.
   *
   * Use this as the single entry point for consuming styles at runtime. Unlike
   * `flatten`, the name makes the intent explicit: "give me the final, merged
   * style object I can hand to the renderer."
   *
   * Note: `resolve` operates on already-expanded style objects (output of
   * `StyleSheet.create`). It does not process raw `StyleReference` inheritance
   * declarations — those are resolved eagerly inside `StyleSheet.create`.
   *
   * @example
   * ```ts
   * const resolved = StyleSheet.resolve([styles.base, isActive && styles.active, props.style]);
   * ```
   */
  resolve<T extends object = ViewStyles>(
    style: StyleValue<T>,
  ): Partial<T> | undefined {
    return flatten(style) as Partial<T> | undefined;
  },
};


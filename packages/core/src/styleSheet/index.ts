import type { ViewStyles } from '../elements/layout/viewStyles';
import composeStyles from './composeStyles';
import flatten from './flattenStyle';

/**
 * A StyleSheet is an abstraction similar to CSS StyleSheets
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
 *   activeTitle: {
 *     color: 'red',
 *   },
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
 *
 * Code quality:
 *
 *  - By moving styles away from the render function, you're making the code
 *    easier to understand.
 *  - Naming the styles is a good way to add meaning to the low level components
 *  in the render function, and encourage reuse.
 *  - In most IDEs, using `StyleSheet.create()` will offer static type checking
 *  and suggestions to help you write valid styles.
 *
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
   * Flattens an array of style objects, into one aggregated style object.
   *
   * Example:
   * ```
   * const styles = StyleSheet.create({
   *   listItem: {
   *     flex: 1,
   *     fontSize: 16,
   *     color: 'white'
   *   },
   *   selectedListItem: {
   *     color: 'green'
   *   }
   * });
   *
   * StyleSheet.flatten([styles.listItem, styles.selectedListItem])
   * // returns { flex: 1, fontSize: 16, color: 'green' }
   * ```
   */
  flatten,

  /**
   * An identity function for creating style sheets.
   */
  create(obj: Record<string, ViewStyles>): Record<string, ViewStyles> {
    return obj;
  },
};

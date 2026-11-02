import {
  attachDOMElement,
  createEffect,
  createState,
  onCleanup,
  ScrollView,
  type StyleValue,
  type ViewStyles,
} from '@piant/core';
import { createFocusable } from '../../primitives/createFocusable';
import { useUITheme } from '../../theme/UIProvider';

/** A separate scroll stop keeps clipped fields reachable without changing Tab order. */
export function createScrollableBody(options: {
  label: string;
  children: JSX.Element;
}) {
  const theme = useUITheme();
  const [overflow, setOverflow] = createState(false);
  const [focused, setFocused] = createState(false);
  const node = ScrollView({
    get style(): StyleValue<ViewStyles> {
      return {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        borderWidth: 2,
        borderColor: focused() ? theme().colors.focusRing : 'transparent',
      };
    },
    children: options.children,
  });
  const element = document.createElement('div');
  element.setAttribute('role', 'region');
  element.style.cssText = 'opacity:0;pointer-events:none;';
  const binding = attachDOMElement(node, element);
  const maximum = () =>
    Math.max(
      0,
      node.scrollContent._layoutNode.getComputedHeight() -
        node.scrollContentHolder._layoutNode.getComputedHeight(),
    );
  onCleanup(node.observeLayout(() => setOverflow(maximum() > 1)));
  const focus = createFocusable(node, {
    domElement: binding,
    get name() {
      return options.label;
    },
    description:
      'Use Page Up, Page Down, arrow keys, Home or End to scroll, then Tab to reach visible controls.',
    // Other controls retain their logical order. This entry is last and is
    // omitted entirely when there is no scrolling to perform.
    order: 1,
    get hidden() {
      return !overflow();
    },
    onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const height = node.scrollContentHolder._layoutNode.getComputedHeight();
      const line = theme().typography.lineHeight;
      const delta =
        event.key === 'PageDown'
          ? -height * 0.8
          : event.key === 'PageUp'
            ? height * 0.8
            : event.key === 'ArrowDown'
              ? -line
              : event.key === 'ArrowUp'
                ? line
                : undefined;
      if (delta === undefined && event.key !== 'Home' && event.key !== 'End')
        return;
      event.preventDefault();
      node.scrollY =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? -maximum()
            : Math.max(-maximum(), Math.min(0, node.scrollY + (delta ?? 0)));
      node.update();
    },
  });
  createEffect(() => setFocused(focus.focusVisible()));
  return node;
}

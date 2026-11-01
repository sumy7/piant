import {
  attachDOMElement,
  createEffect,
  createState,
  type Getter,
  onCleanup,
  type PNode,
  Show,
  type StyleValue,
  Text,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import {
  createFocusable,
  type FocusableState,
} from '../../primitives/createFocusable';
import { createPressable } from '../../primitives/createPressable';
import {
  getFocusScope,
  type RovingFocusGroup,
} from '../../primitives/focusScope';
import { useUITheme } from '../../theme/UIProvider';

export type PanelMountStrategy = 'unmount' | 'lazy' | 'keepMounted';
export interface DisclosureItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly children: () => unknown;
}

let nextId = 0;
export function compositeId(prefix = 'panel') {
  return `piant-${prefix}-${++nextId}`;
}

export function validateDisclosureItems(items: readonly DisclosureItem[]) {
  const values = new Set<string>();
  for (const item of items) {
    if (!item.value.trim() || values.has(item.value))
      throw new Error('Disclosure item values must be non-empty and unique.');
    if (!item.label.trim())
      throw new Error('Disclosure items require non-empty labels.');
    values.add(item.value);
  }
  return items;
}

export interface CompositeTriggerOptions {
  label: string;
  role?: 'button' | 'tab';
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  id: string;
  controls: string;
  group?: RovingFocusGroup;
  onActivate(): void;
  onKeyDown?: (event: KeyboardEvent) => void;
  style?: StyleValue<ViewStyles>;
  headingLevel?: number;
}

export function createCompositeTrigger(options: CompositeTriggerOptions): {
  node: PNode;
  focus: FocusableState;
} {
  const theme = useUITheme();
  const [visual, setVisual] = createState({
    hovered: false,
    pressed: false,
    focus: false,
  });
  const node = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          minHeight: theme().controlSize.md,
          paddingInline: theme().spacing.md,
          paddingBlock: theme().spacing.xs,
          borderWidth: 2,
          borderColor: visual().focus
            ? theme().colors.focusRing
            : 'transparent',
          borderRadius: theme().radius.md,
          backgroundColor:
            visual().pressed || options.selected
              ? theme().colors.primary
              : visual().hovered
                ? theme().colors.surfaceRaised
                : theme().colors.surface,
          opacity: options.disabled ? 0.5 : 1,
        },
        options.style,
      ]}
    >
      <Text
        style={{
          fontFamily: theme().typography.fontFamily,
          fontSize: theme().typography.fontSize,
          lineHeight: theme().typography.lineHeight,
          color: options.selected
            ? theme().colors.onPrimary
            : theme().colors.text,
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        {options.label}
      </Text>
    </View>
  ) as PNode;
  const activate = () => {
    if (!options.disabled && !node.isDestroyed) options.onActivate();
  };
  const press = createPressable(node, {
    get disabled() {
      return options.disabled;
    },
    onPress: activate,
  });
  const focus = createFocusable(node, {
    get role() {
      return options.role ?? 'button';
    },
    get name() {
      return options.label;
    },
    get selected() {
      return options.selected;
    },
    get expanded() {
      return options.expanded;
    },
    get disabled() {
      return options.disabled;
    },
    group: options.group,
    onActivate: activate,
    onKeyDown: (event) => options.onKeyDown?.(event),
  });
  createEffect(() => {
    if (!node.isDestroyed)
      setVisual({
        hovered: press.hovered(),
        pressed: press.pressed() || focus.pressed(),
        focus: focus.focusVisible(),
      });
  });
  createEffect(() => {
    focus.element.id = options.id;
    focus.element.setAttribute('aria-controls', options.controls);
  });
  if (options.headingLevel !== undefined) {
    const heading = document.createElement('div');
    const binding = attachDOMElement(node, heading);
    const release = getFocusScope().registerRegion(node, binding);
    onCleanup(release);
    node.onDestroy(release);
    createEffect(() => {
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', String(options.headingLevel ?? 3));
      semanticContainerStyle(heading, true);
    });
  }
  return { node, focus };
}

function semanticContainerStyle(element: HTMLElement, active: boolean) {
  element.style.position = 'static';
  element.style.pointerEvents = 'none';
  element.style.width = '0';
  element.style.height = '0';
  // DOM binding sync writes the node's dimensions again on layout; these caps
  // keep the semantic block out of document layout without clipping its children.
  element.style.maxWidth = '0';
  element.style.maxHeight = '0';
  element.style.overflow = 'visible';
  element.style.display = active ? 'block' : 'none';
}

export interface CompositePanelOptions {
  id: string;
  labelledBy: string;
  active: boolean;
  mountStrategy?: PanelMountStrategy;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  role?: 'tabpanel' | 'region';
  onBeforeHide?: () => void;
}

export function createCompositePanel(options: CompositePanelOptions): PNode {
  const theme = useUITheme();
  const scope = getFocusScope();
  const region = document.createElement('div');
  const [visited, setVisited] = createState(options.active);
  const [focusVisible, setFocusVisible] = createState(false);
  let node: PNode | undefined;
  let wasActive = options.active;
  function focusInside() {
    if (region.contains(region.ownerDocument.activeElement)) return true;
    return scope.entries.some((entry) => {
      if (entry.binding.element !== region.ownerDocument.activeElement)
        return false;
      for (
        let current: PNode | null = entry.node;
        current;
        current = current.parentNode
      )
        if (current === node) return true;
      return false;
    });
  }
  // Register before View's display effect so focused descendants can leave while
  // their trigger is still available and their content owner is still alive.
  createEffect(() => {
    const active = options.active;
    if (wasActive && !active && node && focusInside())
      untrack(() => options.onBeforeHide?.());
    wasActive = active;
    if (active) setVisited(true);
  });
  const mount = () =>
    options.mountStrategy === 'keepMounted' ||
    (options.mountStrategy === 'lazy' ? visited() : options.active);
  node = View({
    get style(): StyleValue<ViewStyles> {
      return [
        {
          flexDirection: 'column',
          minWidth: 0,
          padding: theme().spacing.md,
          borderWidth: options.role === 'tabpanel' ? 2 : 0,
          borderColor: focusVisible()
            ? theme().colors.focusRing
            : 'transparent',
        },
        options.style,
        { display: options.active ? 'flex' : 'none' },
      ];
    },
    children: Show({
      get when() {
        return mount();
      },
      children: (_active: Getter<boolean>) =>
        untrack(() => options.children()) as JSX.Element,
    }),
  }) as PNode;
  const binding = attachDOMElement(node, region);
  const unregister = scope.registerRegion(node, binding);
  onCleanup(unregister);
  node.onDestroy(unregister);
  if (options.role === 'tabpanel') {
    const focus = createFocusable(node, {
      domElement: binding,
      role: 'tabpanel',
      name: '',
      get hidden() {
        return !options.active;
      },
    });
    createEffect(() => setFocusVisible(focus.focusVisible()));
  }
  createEffect(() => {
    region.id = options.id;
    region.setAttribute('role', options.role ?? 'region');
    region.setAttribute('aria-labelledby', options.labelledBy);
    region.hidden = !options.active;
    region.inert = !options.active;
    semanticContainerStyle(region, options.active);
  });
  return node;
}

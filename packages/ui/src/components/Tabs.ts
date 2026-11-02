import {
  createEffect,
  createMemo,
  createState,
  For,
  type Getter,
  onCleanup,
  type PNode,
  type StyleValue,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import type { FocusableState } from '../primitives/createFocusable';
import {
  createRovingFocusGroup,
  getFocusScope,
} from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { componentRoot } from './internal/componentRoot';
import {
  compositeId,
  createCompositePanel,
  createCompositeTrigger,
  type DisclosureItem,
  type PanelMountStrategy,
  validateDisclosureItems,
} from './internal/compositeParts';

export interface TabsItem extends DisclosureItem {}
export interface TabsProps {
  label: string;
  items: readonly TabsItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  activationMode?: 'automatic' | 'manual';
  orientation?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  disabled?: boolean;
  mountStrategy?: PanelMountStrategy;
  style?: StyleValue<ViewStyles>;
  listStyle?: StyleValue<ViewStyles>;
  triggerStyle?: StyleValue<ViewStyles>;
  panelStyle?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}

/** Stable value keys pair each tab trigger with its own labelled panel. */
export function Tabs(props: TabsProps): Getter<PNode> {
  return componentRoot(() => renderTabs(props), props.ref);
}

function renderTabs(props: TabsProps): PNode {
  const scope = getFocusScope();
  const theme = useUITheme();
  const label = () => {
    const text = props.label?.trim();
    if (!text) throw new Error('Tabs requires a non-empty label.');
    return text;
  };
  label();
  const initial = validateDisclosureItems(props.items);
  const items = createMemo(() => validateDisclosureItems(props.items), initial);
  const keys = createMemo(
    () => items().map((item) => item.value),
    initial.map((item) => item.value),
  );
  const [value, setValue] = createControllableState<string | null>({
    get value() {
      return props.value;
    },
    defaultValue:
      props.defaultValue !== undefined
        ? props.defaultValue
        : (initial.find((item) => !item.disabled)?.value ?? null),
    onChange: (next) => props.onValueChange?.(next),
  });
  const selected = () => {
    const stored = value();
    if (stored === null) return null;
    const available = items().filter((item) => !item.disabled);
    return (
      available.find((item) => item.value === stored)?.value ??
      (props.value === undefined ? (available[0]?.value ?? null) : null)
    );
  };
  const emptyContent = () => undefined;
  const members = new Map<string, FocusableState>();
  const ids = new Map<string, { trigger: string; panel: string }>();
  const [revision, setRevision] = createState(0);
  const idFor = (key: string) => {
    let id = ids.get(key);
    if (!id) {
      id = { trigger: compositeId('tab'), panel: compositeId('tabpanel') };
      ids.set(key, id);
    }
    return id;
  };
  function select(key: string) {
    const item = items().find((item) => item.value === key);
    if (!props.disabled && item && !item.disabled) setValue(key);
  }
  const group = createRovingFocusGroup({
    role: 'tablist',
    get name() {
      return label();
    },
    get orientation() {
      return props.orientation ?? 'horizontal';
    },
    get dir() {
      return props.dir;
    },
  });
  function trigger(key: string) {
    return componentRoot(() => {
      const item = () => items().find((item) => item.value === key);
      const id = idFor(key);
      const part = createCompositeTrigger({
        id: id.trigger,
        controls: id.panel,
        role: 'tab',
        group,
        get label() {
          return item()?.label ?? key;
        },
        get selected() {
          return selected() === key;
        },
        get disabled() {
          return Boolean(props.disabled || !item() || item()?.disabled);
        },
        get style() {
          return props.triggerStyle;
        },
        onActivate: () => select(key),
      });
      members.set(key, part.focus);
      setRevision((next) => next + 1);
      onCleanup(() => {
        members.delete(key);
        ids.delete(key);
        setRevision((next) => next + 1);
      });
      // Native focus transitions select once; reactive metadata updates and
      // internal focus repair must not generate business selection requests.
      const onFocus = () => {
        if (!scope.recoveringFocus && props.activationMode !== 'manual')
          select(key);
      };
      part.focus.element.addEventListener('focus', onFocus);
      onCleanup(() => part.focus.element.removeEventListener('focus', onFocus));
      return part.node;
    });
  }
  function panel(key: string) {
    return componentRoot(() => {
      const item = () => items().find((item) => item.value === key);
      const id = idFor(key);
      return createCompositePanel({
        id: id.panel,
        labelledBy: id.trigger,
        role: 'tabpanel',
        get active() {
          return selected() === key && Boolean(item());
        },
        get mountStrategy() {
          return props.mountStrategy;
        },
        get style() {
          return props.panelStyle;
        },
        get children() {
          return item()?.children ?? emptyContent;
        },
        onBeforeHide() {
          const target = members.get(selected() ?? key) ?? members.get(key);
          scope.recoverFocus(() => {
            if (!target?.focus()) scope.focusFirst();
          });
        },
      });
    });
  }
  const node = View({
    get style(): StyleValue<ViewStyles> {
      return [
        { flexDirection: 'column', minWidth: 0, gap: theme().spacing.sm },
        props.style,
      ];
    },
    children: [
      View({
        get style(): StyleValue<ViewStyles> {
          return [
            {
              flexDirection:
                props.orientation === 'vertical' ? 'column' : 'row',
              minWidth: 0,
              gap: theme().spacing.xs,
            },
            props.listStyle,
          ];
        },
        children: For({
          get each() {
            return keys();
          },
          children: trigger,
        }),
      }),
      For({
        get each() {
          return keys();
        },
        children: panel,
      }),
    ],
  }) as PNode;
  createEffect(() => {
    const active = selected();
    const list = items();
    revision();
    if (
      [...members.values()].some((member) => member.element === scope.focused())
    )
      return;
    const target =
      members.get(active ?? '') ??
      members.get(list.find((item) => !item.disabled)?.value ?? '');
    if (target) group.setTabStop(target.element);
  });
  return node;
}

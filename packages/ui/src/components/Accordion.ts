import {
  createMemo,
  For,
  onCleanup,
  type PNode,
  type StyleValue,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import type { FocusableState } from '../primitives/createFocusable';
import { getFocusScope } from '../primitives/focusScope';
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

interface AccordionCommonProps {
  items: readonly DisclosureItem[];
  disabled?: boolean;
  mountStrategy?: PanelMountStrategy;
  style?: StyleValue<ViewStyles>;
  triggerStyle?: StyleValue<ViewStyles>;
  panelStyle?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
interface AccordionSingleProps extends AccordionCommonProps {
  type: 'single';
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  collapsible?: boolean;
}
interface AccordionMultipleProps extends AccordionCommonProps {
  type: 'multiple';
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
  collapsible?: never;
}
export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

/** Header navigation is optional; every enabled header remains a native Tab stop. */
export function Accordion(props: AccordionProps): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    const type = props.type;
    if (type !== 'single' && type !== 'multiple')
      throw new Error('Accordion requires type single or multiple.');
    const theme = useUITheme();
    const scope = getFocusScope();
    // Store an accessor rather than the list in a memo: MobX deep conversion of
    // array values would wrap content functions again on every list replacement.
    const readItems = () => {
      const list = validateDisclosureItems(props.items);
      return () => list;
    };
    const source = createMemo(readItems, readItems());
    const items = () => source()();
    const single = props as AccordionSingleProps;
    const multiple = props as AccordionMultipleProps;
    const [value, setValue] = createControllableState<
      string | null | readonly string[]
    >({
      get value() {
        return type === 'single' ? single.value : multiple.value;
      },
      defaultValue:
        type === 'single'
          ? (single.defaultValue ?? null)
          : (multiple.defaultValue ?? []),
      onChange(next) {
        if (type === 'single') single.onValueChange?.(next as string | null);
        else multiple.onValueChange?.(next as readonly string[]);
      },
    });
    const selected = () => {
      const raw = value();
      const list =
        type === 'single'
          ? typeof raw === 'string'
            ? [raw]
            : []
          : Array.isArray(raw)
            ? raw
            : [];
      return [...new Set(list)].filter((key) =>
        items().some((item) => item.value === key),
      );
    };
    const members = new Map<string, FocusableState>();
    const emptyContent = () => undefined;
    function activate(key: string) {
      const item = items().find((item) => item.value === key);
      if (!item || item.disabled || props.disabled) return;
      const current = selected();
      if (type === 'single') {
        if (current.includes(key)) {
          if (single.collapsible !== false) setValue(null);
        } else setValue(key);
      } else
        setValue(
          current.includes(key)
            ? current.filter((value) => value !== key)
            : [...current, key],
        );
    }
    function navigate(key: string, event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing
      )
        return;
      const enabled = items().filter(
        (item) => !props.disabled && !item.disabled,
      );
      const index = enabled.findIndex((item) => item.value === key);
      if (index < 0) return;
      let next: number;
      switch (event.key) {
        case 'ArrowDown':
          next = (index + 1) % enabled.length;
          break;
        case 'ArrowUp':
          next = (index + enabled.length - 1) % enabled.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = enabled.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      members.get(enabled[next].value)?.focus();
    }
    function itemView(key: string) {
      return componentRoot(() => {
        const item = () => items().find((item) => item.value === key);
        const triggerId = compositeId('accordion-trigger');
        const panelId = compositeId('accordion-panel');
        const trigger = createCompositeTrigger({
          get label() {
            return item()?.label ?? key;
          },
          id: triggerId,
          headingLevel: 3,
          controls: panelId,
          get expanded() {
            return selected().includes(key);
          },
          get disabled() {
            return Boolean(props.disabled || !item() || item()?.disabled);
          },
          get style(): StyleValue<ViewStyles> {
            return props.triggerStyle;
          },
          onActivate: () => activate(key),
          onKeyDown: (event) => navigate(key, event),
        });
        members.set(key, trigger.focus);
        onCleanup(() => members.delete(key));
        const panel = createCompositePanel({
          id: panelId,
          labelledBy: triggerId,
          get active() {
            return selected().includes(key);
          },
          get mountStrategy() {
            return props.mountStrategy;
          },
          get style(): StyleValue<ViewStyles> {
            return props.panelStyle;
          },
          get children() {
            return item()?.children ?? emptyContent;
          },
          onBeforeHide() {
            if (!trigger.focus.focus()) scope.focusFirst();
          },
        });
        return View({
          style: { flexDirection: 'column', minWidth: 0 },
          children: [trigger.node, panel],
        }) as PNode;
      });
    }
    return View({
      get style(): StyleValue<ViewStyles> {
        return [
          { flexDirection: 'column', minWidth: 0, gap: theme().spacing.xs },
          props.style,
        ];
      },
      children: For({
        get each() {
          return items().map((item) => item.value);
        },
        children: (key) => itemView(key),
      }),
    }) as PNode;
  }, props.ref);
}

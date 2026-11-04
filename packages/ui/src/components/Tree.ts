import {
  createEffect,
  createMemo,
  createState,
  type Getter,
  isComposingInput,
  type PNode,
  type PScrollView,
  type StyleValue,
  Text,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { createPressable } from '../primitives/createPressable';
import { useUIFocus } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { componentRoot } from './internal/componentRoot';
import {
  createTreeModel,
  flattenTree,
  type TreeModel,
  type TreeNode,
  type TreeRow,
} from './internal/treeModel';
import {
  renderVirtualCollection,
  type VirtualListHandle,
} from './internal/virtualCollection';

export type { TreeNode } from './internal/treeModel';
export type TreeHandle = VirtualListHandle;
export interface TreeProps {
  label: string;
  nodes: readonly TreeNode[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  expandedValues?: readonly string[];
  defaultExpandedValues?: readonly string[];
  onExpandedValuesChange?: (values: string[]) => void;
  disabled?: boolean;
  /** Fixed logical pixel height; defaults to theme.controlSize.md. */
  rowHeight?: number;
  overscan?: number;
  style?: StyleValue<ViewStyles>;
  ref?: (node: PScrollView) => void;
  apiRef?: (handle: TreeHandle) => void;
}

/** Single-select hierarchy with independent active navigation and virtual rows. */
export function Tree(props: TreeProps): ReturnType<typeof View> {
  useUIFocus();
  return componentRoot(() => renderTree(props));
}

function renderTree(props: TreeProps): PScrollView {
  const theme = useUITheme();
  const initialModel = createTreeModel(props.nodes);
  const model = createMemo(() => createTreeModel(props.nodes), initialModel);
  const [value, setValue] = createControllableState<string | null>({
    get value() {
      return props.value;
    },
    defaultValue: props.defaultValue ?? null,
    onChange: (next) => props.onValueChange?.(next),
  });
  const [expandedValues, setExpandedValues] = createControllableState<
    readonly string[]
  >({
    get value() {
      return props.expandedValues;
    },
    defaultValue: [...(props.defaultExpandedValues ?? [])],
    onChange: (next) => props.onExpandedValuesChange?.([...next]),
  });
  const expanded = createMemo(
    () => new Set(expandedValues()),
    new Set(expandedValues()),
  );
  const rows = createMemo(
    () => flattenTree(model(), expanded()),
    flattenTree(model(), expanded()),
  );
  const indexes = createMemo(
    () => new Map(rows().map((row, index) => [row.node.value, index])),
    new Map(rows().map((row, index) => [row.node.value, index])),
  );
  const [active, setActive] = createState<string | null>(null);
  const height = () => {
    const next = props.rowHeight ?? theme().controlSize.md;
    if (!Number.isFinite(next) || next <= 0)
      throw new Error('Tree rowHeight must be a positive finite number.');
    return next;
  };
  let handle: TreeHandle | undefined;
  let previousModel: TreeModel | undefined;
  let previousIndex = 0;
  createEffect(() => {
    const currentModel = model();
    const visible = rows();
    const byKey = indexes();
    const key = active();
    if (key !== null && byKey.has(key)) previousIndex = byKey.get(key)!;
    else {
      let ancestor = key;
      while (ancestor !== null && !byKey.has(ancestor))
        ancestor =
          currentModel.rows.get(ancestor)?.parent ??
          previousModel?.rows.get(ancestor)?.parent ??
          null;
      const selected = untrack(value);
      const fallback =
        ancestor ??
        (key === null && selected !== null && byKey.has(selected)
          ? selected
          : (visible[Math.min(previousIndex, visible.length - 1)]?.node.value ??
            null));
      setActive(fallback);
      if (key !== null && fallback !== null)
        handle?.scrollToKey(fallback, 'nearest');
    }
    previousModel = currentModel;
  });
  function activate(key: string, reveal = true) {
    setActive(key);
    if (reveal) handle?.scrollToKey(key, 'nearest');
  }
  function toggle(row: TreeRow, open: boolean) {
    if (props.disabled || row.node.disabled || !row.node.children?.length)
      return;
    const keys = new Set(expandedValues());
    if (open) keys.add(row.node.value);
    else keys.delete(row.node.value);
    setExpandedValues([...keys]);
  }
  function select(row: TreeRow) {
    if (props.disabled) return;
    activate(row.node.value);
    if (!row.node.disabled) setValue(row.node.value);
  }
  let typed = '';
  let typedAt = 0;
  function navigate(event: KeyboardEvent) {
    if (
      props.disabled ||
      isComposingInput(event) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const visible = rows();
    if (!visible.length) return;
    const index = active() === null ? 0 : (indexes().get(active()!) ?? 0);
    const row = visible[index]!;
    let next: number | undefined;
    if (!event.shiftKey)
      switch (event.key) {
        case 'ArrowDown':
          next = Math.min(visible.length - 1, index + 1);
          break;
        case 'ArrowUp':
          next = Math.max(0, index - 1);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = visible.length - 1;
          break;
        case 'PageDown':
          next = Math.min(
            visible.length - 1,
            index +
              Math.max(
                1,
                Math.floor(
                  (handle?.node._layoutNode.getComputedHeight() ?? height()) /
                    height(),
                ),
              ),
          );
          break;
        case 'PageUp':
          next = Math.max(
            0,
            index -
              Math.max(
                1,
                Math.floor(
                  (handle?.node._layoutNode.getComputedHeight() ?? height()) /
                    height(),
                ),
              ),
          );
          break;
        case 'ArrowRight':
          typed = '';
          event.preventDefault();
          if (row.node.children?.length) {
            if (!expanded().has(row.node.value)) toggle(row, true);
            else if (visible[index + 1]?.parent === row.node.value)
              activate(visible[index + 1]!.node.value);
          }
          return;
        case 'ArrowLeft':
          typed = '';
          event.preventDefault();
          if (row.node.children?.length && expanded().has(row.node.value))
            toggle(row, false);
          else if (row.parent !== null) activate(row.parent);
          return;
        case 'Enter':
        case ' ':
          typed = '';
          event.preventDefault();
          select(row);
          return;
      }
    if (next !== undefined) {
      event.preventDefault();
      typed = '';
      activate(visible[next]!.node.value);
      return;
    }
    if ([...event.key].length !== 1 || event.key === ' ') return;
    const now = Date.now();
    typed = now - typedAt > 700 ? event.key : typed + event.key;
    typedAt = now;
    const normalized = (text: string) =>
      text.normalize('NFKC').toLocaleLowerCase();
    const query = normalized(typed);
    // Repeating a character cycles matching visible labels.
    const prefix = [...query].every((char) => char === [...query][0])
      ? [...query][0]!
      : query;
    for (let offset = 1; offset <= visible.length; offset++) {
      const candidate = visible[(index + offset) % visible.length]!;
      if (normalized(candidate.node.label).startsWith(prefix)) {
        event.preventDefault();
        activate(candidate.node.value);
        return;
      }
    }
  }
  return renderVirtualCollection<TreeRow>(
    {
      get label() {
        return props.label;
      },
      get items() {
        return rows();
      },
      get disabled() {
        return props.disabled;
      },
      getKey: (row) => row.node.value,
      getLabel: (row) => row.node.label,
      get estimateHeight() {
        return height();
      },
      measure: false,
      get overscan() {
        return props.overscan;
      },
      get style(): StyleValue<ViewStyles> {
        return props.style;
      },
      ref: (node) => props.ref?.(node),
      apiRef(api) {
        handle = api;
        props.apiRef?.(api);
      },
      children: (item: Getter<TreeRow>) => {
        const disclosure = View({
          onPointerTap(event) {
            event.stopPropagation();
          },
          get style(): StyleValue<ViewStyles> {
            return {
              width: height(),
              height: '100%',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            };
          },
          children: Text({
            get children() {
              return item().node.children?.length
                ? expanded().has(item().node.value)
                  ? '▾'
                  : '▸'
                : '';
            },
            get style(): Parameters<typeof Text>[0]['style'] {
              return {
                color:
                  value() === item().node.value
                    ? theme().colors.onPrimary
                    : theme().colors.textMuted,
                fontSize: theme().typography.fontSize,
              };
            },
          }),
        });
        createPressable(disclosure as PNode, {
          get disabled() {
            return (
              props.disabled ||
              item().node.disabled ||
              !item().node.children?.length
            );
          },
          onPress(event) {
            event.stopPropagation();
            handle?.focus();
            const row = item();
            activate(row.node.value, false);
            toggle(row, !expanded().has(row.node.value));
          },
        });
        return View({
          get style(): StyleValue<ViewStyles> {
            return {
              width: '100%',
              height: height(),
              flexDirection: 'row',
              alignItems: 'center',
              minWidth: 0,
              paddingLeft: (item().level - 1) * theme().spacing.md,
              backgroundColor:
                value() === item().node.value
                  ? theme().colors.primary
                  : active() === item().node.value
                    ? theme().colors.surfaceRaised
                    : theme().colors.surface,
              borderWidth: active() === item().node.value ? 2 : 0,
              borderColor: theme().colors.focusRing,
              opacity: item().node.disabled ? 0.5 : 1,
            };
          },
          children: [
            disclosure,
            Text({
              get children() {
                return item().node.label;
              },
              get style(): Parameters<typeof Text>[0]['style'] {
                return {
                  color:
                    value() === item().node.value
                      ? theme().colors.onPrimary
                      : theme().colors.text,
                  fontFamily: theme().typography.fontFamily,
                  fontSize: theme().typography.fontSize,
                  lineHeight: theme().typography.lineHeight,
                };
              },
            }),
          ],
        });
      },
    },
    {
      role: 'tree',
      itemRole: 'treeitem',
      activeKey: active,
      onKeyDown: navigate,
      onItemPress: select,
      rowAttributes(row) {
        return {
          'aria-level': row.level,
          'aria-posinset': row.posinset,
          'aria-setsize': row.setsize,
          'aria-expanded': row.node.children?.length
            ? expanded().has(row.node.value)
            : undefined,
          'aria-selected': value() === row.node.value,
          'aria-disabled': row.node.disabled || undefined,
        };
      },
    },
  );
}

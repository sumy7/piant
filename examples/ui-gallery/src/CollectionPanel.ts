import { createEffect, createState, Text, untrack, View } from '@piant/core';
import {
  Button,
  Stack,
  Surface,
  TextField,
  Tree,
  type TreeNode,
  UIProvider,
  useUITheme,
  VirtualList,
  type VirtualListHandle,
  type VirtualRange,
} from '@piant/ui';

export interface CollectionRow {
  key: string;
  label: string;
  tall: boolean;
}
export interface CollectionSnapshot {
  count: number;
  range: VirtualRange | null;
  value: string | null;
  expanded: readonly string[];
  edits: Readonly<Record<string, string>>;
}
export interface CollectionControls {
  api: VirtualListHandle;
  prepend(): void;
  remove(key: string): void;
  changeHeights(): void;
  reverse(): void;
  clear(): void;
  restore(): void;
  expandAll(): void;
  collapseAll(): void;
}
export interface CollectionPanelProps {
  name: string;
  kind: 'list' | 'tree';
  colorMode?: 'light' | 'dark';
  fontScale?: number;
  density?: 'comfortable' | 'compact';
  onReady?: (controls: CollectionControls) => void;
  onStateChange?: (snapshot: CollectionSnapshot) => void;
}
const createRows = () =>
  Array.from({ length: 10000 }, (_, i) => ({
    key: `item-${i}`,
    label: `条目 ${i}`,
    tall: i % 9 === 0,
  }));
const createNodes = (): TreeNode[] =>
  Array.from({ length: 100 }, (_, group) => ({
    value: `folder-${group}`,
    label: `文件夹 ${group}`,
    children: Array.from({ length: 100 }, (_, i) => ({
      value: `leaf-${group}-${i}`,
      label: `文件 ${group}-${i}`,
      disabled: i === 3,
    })),
  }));

/** Public package only; shared by online examples and the isolated package smoke. */
export function CollectionPanel(props: CollectionPanelProps) {
  return View({
    style: { width: '100%', height: '100%', flexShrink: 1, minHeight: 0 },
    children: UIProvider({
      get colorMode() {
        return props.colorMode;
      },
      get density() {
        return props.density;
      },
      get fontScale() {
        return props.fontScale;
      },
      children: () => untrack(() => Content(props)),
    }),
  });
}
function Content(props: CollectionPanelProps) {
  const theme = useUITheme();
  const [rows, setRows] = createState(createRows());
  const [nodes, setNodes] = createState(createNodes());
  const [range, setRange] = createState<VirtualRange | null>(null);
  const [value, setValue] = createState<string | null>(null);
  const [expanded, setExpanded] = createState<readonly string[]>(['folder-0']);
  const [edits, setEdits] = createState<Record<string, string>>({});
  let api: VirtualListHandle | undefined;
  let inserted = 0;
  const controls = () => ({
    api: api!,
    prepend() {
      setRows((items) => [
        { key: `added-${++inserted}`, label: `新增 ${inserted}`, tall: true },
        ...items,
      ]);
      setNodes((items) => [
        {
          value: `added-folder-${inserted}`,
          label: `新增目录 ${inserted}`,
          children: [{ value: `added-child-${inserted}`, label: '新增文件' }],
        },
        ...items,
      ]);
    },
    remove(key: string) {
      setRows((items) => items.filter((row) => row.key !== key));
      const remove = (items: readonly TreeNode[]): TreeNode[] =>
        items
          .filter((n) => n.value !== key)
          .map((n) => ({
            ...n,
            children: n.children ? remove(n.children) : undefined,
          }));
      setNodes((items) => remove(items));
    },
    changeHeights() {
      setRows((items) => items.map((row) => ({ ...row, tall: !row.tall })));
    },
    reverse() {
      setRows((items) => [...items].reverse());
      setNodes((items) => [...items].reverse());
    },
    clear() {
      setRows([]);
      setNodes([]);
    },
    restore() {
      setRows(createRows());
      setNodes(createNodes());
    },
    expandAll() {
      setExpanded(
        nodes()
          .filter((node) => node.children?.length)
          .map((node) => node.value),
      );
    },
    collapseAll() {
      setExpanded([]);
    },
  });
  const count = () =>
    props.kind === 'list'
      ? rows().length
      : nodes().reduce(
          (sum, node) => sum + 1 + (node.children?.length ?? 0),
          0,
        );
  createEffect(() =>
    props.onStateChange?.({
      count: count(),
      range: range(),
      value: value(),
      expanded: expanded(),
      edits: edits(),
    }),
  );
  function text(read: () => string) {
    return Text({
      get children() {
        return read();
      },
      get style() {
        return {
          fontSize: theme().typography.fontSize,
          lineHeight: theme().typography.lineHeight,
          color: theme().colors.text,
        };
      },
    });
  }
  const ready = (handle: VirtualListHandle) => {
    api = handle;
    props.onReady?.(controls());
  };
  const viewport =
    props.kind === 'list'
      ? VirtualList<CollectionRow>({
          label: `${props.name} 虚拟列表`,
          get items() {
            return rows();
          },
          getKey: (row) => row.key,
          getLabel: (row) => row.label,
          estimateHeight: (row) => (row.tall ? 96 : 52),
          measure: true,
          overscan: 2,
          apiRef: ready,
          onRangeChange: setRange,
          style: { width: '100%', height: 320, flexShrink: 1, minHeight: 80 },
          children: (item) =>
            View({
              get style(): Parameters<typeof View>[0]['style'] {
                return {
                  width: '100%',
                  minHeight: item().tall ? 96 : 52,
                  padding: theme().spacing.xs,
                  justifyContent: 'center',
                };
              },
              children: TextField({
                size: 'sm',
                get 'aria-label'() {
                  return `${props.name} 编辑 ${item().key}`;
                },
                get value() {
                  return edits()[item().key] ?? item().label;
                },
                onValueChange(next) {
                  const key = item().key;
                  setEdits((previous) => ({ ...previous, [key]: next }));
                },
              }),
            }),
        })
      : Tree({
          label: `${props.name} 虚拟树`,
          get nodes() {
            return nodes();
          },
          get value() {
            return value();
          },
          onValueChange: setValue,
          get expandedValues() {
            return expanded();
          },
          onExpandedValuesChange: setExpanded,
          get rowHeight() {
            return Math.max(
              32,
              theme().typography.lineHeight + theme().spacing.xs * 2,
            );
          },
          apiRef: ready,
          style: { width: '100%', height: 320, flexShrink: 1, minHeight: 80 },
        });
  const action = (label: string, fn: () => void) =>
    Button({
      size: 'sm',
      variant: 'secondary',
      children: `${props.name} ${label}`,
      onPress: fn,
    });
  return Surface({
    tone: 'canvas',
    padding: 'sm',
    style: { width: '100%', height: '100%' },
    children: Stack({
      gap: 'sm',
      style: { width: '100%', height: '100%' },
      children: [
        Stack({
          direction: 'row',
          wrap: true,
          gap: 'sm',
          children: [
            action('定位 9000', () =>
              api?.scrollToIndex(props.kind === 'list' ? 9000 : 90, 'start'),
            ),
            action('前插', () => controls().prepend()),
            action('重排', () => controls().reverse()),
            props.kind === 'list'
              ? action('切换行高', () => controls().changeHeights())
              : action('展开全部', () => controls().expandAll()),
            props.kind === 'tree'
              ? action('折叠全部', () => controls().collapseAll())
              : undefined,
            action('清空', () => controls().clear()),
            action('复原', () => controls().restore()),
          ],
        }),
        text(() => `数据 ${count()} 项；选择 ${value() ?? '无'}`),
        viewport,
        props.kind === 'list'
          ? text(() => {
              const r = range();
              return r
                ? `窗口 ${r.start}–${r.end}；高度 ${Math.round(r.totalHeight)}px`
                : '准备窗口';
            })
          : text(
              () => `展开 ${expanded().length} 个目录；方向键导航，Enter 选择`,
            ),
      ],
    }),
  });
}

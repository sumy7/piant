import {
  attachDOMElement,
  createEffect,
  createState,
  For,
  type Getter,
  onCleanup,
  onTick,
  type PNode,
  type PScrollView,
  ScrollView,
  type StyleValue,
  Text,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import { createFocusable } from '../../primitives/createFocusable';
import { getFocusScope, setAttribute } from '../../primitives/focusScope';
import { useUITheme } from '../../theme/UIProvider';
import { componentRoot } from './componentRoot';
import { compositeId } from './compositeParts';

export type VirtualAlignment = 'start' | 'center' | 'end' | 'nearest';
export interface VirtualRange {
  start: number;
  end: number;
  total: number;
  offset: number;
  totalHeight: number;
}
export interface VirtualListHandle {
  readonly node: PScrollView;
  readonly element: HTMLElement;
  readonly range: Getter<VirtualRange>;
  scrollToIndex(index: number, align?: VirtualAlignment): void;
  scrollToKey(key: string, align?: VirtualAlignment): void;
  scrollToOffset(offset: number): void;
  focus(): boolean;
  getItemElement(key: string): HTMLElement | undefined;
  getItemNode(key: string): PNode | undefined;
}
export interface VirtualCollectionProps<T> {
  label: string;
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  getLabel: (item: T, index: number) => string;
  estimateHeight?: number | ((item: T, index: number) => number);
  measure?: boolean;
  disabled?: boolean;
  overscan?: number;
  children?: (item: Getter<T>, index: Getter<number>) => JSX.Element;
  style?: StyleValue<ViewStyles>;
  ref?: (node: PScrollView) => void;
  apiRef?: (handle: VirtualListHandle) => void;
  onRangeChange?: (range: VirtualRange) => void;
}
export interface VirtualCollectionAdapter<T> {
  role?: 'list' | 'tree';
  itemRole?: 'listitem' | 'treeitem';
  rowAttributes?: (
    item: T,
    index: number,
  ) => Record<string, string | number | boolean | undefined>;
  activeKey?: () => string | null;
  onKeyDown?: (event: KeyboardEvent) => void;
  onItemPress?: (item: T, event?: MouseEvent) => void;
}

/** Prefix offsets and keyed measurements; no retained entries survive removal. */
export class VirtualCollectionModel<T> {
  items: readonly T[] = [];
  keys: string[] = [];
  indices = new Map<string, number>();
  heights = new Map<string, number>();
  offsets: number[] = [0];
  estimates: number[] = [];
  rebuild(
    items: readonly T[],
    getKey: (item: T, index: number) => string,
    estimate: (item: T, index: number) => number,
  ) {
    const keys = items.map(getKey);
    const indices = new Map<string, number>();
    for (const [index, key] of keys.entries()) {
      if (typeof key !== 'string' || !key || indices.has(key))
        throw new Error('VirtualList requires unique non-empty string keys.');
      indices.set(key, index);
    }
    const estimates = items.map((item, index) => {
      const height = estimate(item, index);
      if (!Number.isFinite(height) || height <= 0)
        throw new Error(
          'VirtualList row estimates must be finite and positive.',
        );
      return height;
    });
    for (const key of this.heights.keys()) {
      const previous = this.indices.get(key),
        next = indices.get(key);
      if (
        next === undefined ||
        previous === undefined ||
        this.items[previous] !== items[next] ||
        this.estimates[previous] !== estimates[next]
      )
        this.heights.delete(key);
    }
    this.items = items;
    this.keys = keys;
    this.indices = indices;
    this.estimates = estimates;
    this.recalculate();
  }
  recalculate() {
    this.offsets = [0];
    for (let index = 0; index < this.keys.length; index++)
      this.offsets.push(
        this.offsets[index] +
          (this.heights.get(this.keys[index]) ?? this.estimates[index]),
      );
  }
  get totalHeight() {
    return this.offsets.at(-1) ?? 0;
  }
  indexAt(offset: number) {
    let low = 0,
      high = this.keys.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.offsets[mid + 1] <= offset) low = mid + 1;
      else high = mid;
    }
    return Math.min(low, Math.max(0, this.keys.length - 1));
  }
  anchor(offset: number) {
    const index = this.indexAt(offset);
    return {
      key: this.keys[index],
      index,
      inset: offset - this.offsets[index],
    };
  }
  restore(anchor: ReturnType<VirtualCollectionModel<T>['anchor']>) {
    const index =
      this.indices.get(anchor.key) ??
      Math.min(anchor.index, Math.max(0, this.keys.length - 1));
    return (
      (this.offsets[index] ?? 0) +
      Math.max(
        0,
        Math.min(
          anchor.inset,
          (this.offsets[index + 1] ?? 0) - (this.offsets[index] ?? 0),
        ),
      )
    );
  }
}

export function createVirtualCollection<T>(
  props: VirtualCollectionProps<T>,
  adapter: VirtualCollectionAdapter<T> = {},
): ReturnType<typeof View> {
  return componentRoot(() => renderVirtualCollection(props, adapter));
}

export function renderVirtualCollection<T>(
  props: VirtualCollectionProps<T>,
  adapter: VirtualCollectionAdapter<T> = {},
): PScrollView {
  const theme = useUITheme();
  const scope = getFocusScope();
  const model = new VirtualCollectionModel<T>();
  const [revision, setRevision] = createState(0);
  const [visible, setVisible] = createState<string[]>([]);
  const [range, setRange] = createState<VirtualRange>({
    start: 0,
    end: 0,
    total: 0,
    offset: 0,
    totalHeight: 0,
  });
  const [activeId, setActiveId] = createState<string>();
  const rows = new Map<
    string,
    { node: PNode; element: HTMLDivElement; attributes: Set<string> }
  >();
  let viewport = 0,
    width = 0,
    offset = 0,
    disposed = false,
    syncing = false;
  let lastMeasure: boolean | undefined;
  let focus: ReturnType<typeof createFocusable> | undefined;
  let node!: PScrollView;
  const element = document.createElement('div');
  element.style.cssText = 'opacity:0;pointer-events:none;overflow:hidden;';
  const total = () => {
    revision();
    return model.totalHeight;
  };
  const content = View({
    get style(): StyleValue<ViewStyles> {
      return {
        position: 'relative',
        width: '100%',
        height: total(),
        flexShrink: 0,
      };
    },
    children: For({
      get each() {
        return visible();
      },
      children: (key: string) =>
        componentRoot(() => {
          // A removed key can still have reactions queued before For disposes
          // its row. Keep that row's last payload until reconciliation finishes.
          let retainedIndex = model.indices.get(key)!;
          let retainedItem = model.items[retainedIndex];
          const index = () => {
            revision();
            retainedIndex = model.indices.get(key) ?? retainedIndex;
            return retainedIndex;
          };
          const item = () => {
            revision();
            const current = model.indices.get(key);
            if (current !== undefined) retainedItem = model.items[current];
            return retainedItem;
          };
          const semantic = document.createElement('div');
          semantic.id = compositeId('virtual-row');
          semantic.setAttribute('role', adapter.itemRole ?? 'listitem');
          semantic.style.cssText = 'position:absolute;pointer-events:none;';
          const row = View({
            get style(): StyleValue<ViewStyles> {
              revision();
              return {
                position: 'absolute',
                left: 0,
                top: model.offsets[index()],
                width: '100%',
                minHeight:
                  props.children && props.measure !== false
                    ? 0
                    : model.estimates[index()],
                height:
                  props.measure === false
                    ? model.estimates[index()]
                    : undefined,
                flexDirection: 'column',
                overflow: 'hidden',
              };
            },
            children: props.children
              ? props.children(item, index)
              : Text({
                  get children() {
                    return props.getLabel(item(), index());
                  },
                  get style() {
                    const t = theme();
                    return {
                      color: t.colors.text,
                      fontFamily: t.typography.fontFamily,
                      fontSize: t.typography.fontSize,
                      lineHeight: t.typography.lineHeight,
                      padding: t.spacing.sm,
                    };
                  },
                }),
          }) as PNode;
          const rowRecord = {
            node: row,
            element: semantic,
            attributes: new Set<string>(),
          };
          rows.set(key, rowRecord);
          const press = () => {
            if (!disposed && !props.disabled && model.indices.has(key)) {
              focus?.focus();
              adapter.onItemPress?.(item());
            }
          };
          if (adapter.onItemPress) {
            row._view.eventMode = 'static';
            row._view.on('pointertap', press);
            semantic.addEventListener('click', press);
          }
          onCleanup(() => {
            recoverFocus(row);
            rows.delete(key);
            semantic.remove();
            row._view.off('pointertap', press);
            semantic.removeEventListener('click', press);
          });
          return row;
        }),
    }),
  });
  node = ScrollView({
    get style(): StyleValue<ViewStyles> {
      return [
        { width: '100%', height: 240, minWidth: 0, minHeight: 0 },
        props.style,
      ];
    },
    children: content,
  });
  const binding = attachDOMElement(node, element);
  focus = createFocusable(node, {
    domElement: binding,
    get role() {
      return adapter.role ?? 'list';
    },
    get name() {
      if (!props.label?.trim())
        throw new Error('VirtualList requires a label.');
      return props.label;
    },
    get activeDescendant() {
      return activeId();
    },
    onKeyDown(event) {
      if (event.target !== element || props.disabled) return;
      if (adapter.onKeyDown) {
        adapter.onKeyDown(event);
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const step = theme().controlSize.md;
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? model.totalHeight
            : event.key === 'PageDown'
              ? offset + viewport
              : event.key === 'PageUp'
                ? offset - viewport
                : event.key === 'ArrowDown'
                  ? offset + step
                  : event.key === 'ArrowUp'
                    ? offset - step
                    : undefined;
      if (next !== undefined) {
        event.preventDefault();
        scrollToOffset(next);
      }
    },
  });
  function ownsElement(target: EventTarget | null, row?: PNode) {
    const entry = scope.entries.find(
      (entry) => entry.binding.element === target,
    );
    if (!entry) return false;
    let ancestor: PNode | null = entry.node;
    while (ancestor) {
      if (
        row
          ? ancestor === row
          : [...rows.values()].some((record) => record.node === ancestor)
      )
        return true;
      ancestor = ancestor.parentNode;
    }
    return false;
  }
  function recoverFocus(row: PNode) {
    if (ownsElement(element.ownerDocument.activeElement, row)) focus?.focus();
  }
  // Native Input DOM overlays do not bubble wheel into Pixi's event tree.
  // Bridge only registered controls owned by this collection's mounted rows.
  const wheel = (event: WheelEvent) => {
    if (
      disposed ||
      props.disabled ||
      event.defaultPrevented ||
      event.ctrlKey ||
      !scope.allows(element) ||
      !ownsElement(event.target)
    )
      return;
    const unit =
      event.deltaMode === 1
        ? theme().typography.lineHeight
        : event.deltaMode === 2
          ? viewport
          : 1;
    const delta = event.deltaY * unit;
    if (!Number.isFinite(delta) || delta === 0) return;
    const next = clamp(offset + delta);
    if (next === offset) return;
    event.preventDefault();
    scrollToOffset(next);
  };
  element.ownerDocument.addEventListener('wheel', wheel, { passive: false });
  onCleanup(() => element.ownerDocument.removeEventListener('wheel', wheel));
  const clamp = (next: number) =>
    Math.max(
      0,
      Math.min(
        Number.isFinite(next) ? next : 0,
        Math.max(0, model.totalHeight - viewport),
      ),
    );
  function semanticSync() {
    if (disposed) return;
    let order = 0;
    for (const key of visible()) {
      const row = rows.get(key),
        index = model.indices.get(key);
      if (!row || index === undefined) continue;
      const item = model.items[index];
      row.element.setAttribute('aria-label', props.getLabel(item, index));
      row.element.setAttribute('aria-posinset', String(index + 1));
      row.element.setAttribute('aria-setsize', String(model.items.length));
      const attributes = adapter.rowAttributes?.(item, index) ?? {};
      for (const name of row.attributes)
        if (!(name in attributes)) row.element.removeAttribute(name);
      row.attributes = new Set(Object.keys(attributes));
      for (const [name, value] of Object.entries(attributes))
        setAttribute(row.element, name, value);
      row.element.style.top = `${model.offsets[index] - offset}px`;
      row.element.style.width = '100%';
      row.element.style.height = `${model.offsets[index + 1] - model.offsets[index]}px`;
      if (element.children[order] !== row.element)
        element.insertBefore(row.element, element.children[order] ?? null);
      order++;
    }
    const active = adapter.activeKey?.();
    const row =
      active && visible().includes(active) && model.indices.has(active)
        ? rows.get(active)
        : undefined;
    setActiveId(row?.element.isConnected ? row.element.id : undefined);
  }
  function publish() {
    const count = model.items.length;
    const rawOverscan = props.overscan ?? 2;
    if (!Number.isFinite(rawOverscan) || rawOverscan < 0)
      throw new Error('VirtualList overscan must be finite and nonnegative.');
    const extra = Math.floor(rawOverscan);
    const start =
      count && viewport > 0 ? Math.max(0, model.indexAt(offset) - extra) : 0;
    const end =
      count && viewport > 0
        ? Math.min(
            count,
            model.indexAt(Math.max(offset, offset + viewport - 0.001)) +
              extra +
              1,
          )
        : 0;
    const keys = model.keys.slice(start, end);
    const previous = untrack(visible);
    if (
      keys.length !== previous.length ||
      keys.some((key, index) => key !== previous[index])
    ) {
      // Move focus before keyed reconciliation destroys a focused row subtree.
      const retained = new Set(keys);
      for (const [key, row] of rows)
        if (!retained.has(key)) recoverFocus(row.node);
      setVisible(keys);
    }
    const next = {
      start,
      end,
      total: count,
      offset,
      totalHeight: model.totalHeight,
    };
    const old = untrack(range);
    if (
      Object.keys(next).some(
        (key) =>
          next[key as keyof VirtualRange] !== old[key as keyof VirtualRange],
      )
    ) {
      setRange(next);
      props.onRangeChange?.(next);
    }
    if (!disposed) semanticSync();
  }
  function scrollToOffset(next: number) {
    if (disposed) return;
    offset = clamp(next);
    node.scrollY = -offset;
    node.update();
    publish();
  }
  function sync() {
    if (disposed || syncing || node.isDestroyed) return;
    syncing = true;
    try {
      const nextWidth = node._layoutNode.getComputedWidth();
      const nextViewport = node._layoutNode.getComputedHeight();
      offset = clamp(-node.scrollY);
      const anchor = model.anchor(offset);
      const widthChanged = width !== nextWidth;
      if (widthChanged) {
        width = nextWidth;
        model.heights.clear();
        model.recalculate();
        setRevision((v) => v + 1);
      }
      viewport = Math.max(0, nextViewport);
      offset = clamp(widthChanged ? model.restore(anchor) : -node.scrollY);
      if (props.measure !== false) {
        let changed = false;
        for (const [key, row] of rows) {
          const height = row.node._layoutNode.getComputedHeight();
          if (
            Number.isFinite(height) &&
            height > 0 &&
            Math.abs(
              height -
                (model.heights.get(key) ??
                  model.estimates[model.indices.get(key) ?? 0]),
            ) > 0.5
          ) {
            model.heights.set(key, height);
            changed = true;
          }
        }
        if (changed) {
          model.recalculate();
          offset = clamp(model.restore(anchor));
          setRevision((v) => v + 1);
        }
      }
      if (node.scrollY !== -offset) {
        node.scrollY = -offset;
        node.update();
      }
      publish();
    } finally {
      syncing = false;
    }
  }
  createEffect(() => {
    const items = props.items;
    const estimate = props.estimateHeight;
    const fallback = theme().controlSize.md;
    const measure = props.measure !== false;
    const keys = items.map(props.getKey);
    const estimates = items.map((item, index) =>
      typeof estimate === 'function'
        ? estimate(item, index)
        : (estimate ?? fallback),
    );
    const anchor = model.anchor(offset);
    untrack(() => {
      if (lastMeasure !== measure) model.heights.clear();
      lastMeasure = measure;
      model.rebuild(
        items,
        (_item, index) => keys[index],
        (_item, index) => estimates[index],
      );
      offset = clamp(model.restore(anchor));
      setRevision((v) => v + 1);
      if (node.scrollY !== -offset) {
        node.scrollY = -offset;
        node.update();
      }
      publish();
    });
  });
  createEffect(() => {
    element.inert = Boolean(props.disabled);
    setAttribute(element, 'aria-disabled', props.disabled || undefined);
    scope.refresh();
  });
  createEffect(() => {
    void props.overscan;
    void adapter.activeKey?.();
    untrack(publish);
  });
  onCleanup(onTick(sync));
  onCleanup(node.observeLayout(sync));
  onCleanup(() => {
    disposed = true;
    rows.clear();
    binding.dispose();
  });
  const handle: VirtualListHandle = {
    node,
    element,
    range,
    scrollToOffset,
    scrollToIndex(index, align = 'start') {
      if (disposed || !model.items.length || !Number.isFinite(index)) return;
      index = Math.max(0, Math.min(model.items.length - 1, Math.floor(index)));
      const start = model.offsets[index],
        end = model.offsets[index + 1];
      const next =
        align === 'center'
          ? (start + end - viewport) / 2
          : align === 'end'
            ? end - viewport
            : align === 'nearest'
              ? start >= offset && end <= offset + viewport
                ? offset
                : start < offset
                  ? start
                  : end - viewport
              : start;
      scrollToOffset(next);
    },
    scrollToKey(key, align) {
      const index = model.indices.get(key);
      if (index !== undefined) this.scrollToIndex(index, align);
    },
    focus: () => !disposed && !props.disabled && Boolean(focus?.focus()),
    getItemElement: (key) => rows.get(key)?.element,
    getItemNode: (key) => rows.get(key)?.node,
  };
  props.ref?.(node);
  props.apiRef?.(handle);
  return node;
}

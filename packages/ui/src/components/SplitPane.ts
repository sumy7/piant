import {
  createEffect,
  createState,
  onCleanup,
  type PixiEventHandler,
  type PNode,
  type StyleValue,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { createFocusable } from '../primitives/createFocusable';
import { useUIFocus } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { componentRoot } from './internal/componentRoot';

export interface SplitPaneProps {
  name: string;
  first: () => unknown;
  second: () => unknown;
  /** Horizontal lays panes side by side; vertical stacks them. */
  orientation?: 'horizontal' | 'vertical';
  /** Requested first-pane size in logical pixels, excluding the separator. */
  size?: number;
  defaultSize?: number;
  onSizeChange?: (size: number) => void;
  minSize?: number;
  maxSize?: number;
  minSecondSize?: number;
  /** Keyboard increment in logical pixels. Defaults to 10. */
  step?: number;
  disabled?: boolean;
  description?: string;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}

type Pointer = Parameters<PixiEventHandler<PNode, 'pointerdown'>>[0];
const nonnegative = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : fallback;

/** Two retained panes and one focusable separator; resizing never animates state. */
export function SplitPane(props: SplitPaneProps): ReturnType<typeof View> {
  useUIFocus();
  return componentRoot(() => renderSplitPane(props), props.ref);
}

function renderSplitPane(props: SplitPaneProps): PNode {
  const theme = useUITheme();
  const vertical = () => props.orientation === 'vertical';
  const name = () => {
    if (!props.name?.trim())
      throw new Error('SplitPane requires a non-empty accessible name.');
    return props.name;
  };
  name();
  const thickness = () => Math.max(8, theme().spacing.sm);
  const [extent, setExtent] = createState(0);
  const [dragging, setDragging] = createState(false);
  const [requested, setRequested] = createControllableState({
    get value() {
      return props.size;
    },
    defaultValue: nonnegative(props.defaultSize, 160),
    onChange: (next) => props.onSizeChange?.(next),
  });
  const bounds = () => {
    const available = Math.max(0, extent() - thickness());
    // When minima cannot both fit, preserve the second pane first.
    const max = Math.max(
      0,
      Math.min(
        available - nonnegative(props.minSecondSize, 0),
        nonnegative(props.maxSize, Infinity),
      ),
    );
    return { min: Math.min(nonnegative(props.minSize, 0), max), max };
  };
  const normalize = (value: number) => {
    const { min, max } = bounds();
    return Math.min(max, Math.max(min, nonnegative(value, 160)));
  };
  const current = () => normalize(requested());
  let focusVisible = () => false;
  const separator = View({
    get style(): StyleValue<ViewStyles> {
      return {
        flexShrink: 0,
        width: vertical() ? undefined : thickness(),
        height: vertical() ? thickness() : undefined,
        alignSelf: 'stretch',
        backgroundColor:
          focusVisible() || dragging()
            ? theme().colors.focusRing
            : theme().colors.border,
        opacity: props.disabled ? 0.5 : 1,
      };
    },
  }) as PNode;
  const first = View({
    get style(): StyleValue<ViewStyles> {
      return {
        flexShrink: 0,
        minWidth: 0,
        minHeight: 0,
        width: vertical() ? undefined : current(),
        height: vertical() ? current() : undefined,
        overflow: 'hidden',
      };
    },
    children: props.first as Parameters<typeof View>[0]['children'],
  });
  const second = View({
    style: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden',
    },
    children: props.second as Parameters<typeof View>[0]['children'],
  });
  const node = View({
    get style(): StyleValue<ViewStyles> {
      return [
        {
          flexDirection: vertical() ? 'column' : 'row',
          width: '100%',
          height: 240,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
        },
        props.style,
      ];
    },
    children: [first, separator, second],
  }) as PNode;
  let active: { id: number; offset: number } | undefined;
  let removeGuards = () => {};
  let disposed = false;
  const finish = () => {
    active = undefined;
    removeGuards();
    removeGuards = () => {};
    setDragging(false);
  };
  const focus = createFocusable(separator, {
    role: 'separator',
    get name() {
      return name();
    },
    get description() {
      return props.description;
    },
    get disabled() {
      return props.disabled;
    },
    get value() {
      return { now: current(), min: bounds().min, max: bounds().max };
    },
    onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      let next: number;
      const step =
        props.step && Number.isFinite(props.step) && props.step > 0
          ? props.step
          : 10;
      if (event.key === 'Home') next = bounds().min;
      else if (event.key === 'End') next = bounds().max;
      else if (event.key === (vertical() ? 'ArrowDown' : 'ArrowRight'))
        next = current() + step;
      else if (event.key === (vertical() ? 'ArrowUp' : 'ArrowLeft'))
        next = current() - step;
      else return;
      event.preventDefault();
      finish();
      change(next);
    },
  });
  focusVisible = focus.focusVisible;
  function change(value: number) {
    if (
      disposed ||
      props.disabled ||
      !node.isVisible ||
      !focus.focused() ||
      !Number.isFinite(value)
    )
      return;
    const next = normalize(value);
    if (!Object.is(next, current())) setRequested(next);
  }
  const local = (event: Pointer) => {
    const point = event.getLocalPosition(node._view);
    return vertical() ? point.y : point.x;
  };
  const move = (event: Pointer) => {
    if (!active || event.pointerId !== active.id) return;
    if (props.disabled || !node.isVisible || !focus.focused()) {
      finish();
      return;
    }
    const point = local(event);
    if (!Number.isFinite(point)) {
      finish();
      return;
    }
    change(point - active.offset);
  };
  const guard = (id: number) => {
    const win = focus.element.ownerDocument.defaultView!;
    const doc = win.document;
    const cancel = () => finish();
    const pointerCancel = (event: PointerEvent) => {
      if (event.pointerId === id) finish();
    };
    const lostButtons = (event: PointerEvent) => {
      if (
        event.pointerId === id &&
        (event.pointerType === 'mouse' || event.pointerType === 'pen') &&
        (event.buttons & 1) === 0
      )
        finish();
    };
    const pointerUp = (event: PointerEvent) => {
      if (event.pointerId !== id) return;
      const gesture = active;
      queueMicrotask(() => {
        if (active === gesture) finish();
      });
    };
    const hidden = () => {
      if (doc.visibilityState === 'hidden') finish();
    };
    separator._view.on('globalpointermove', move);
    win.addEventListener('pointercancel', pointerCancel, true);
    win.addEventListener('pointermove', lostButtons, true);
    win.addEventListener('pointerup', pointerUp, true);
    win.addEventListener('blur', cancel);
    doc.addEventListener('visibilitychange', hidden);
    focus.element.addEventListener('blur', cancel);
    removeGuards = () => {
      separator._view.off('globalpointermove', move);
      win.removeEventListener('pointercancel', pointerCancel, true);
      win.removeEventListener('pointermove', lostButtons, true);
      win.removeEventListener('pointerup', pointerUp, true);
      win.removeEventListener('blur', cancel);
      doc.removeEventListener('visibilitychange', hidden);
      focus.element.removeEventListener('blur', cancel);
    };
  };
  const down = (event: Pointer) => {
    if (
      disposed ||
      active ||
      props.disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      !focus.focus()
    )
      return;
    const point = local(event);
    if (!Number.isFinite(point)) return;
    event.preventDefault();
    event.stopPropagation();
    active = { id: event.pointerId, offset: point - current() };
    guard(active.id);
    setDragging(true);
  };
  const up = (event: Pointer) => {
    if (event.pointerId !== active?.id) return;
    try {
      if (event.button === 0) move(event);
    } finally {
      finish();
    }
  };
  const cancel = (event: Pointer) => {
    if (event.pointerId === active?.id) finish();
  };
  separator._view.on('pointerdown', down);
  separator._view.on('pointerup', up);
  separator._view.on('pointerupoutside', up);
  separator._view.on('pointercancel', cancel);
  const stopLayout = node.observeLayout(() => {
    const next = vertical()
      ? node._layoutNode.getComputedHeight()
      : node._layoutNode.getComputedWidth();
    if (next !== extent()) {
      finish();
      setExtent(next);
    }
    if (!node.isVisible) finish();
  });
  createEffect(() => {
    void props.orientation;
    void props.disabled;
    void props.minSize;
    void props.maxSize;
    void props.minSecondSize;
    void thickness();
    finish();
    separator._view.cursor = props.disabled
      ? 'default'
      : vertical()
        ? 'row-resize'
        : 'col-resize';
    focus.element.setAttribute(
      'aria-orientation',
      vertical() ? 'horizontal' : 'vertical',
    );
  });
  const stopSeparatorDestroy = separator.onDestroy(finish);
  onCleanup(() => {
    disposed = true;
    finish();
    stopLayout();
    stopSeparatorDestroy();
    separator._view.off('pointerdown', down);
    separator._view.off('pointerup', up);
    separator._view.off('pointerupoutside', up);
    separator._view.off('pointercancel', cancel);
  });
  return node;
}

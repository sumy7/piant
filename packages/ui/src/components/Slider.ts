import {
  CustomView,
  createEffect,
  createMemo,
  createState,
  type Getter,
  onCleanup,
  type PixiEventHandler,
  type PNode,
  root,
  type StyleValue,
  untrack,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { createFocusable } from '../primitives/createFocusable';
import { createPressable } from '../primitives/createPressable';
import { useUIFocus } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { getSliderRange } from './internal/sliderValue';

export interface SliderProps {
  name: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Horizontal visual and Left/Right direction. Vertical values increase upward. */
  dir?: 'ltr' | 'rtl';
  disabled?: boolean;
  description?: string;
  valueText?: (value: number) => string;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof CustomView>[0]['ref'];
}

type Pointer = Parameters<PixiEventHandler<PNode, 'pointerdown'>>[0];

/** A single, stepped value with a Canvas track and one focusable range proxy. */
export function Slider(
  props: SliderProps,
): Getter<ReturnType<typeof CustomView>> {
  useUIFocus();
  let disposed = false;
  let stop = () => {};
  let removeDestroy = () => {};
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  const result = root((cleanup) => {
    stop = cleanup;
    return createMemo(() =>
      untrack(() => {
        try {
          const node = renderSlider(props);
          removeDestroy = node.onDestroy(dispose);
          props.ref?.(node);
          return node;
        } catch (error) {
          dispose();
          throw error;
        }
      }),
    );
  });
  onCleanup(dispose);
  return result;
}

function renderSlider(props: SliderProps): ReturnType<typeof CustomView> {
  const theme = useUITheme();
  const range = createMemo(
    () => getSliderRange(props.min, props.max, props.step),
    getSliderRange(props.min, props.max, props.step),
  );
  const name = () => {
    const value = props.name?.trim();
    if (!value) throw new Error('Slider requires a non-empty accessible name.');
    return value;
  };
  name();
  const vertical = () => props.orientation === 'vertical';
  const reversed = () => vertical() || props.dir === 'rtl';
  const [value, setValue] = createControllableState({
    get value() {
      return props.value;
    },
    defaultValue: range().normalize(props.defaultValue ?? range().min),
    onChange: (next) => props.onValueChange?.(next),
  });
  const current = () => range().normalize(value());
  current();
  const [dragging, setDragging] = createState(false);
  let hovered = () => false;
  let focusVisible = () => false;
  let size = { width: 0, height: 0 };
  let active: { id: number; offset: number } | undefined;
  let removeGuards = () => {};
  let disposed = false;
  function geometry() {
    const main = vertical() ? size.height : size.width;
    const cross = vertical() ? size.width : size.height;
    const radius = Math.max(0, Math.min(10, cross / 2 - 5, main / 2 - 5));
    const inset = radius + 5;
    return {
      radius,
      inset,
      length: Math.max(0, main - inset * 2),
      cross: cross / 2,
    };
  }
  const node = CustomView({
    get style(): StyleValue<ViewStyles> {
      return [
        {
          width: vertical() ? theme().controlSize.md : '100%',
          height: vertical() ? 160 : theme().controlSize.md,
          minWidth: vertical()
            ? theme().controlSize.md
            : theme().controlSize.md * 2,
          minHeight: theme().controlSize.md,
          flexShrink: 0,
          opacity: props.disabled ? 0.5 : 1,
        },
        props.style,
      ];
    },
    onDraw(graphics, width, height) {
      if (graphics.destroyed) return;
      size = { width, height };
      graphics.clear();
      if (width <= 0 || height <= 0) return;
      const g = geometry();
      const ratio = range().ratio(current());
      const fraction = reversed() ? 1 - ratio : ratio;
      const center = g.inset + fraction * g.length;
      const thickness = Math.min(4, vertical() ? width : height);
      const colors = theme().colors;
      const track = (from: number, length: number, color: string) => {
        if (length <= 0 || thickness <= 0) return;
        graphics
          .roundRect(
            vertical() ? g.cross - thickness / 2 : from,
            vertical() ? from : g.cross - thickness / 2,
            vertical() ? thickness : length,
            vertical() ? length : thickness,
            thickness / 2,
          )
          .fill(color);
      };
      track(g.inset, g.length, colors.border);
      track(reversed() ? center : g.inset, ratio * g.length, colors.primary);
      const x = vertical() ? g.cross : center;
      const y = vertical() ? center : g.cross;
      if (focusVisible() && !props.disabled)
        graphics
          .circle(x, y, g.radius + 4)
          .stroke({ color: colors.focusRing, width: 2 });
      graphics
        .circle(x, y, g.radius)
        .fill(
          !props.disabled && (dragging() || hovered())
            ? colors.primary
            : colors.surface,
        )
        .stroke({ color: colors.primary, width: 2 });
    },
  });
  const focusable = createFocusable(node, {
    role: 'slider',
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
      return {
        now: current(),
        min: range().min,
        max: range().max,
        text: props.valueText?.(current()),
      };
    },
    onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      let next: number;
      switch (event.key) {
        case 'Home':
          next = range().min;
          break;
        case 'End':
          next = range().last;
          break;
        case 'ArrowUp':
          next = current() + range().step;
          break;
        case 'ArrowDown':
          next = current() - range().step;
          break;
        case 'ArrowRight':
          next =
            current() +
            range().step * (!vertical() && props.dir === 'rtl' ? -1 : 1);
          break;
        case 'ArrowLeft':
          next =
            current() -
            range().step * (!vertical() && props.dir === 'rtl' ? -1 : 1);
          break;
        default:
          return;
      }
      event.preventDefault();
      finish();
      change(next);
    },
  });
  const pressable = createPressable(node, {
    get disabled() {
      return props.disabled;
    },
  });
  hovered = pressable.hovered;
  focusVisible = focusable.focusVisible;
  function finish() {
    active = undefined;
    removeGuards();
    removeGuards = () => {};
    setDragging(false);
  }
  function usable() {
    return (
      !disposed &&
      !node.isDestroyed &&
      node.isVisible &&
      !props.disabled &&
      focusable.focused()
    );
  }
  function change(next: number) {
    if (!usable() || !Number.isFinite(next)) return;
    const normalized = range().normalize(next);
    if (!Object.is(normalized, current())) setValue(normalized);
  }
  function local(event: Pointer) {
    const point = event.getLocalPosition(node._view);
    return {
      main: vertical() ? point.y : point.x,
      cross: vertical() ? point.x : point.y,
    };
  }
  function move(event: Pointer) {
    if (!active || active.id !== event.pointerId) return;
    if (!usable()) {
      finish();
      return;
    }
    const point = local(event);
    const g = geometry();
    if (
      !Number.isFinite(point.main) ||
      !Number.isFinite(point.cross) ||
      g.length <= 0
    ) {
      finish();
      return;
    }
    const fraction = (point.main - active.offset - g.inset) / g.length;
    change(range().fromRatio(reversed() ? 1 - fraction : fraction));
  }
  function guard(id: number) {
    const win = focusable.element.ownerDocument.defaultView!;
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
      // Pixi's window listener delivers the final local pointerup first.
      const gesture = active;
      queueMicrotask(() => {
        if (active === gesture) finish();
      });
    };
    const hidden = () => {
      if (doc.visibilityState === 'hidden') finish();
    };
    node._view.on('globalpointermove', move);
    win.addEventListener('pointercancel', pointerCancel, true);
    win.addEventListener('pointermove', lostButtons, true);
    win.addEventListener('pointerup', pointerUp, true);
    win.addEventListener('blur', cancel);
    doc.addEventListener('visibilitychange', hidden);
    focusable.element.addEventListener('blur', cancel);
    removeGuards = () => {
      node._view.off('globalpointermove', move);
      win.removeEventListener('pointercancel', pointerCancel, true);
      win.removeEventListener('pointermove', lostButtons, true);
      win.removeEventListener('pointerup', pointerUp, true);
      win.removeEventListener('blur', cancel);
      doc.removeEventListener('visibilitychange', hidden);
      focusable.element.removeEventListener('blur', cancel);
    };
  }
  const down = (event: Pointer) => {
    if (
      disposed ||
      active ||
      props.disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      !focusable.focus()
    )
      return;
    const point = local(event);
    const g = geometry();
    if (
      !Number.isFinite(point.main) ||
      !Number.isFinite(point.cross) ||
      g.length <= 0
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const center =
      g.inset +
      (reversed() ? 1 - range().ratio(current()) : range().ratio(current())) *
        g.length;
    const offset =
      Math.hypot(point.main - center, point.cross - g.cross) <= g.radius + 2
        ? point.main - center
        : 0;
    const gesture = { id: event.pointerId, offset };
    active = gesture;
    guard(gesture.id);
    setDragging(true);
    if (active === gesture) move(event);
  };
  const up = (event: Pointer) => {
    if (active?.id !== event.pointerId) return;
    try {
      if (event.button === 0) move(event);
    } finally {
      finish();
    }
  };
  const cancel = (event: Pointer) => {
    if (active?.id === event.pointerId) finish();
  };
  const previousHitArea = node._view.hitArea;
  const previousCursor = node._view.cursor;
  node._view.hitArea = {
    contains: (x, y) => x >= 0 && y >= 0 && x <= size.width && y <= size.height,
  };
  node._view.on('pointerdown', down);
  node._view.on('pointerup', up);
  node._view.on('pointerupoutside', up);
  node._view.on('pointercancel', cancel);
  const stopLayout = node.observeLayout(() => {
    if (active && !node.isVisible) finish();
  });
  createEffect(() => {
    void range();
    void props.orientation;
    void props.dir;
    void props.disabled;
    finish();
    node._view.cursor = props.disabled ? 'default' : 'pointer';
    focusable.element.setAttribute(
      'aria-orientation',
      vertical() ? 'vertical' : 'horizontal',
    );
    focusable.element.setAttribute('dir', props.dir ?? 'ltr');
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    finish();
    stopLayout();
    removeDestroy();
    node._view.off('pointerdown', down);
    node._view.off('globalpointermove', move);
    node._view.off('pointerup', up);
    node._view.off('pointerupoutside', up);
    node._view.off('pointercancel', cancel);
    if (!node._view.destroyed) {
      node._view.hitArea = previousHitArea;
      node._view.cursor = previousCursor;
    }
  };
  const removeDestroy = node.onDestroy(dispose);
  onCleanup(dispose);
  return node;
}

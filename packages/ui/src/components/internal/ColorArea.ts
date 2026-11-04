import {
  acquireInteractive,
  attachDOMElement,
  CustomView,
  createEffect,
  createState,
  isComposingInput,
  onCleanup,
  type PixiEventHandler,
  type PNode,
  type StyleValue,
  untrack,
  type ViewStyles,
} from '@piant/core';
import {
  createFocusable,
  linkFocusableDescription,
} from '../../primitives/createFocusable';
import {
  getFocusScope,
  setAttribute,
  useUIFocus,
} from '../../primitives/focusScope';
import { useUITheme } from '../../theme/UIProvider';
import { type Hsva, hsvaToRgba, normalizeHsva } from './colorValue';
import { componentRoot } from './componentRoot';

export interface ColorAreaProps {
  name: string;
  value: Hsva;
  onValueChange: (next: Hsva) => void;
  disabled?: boolean;
  readOnly?: boolean;
  description?: string;
  /** Existing visible instructions describing the numeric channel alternatives. */
  descriptionId?: string;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof CustomView>[0]['ref'];
}
type Pointer = Parameters<PixiEventHandler<PNode, 'pointerdown'>>[0];

/** Internal two-axis editor. Its group semantics do not pretend to be a 1D range. */
export function ColorArea(
  props: ColorAreaProps,
): ReturnType<typeof componentRoot> {
  useUIFocus();
  return componentRoot(() => {
    const node = renderColorArea(props);
    props.ref?.(node);
    return node;
  });
}

function renderColorArea(props: ColorAreaProps): ReturnType<typeof CustomView> {
  const scope = getFocusScope();
  const theme = useUITheme();
  const current = () => normalizeHsva(props.value);
  current();
  const name = () => {
    if (!props.name?.trim())
      throw new Error('ColorArea requires a non-empty name.');
    return props.name;
  };
  name();
  const [dragging, setDragging] = createState(false);
  let focusVisible = () => false;
  let size = { width: 0, height: 0 };
  const node = CustomView({
    get style(): StyleValue<ViewStyles> {
      return [
        {
          width: '100%',
          height: 160,
          minWidth: 80,
          minHeight: 80,
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
      const value = current();
      const pure = hsvaToRgba({ ...value, s: 1, v: 1, a: 1 });
      graphics
        .rect(0, 0, width, height)
        .fill((pure.r << 16) | (pure.g << 8) | pure.b);
      // Fixed-size sRGB overlays; gradient work never scales with pixel area.
      for (let index = 0; index < 256; index++)
        graphics
          .rect((index * width) / 256, 0, width / 256, height)
          .fill({ color: 0xffffff, alpha: 1 - index / 255 });
      for (let index = 0; index < 256; index++)
        graphics
          .rect(0, (index * height) / 256, width, height / 256)
          .fill({ color: 0x000000, alpha: index / 255 });
      graphics
        .rect(1, 1, Math.max(0, width - 2), Math.max(0, height - 2))
        .stroke({
          color: focusVisible()
            ? theme().colors.focusRing
            : theme().colors.border,
          width: focusVisible() ? 2 : 1,
        });
      const x = value.s * width,
        y = (1 - value.v) * height;
      graphics
        .circle(x, y, dragging() ? 6 : 5)
        .stroke({ color: 0x000000, width: 4 });
      graphics
        .circle(x, y, dragging() ? 6 : 5)
        .stroke({ color: 0xffffff, width: 2 });
    },
  });
  const element = document.createElement('div');
  element.setAttribute('role', 'group');
  element.style.cssText = 'opacity:0;pointer-events:none;';
  const binding = attachDOMElement(node, element);
  const focus = createFocusable(node, {
    domElement: binding,
    get name() {
      return name();
    },
    get description() {
      return props.description;
    },
    onKeyDown(event) {
      if (
        props.disabled ||
        props.readOnly ||
        isComposingInput(event) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const value = current();
      let s = value.s,
        v = value.v;
      switch (event.key) {
        case 'ArrowLeft':
          s -= 0.01;
          break;
        case 'ArrowRight':
          s += 0.01;
          break;
        case 'ArrowUp':
          v += 0.01;
          break;
        case 'ArrowDown':
          v -= 0.01;
          break;
        default:
          return;
      }
      event.preventDefault();
      finish();
      change(Math.round(s * 1e12) / 1e12, Math.round(v * 1e12) / 1e12);
    },
  });
  focusVisible = focus.focusVisible;
  createEffect(() => {
    const releases = (props.descriptionId ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => linkFocusableDescription(node, id));
    onCleanup(() => {
      for (const release of releases) release();
    });
  });
  let active: { id: number } | undefined;
  let removeGuards = () => {};
  let disposed = false;
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
      !props.readOnly &&
      focus.focused()
    );
  }
  function change(s: number, v: number) {
    if (!usable() || !Number.isFinite(s) || !Number.isFinite(v)) return;
    const before = current();
    const next = normalizeHsva({ ...before, s, v });
    if (next.s !== before.s || next.v !== before.v) props.onValueChange(next);
  }
  function move(event: Pointer) {
    if (!active || active.id !== event.pointerId) return;
    if (!usable()) {
      finish();
      return;
    }
    const point = event.getLocalPosition(node._view);
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      finish();
      return;
    }
    change(point.x / size.width, 1 - point.y / size.height);
  }
  function guard(id: number) {
    const win = element.ownerDocument.defaultView!;
    const doc = element.ownerDocument;
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
    node._view.on('globalpointermove', move);
    win.addEventListener('pointercancel', pointerCancel, true);
    win.addEventListener('pointermove', lostButtons, true);
    win.addEventListener('pointerup', pointerUp, true);
    win.addEventListener('blur', cancel);
    doc.addEventListener('visibilitychange', hidden);
    element.addEventListener('blur', cancel);
    removeGuards = () => {
      node._view.off('globalpointermove', move);
      win.removeEventListener('pointercancel', pointerCancel, true);
      win.removeEventListener('pointermove', lostButtons, true);
      win.removeEventListener('pointerup', pointerUp, true);
      win.removeEventListener('blur', cancel);
      doc.removeEventListener('visibilitychange', hidden);
      element.removeEventListener('blur', cancel);
    };
  }
  function down(event: Pointer) {
    if (
      disposed ||
      active ||
      props.disabled ||
      props.readOnly ||
      event.button !== 0 ||
      event.isPrimary === false ||
      !focus.focus() ||
      size.width <= 0 ||
      size.height <= 0
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    active = { id: event.pointerId };
    guard(event.pointerId);
    setDragging(true);
    move(event);
  }
  function up(event: Pointer) {
    if (active?.id !== event.pointerId) return;
    try {
      if (event.button === 0) move(event);
    } finally {
      finish();
    }
  }
  const cancel = (event: Pointer) => {
    if (active?.id === event.pointerId) finish();
  };
  const previousHitArea = node._view.hitArea;
  const previousCursor = node._view.cursor;
  // Native bindings do not acquire Pixi interactivity for their Canvas node.
  const releaseInteractive = acquireInteractive(node);
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
    const disabled = Boolean(props.disabled);
    const readOnly = Boolean(props.readOnly);
    finish();
    element.inert = disabled;
    setAttribute(element, 'aria-disabled', disabled || undefined);
    node._view.cursor = disabled || readOnly ? 'default' : 'crosshair';
    untrack(() => scope.refresh());
  });
  onCleanup(() => {
    disposed = true;
    finish();
    stopLayout();
    node._view.off('pointerdown', down);
    node._view.off('pointerup', up);
    node._view.off('pointerupoutside', up);
    node._view.off('pointercancel', cancel);
    if (!node._view.destroyed) {
      node._view.hitArea = previousHitArea;
      node._view.cursor = previousCursor;
    }
    releaseInteractive();
    binding.dispose();
  });
  return node;
}

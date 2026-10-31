import {
  acquireInteractive,
  createEffect,
  createState,
  type Getter,
  onCleanup,
  type PixiEventHandler,
  type PNode,
  root,
} from '@piant/core';

type PressEvent = Parameters<PixiEventHandler<PNode, 'pointerup'>>[0];

export interface PressableOptions {
  disabled?: boolean;
  onPress?: PixiEventHandler<PNode, 'pointerup'>;
}

export interface PressableState {
  readonly hovered: Getter<boolean>;
  readonly pressed: Getter<boolean>;
  readonly disabled: Getter<boolean>;
  /** Idempotently cancel and release only this binding's effects/listeners. */
  dispose(): void;
}

/** Pointer behavior only; does not install keyboard, focus, semantics or visuals. */
export function createPressable(
  node: PNode,
  options: PressableOptions = {},
): PressableState {
  const [hovered, setHovered] = createState(false);
  const [pressed, setPressed] = createState(false);
  const [isDisposed, setDisposed] = createState(node.isDestroyed);
  const disabled = () => isDisposed() || disposed || Boolean(options.disabled);
  let disposed = node.isDestroyed;
  let active: { id: number; inside: boolean } | undefined;
  let hoverPointer: number | undefined;
  let removeGuards = () => {};
  let removeDestroy = () => {};
  let disposeEffects = () => {};
  const removers: Array<() => void> = [];
  const releaseInteractive = disposed ? () => {} : acquireInteractive(node);

  function finish(clearHover = false) {
    active = undefined;
    removeGuards();
    removeGuards = () => {};
    setPressed(false);
    if (clearHover) {
      hoverPointer = undefined;
      setHovered(false);
    }
  }
  function guard(gesture: NonNullable<typeof active>) {
    if (typeof window === 'undefined') return;
    const target = window;
    const document = target.document;
    const cancel = () => finish(true);
    const nativeCancel = (event: PointerEvent) => {
      if (event.pointerId === gesture.id) cancel();
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') cancel();
    };
    const lostButtons = (event: PointerEvent) => {
      if (
        event.pointerId === gesture.id &&
        (event.pointerType === 'mouse' || event.pointerType === 'pen') &&
        (event.buttons & 1) === 0
      )
        cancel();
    };
    const nativeUp = (event: PointerEvent) => {
      if (event.pointerId !== gesture.id) return;
      // Pixi also listens on window. Let its hit-tested pointerup run first;
      // this fallback only cancels an unhandled release and never activates.
      queueMicrotask(() => {
        if (!disposed && active === gesture) cancel();
      });
    };
    target.addEventListener('pointercancel', nativeCancel, true);
    target.addEventListener('pointerup', nativeUp, true);
    target.addEventListener('pointermove', lostButtons, true);
    target.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    removeGuards = () => {
      target.removeEventListener('pointercancel', nativeCancel, true);
      target.removeEventListener('pointerup', nativeUp, true);
      target.removeEventListener('pointermove', lostButtons, true);
      target.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  }
  function enter(event: PressEvent) {
    if (active?.id === event.pointerId) {
      active.inside = true;
      setPressed(!disabled());
    }
    if (
      event.pointerType !== 'touch' &&
      event.isPrimary !== false &&
      (hoverPointer === undefined || hoverPointer === event.pointerId)
    ) {
      hoverPointer = event.pointerId;
      setHovered(!disabled());
    }
  }
  function leave(event: PressEvent) {
    if (active?.id === event.pointerId) {
      active.inside = false;
      setPressed(false);
    }
    if (hoverPointer === event.pointerId) {
      hoverPointer = undefined;
      setHovered(false);
    }
  }
  function down(event: PressEvent) {
    if (disabled() || active || event.button !== 0 || event.isPrimary === false)
      return;
    const gesture = { id: event.pointerId, inside: true };
    active = gesture;
    guard(gesture);
    enter(event);
  }
  function up(event: PressEvent) {
    if (!active || active.id !== event.pointerId) return;
    const activate = active.inside && !disabled() && event.button === 0;
    finish(); // Clear before callback: a duplicate up/tap or reentrancy cannot repeat it.
    if (activate && !disabled()) options.onPress?.(event, node);
  }
  function cancel(event: PressEvent) {
    if (active?.id === event.pointerId) finish(true);
    else if (hoverPointer === event.pointerId) {
      hoverPointer = undefined;
      setHovered(false);
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    finish(true);
    setDisposed(true);
    disposeEffects();
    for (const remove of removers) remove();
    removeDestroy();
    releaseInteractive();
  }
  if (!disposed) {
    const listeners = {
      pointerenter: enter,
      pointerleave: leave,
      pointerdown: down,
      pointerup: up,
      pointerupoutside: cancel,
      pointercancel: cancel,
    };
    for (const [name, handler] of Object.entries(listeners)) {
      const event = name as keyof typeof listeners;
      node._view.on(event, handler);
      removers.push(() => node._view.off(event, handler));
    }
    disposeEffects = root((dispose) => {
      createEffect(() => {
        if (disabled()) finish();
        setHovered(!disabled() && hoverPointer !== undefined);
      });
      return dispose;
    });
    removeDestroy = node.onDestroy(dispose);
    onCleanup(dispose);
  }
  return { hovered, pressed, disabled, dispose };
}

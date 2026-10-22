import { acquireInteractive, onCleanup, type PNode } from '@piant/core';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import { PNodeAnimation } from './PNodeAnimation';
import { applyProps, captureInitialProps, expandScale, readAnimatedProps } from './properties';
import type { AnimatableProps } from './types';

export type InteractionOptions = { duration?: number; easing?: string };
export type InteractionHandle = {
  /** Restore the initial properties immediately; listeners remain installed. */
  reset(): void;
  /** Remove this instance's listeners, cancel its animation and restore properties. */
  dispose(): void;
};
export type DragOptions = InteractionOptions & {
  axis?: 'x' | 'y' | 'both';
  /** Translation offsets, in the node's parent coordinate space. */
  bounds?: { minX?: number; maxX?: number; minY?: number; maxY?: number };
  /** Animate back to the initial translation on release (cancel always returns). */
  returnToOrigin?: boolean;
};

function binding(node: PNode, target: AnimatableProps, options: InteractionOptions) {
  const initial = captureInitialProps(node, [{ ...target, offset: 0, easing: 'linear' }]);
  const baseline = readAnimatedProps(node, target);
  const listeners: Array<() => void> = [];
  let disposed = node.isDestroyed;
  let animation: PNodeAnimation | undefined;
  let removeDestroy = () => {};
  const releaseInteractive = disposed ? () => {} : acquireInteractive(node);
  const restore = () => {
    applyProps(node, initial);
    if (Object.hasOwn(initial, 'alpha')) node._animAlpha = initial.alpha ?? null;
    node.markDirty();
  };
  const stop = () => {
    animation?.cancel({ preserve: true });
    animation = undefined;
  };
  const handle: InteractionHandle = {
    reset() {
      if (disposed) return;
      stop();
      restore();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      for (const remove of listeners) remove();
      removeDestroy();
      releaseInteractive();
      restore();
    },
  };
  if (!disposed) {
    removeDestroy = node.onDestroy(handle.dispose);
    onCleanup(handle.dispose);
  }
  return {
    handle,
    listen(name: Parameters<Container['on']>[0], fn: (event: FederatedPointerEvent) => void) {
      if (disposed) return;
      node._view.on(name, fn);
      listeners.push(() => node._view.off(name, fn));
    },
    move(values: AnimatableProps, returning = false) {
      if (disposed) return;
      stop();
      const current = readAnimatedProps(node, values);
      const next = expandScale(values);
      if (Object.entries(next).every(([key, value]) => current[key as keyof AnimatableProps] === value)) {
        if (returning) restore();
        return;
      }
      const running = new PNodeAnimation(node, [current, next], {
        duration: options.duration ?? 150,
        easing: options.easing ?? 'ease-out',
        fill: 'forwards',
      });
      animation = running;
      void running.finished.then(() => {
        if (animation !== running) return;
        animation = undefined;
        if (returning) restore();
      }, () => {});
    },
    write(values: AnimatableProps) {
      if (disposed) return;
      stop();
      applyProps(node, values);
    },
    baseline,
  };
}

/** Animate while a pointer is inside the node. Explicit eventMode:'none' stays disabled. */
export function hover(node: PNode, target: AnimatableProps, options: InteractionOptions = {}): InteractionHandle {
  const state = binding(node, target, options);
  let pointer: number | undefined;
  state.listen('pointerenter', (event) => {
    if (pointer !== undefined) return;
    pointer = event.pointerId;
    state.move(target);
  });
  const leave = (event: FederatedPointerEvent) => {
    if (pointer !== event.pointerId) return;
    pointer = undefined;
    state.move(state.baseline, true);
  };
  state.listen('pointerleave', leave);
  state.listen('pointercancel', leave);
  return { ...state.handle, reset() { pointer = undefined; state.handle.reset(); } };
}

/** Animate one primary press; leaving, outside release and cancellation restore it. */
export function press(node: PNode, target: AnimatableProps, options: InteractionOptions = {}): InteractionHandle {
  const state = binding(node, target, options);
  let pointer: number | undefined;
  state.listen('pointerdown', (event) => {
    if (pointer !== undefined || event.button !== 0) return;
    pointer = event.pointerId;
    state.move(target);
  });
  const release = (event: FederatedPointerEvent) => {
    if (pointer !== event.pointerId) return;
    pointer = undefined;
    state.move(state.baseline, true);
  };
  for (const name of ['pointerleave', 'pointerup', 'pointerupoutside', 'pointercancel'] as const) state.listen(name, release);
  return { ...state.handle, reset() { pointer = undefined; state.handle.reset(); } };
}

/** Drag translation in the transformed parent space using Pixi global pointer moves. */
export function drag(node: PNode, options: DragOptions = {}): InteractionHandle {
  const state = binding(node, { x: 0, y: 0 }, options);
  let active: { id: number; parent: Container; x: number; y: number; offsetX: number; offsetY: number } | undefined;
  state.listen('pointerdown', (event) => {
    const parent = node._view.parent;
    if (active || event.button !== 0 || !parent) return;
    // Interrupt a return animation without jumping back to its start.
    state.write(readAnimatedProps(node, { x: 0, y: 0 }));
    const point = parent.toLocal(event.global);
    active = { id: event.pointerId, parent, x: point.x, y: point.y, offsetX: node._animTranslate.x, offsetY: node._animTranslate.y };
  });
  state.listen('globalpointermove', (event) => {
    if (!active || active.id !== event.pointerId) return;
    if (node._view.parent !== active.parent) {
      active = undefined;
      state.move(state.baseline, true);
      return;
    }
    const point = active.parent.toLocal(event.global);
    const bounds = options.bounds;
    const clamp = (value: number, min = -Infinity, max = Infinity) => Math.min(max, Math.max(min, value));
    state.write({
      ...(options.axis === 'y' ? {} : { x: clamp(active.offsetX + point.x - active.x, bounds?.minX, bounds?.maxX) }),
      ...(options.axis === 'x' ? {} : { y: clamp(active.offsetY + point.y - active.y, bounds?.minY, bounds?.maxY) }),
    });
  });
  const release = (event: FederatedPointerEvent) => {
    if (!active || active.id !== event.pointerId) return;
    active = undefined;
    if (options.returnToOrigin || event.type === 'pointercancel') state.move(state.baseline, true);
  };
  for (const name of ['pointerup', 'pointerupoutside', 'pointercancel'] as const) state.listen(name, release);
  return { ...state.handle, reset() { active = undefined; state.handle.reset(); } };
}

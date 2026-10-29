import { createEffect, onCleanup, type PNode, root } from '@piant/core';
import { normalizeKeyframes } from './interpolate';
import { PNodeAnimation } from './PNodeAnimation';
import { applyProps, captureInitialProps, expandScale, type PropertySnapshot, readAnimatedProps } from './properties';
import type { AnimatableProps, AnimationOptions } from './types';

export type BindAnimationOptions = Pick<Exclude<AnimationOptions, number>, 'duration' | 'delay' | 'endDelay' | 'easing'> & {
  /** Applied immediately before the first target is animated. */
  initial?: AnimatableProps;
};

export interface AnimationBinding {
  readonly animation: PNodeAnimation | undefined;
  /** Freeze at the current value until the target changes. */
  cancel(): void;
  /** Restore the initial snapshot until the target changes. */
  reset(): void;
  /** Stop observing and freeze the current value. Idempotent. */
  dispose(): void;
}

/** Tween reactive targets from their current displayed values. */
export function bindAnimation(
  node: PNode,
  target: () => AnimatableProps,
  options: BindAnimationOptions = {},
): AnimationBinding {
  const { initial, ...timing } = options;
  let animation: PNodeAnimation | undefined;
  let previous: AnimatableProps | undefined;
  const original: PropertySnapshot = {};
  let disposeEffect = () => {};
  let disposed = false;
  const cancel = () => animation?.cancel({ preserve: true });
  let removeDestroyListener = () => {};
  const binding: AnimationBinding = {
    get animation() { return animation; },
    cancel,
    reset() {
      if (disposed) return;
      cancel();
      applyProps(node, original);
      if (Object.hasOwn(original, 'alpha')) node._animAlpha = original.alpha ?? null;
      node.markDirty();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeEffect();
      cancel();
      removeDestroyListener();
    },
  };
  onCleanup(binding.dispose);
  if (node.isDestroyed) {
    binding.dispose();
    return binding;
  }
  removeDestroyListener = node.onDestroy(binding.dispose);
  root((dispose) => {
    disposeEffect = dispose;
    createEffect(() => {
      const { offset: _offset, easing: _easing, ...next } = normalizeKeyframes([expandScale({ ...target() })])[0];
      if (previous && sameTarget(previous, next)) return;
      const captured = captureInitialProps(node, [{ ...expandScale(initial ?? {}), ...next, offset: 0, easing: 'linear' }]);
      for (const key of Object.keys(captured) as Array<keyof AnimatableProps>) {
        if (!Object.hasOwn(original, key)) Object.assign(original, { [key]: captured[key] });
      }
      if (!previous && initial) applyProps(node, initial);
      previous = next;
      cancel();
      const from = readAnimatedProps(node, next);
      if (sameTarget(from, next)) return;
      animation = new PNodeAnimation(node, [from, next], { ...timing, fill: 'forwards' });
    });
  });
  return binding;
}

function sameTarget(a: AnimatableProps, b: AnimatableProps): boolean {
  const keys = Object.keys(a) as Array<keyof AnimatableProps>;
  return keys.length === Object.keys(b).length && keys.every((key) => {
    const left = a[key];
    const right = b[key];
    return Array.isArray(left) && Array.isArray(right)
      ? left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
      : Object.is(left, right);
  });
}

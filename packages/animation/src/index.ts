import { PNode } from '@piant/core';
import { PNodeAnimation } from './PNodeAnimation';
import type { AnimationOptions, KeyframeEffect } from './types';

// ── Module augmentation: add .animate() to PNode ──────────────────────────
declare module '@piant/core' {
  interface PNode {
    /**
     * Animate the node using a Web Animation API-inspired interface.
     *
     * @param keyframes - Keyframes as an array or property-indexed object.
     * @param options   - Duration (ms) or an AnimationOptions object.
     * @returns         A PNodeAnimation instance that can be paused, cancelled, etc.
     *
     * @example
     * ```ts
     * import '@piant/animation'; // installs PNode.prototype.animate
     *
     * const anim = node.animate(
     *   [{ alpha: 0 }, { alpha: 1 }],
     *   { duration: 500, easing: 'ease-in-out', fill: 'forwards' },
     * );
     * await anim.finished;
     * ```
     */
    animate(keyframes: KeyframeEffect, options?: AnimationOptions): PNodeAnimation;
  }
}

// Install the method on the prototype (side-effect of importing this package)
if (!('animate' in PNode.prototype)) {
  Object.defineProperty(PNode.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: function animatePNode(
      this: PNode,
      keyframes: KeyframeEffect,
      options?: AnimationOptions,
    ): PNodeAnimation {
      return new PNodeAnimation(this, keyframes, options);
    },
  });
}

// ── Public exports ────────────────────────────────────────────────────────

export { PNodeAnimation } from './PNodeAnimation';
export type {
  AnimatableProps,
  AnimationOptions,
  AnimationPlaybackEvent,
  Keyframe,
  KeyframeEffect,
  NormalizedKeyframe,
  PlayState,
  PropertyIndexedKeyframes,
  ResolvedOptions,
} from './types';
export { parseEasing } from './easing';
export type { EasingFunction } from './easing';
export { normalizeKeyframes, interpolateKeyframes } from './interpolate';

/**
 * Standalone helper: animate a PNode without the prototype method.
 *
 * @example
 * ```ts
 * import { animate } from '@piant/animation';
 * const anim = animate(node, [{ x: 0 }, { x: 200 }], 600);
 * ```
 */
export function animate(
  node: PNode,
  keyframes: KeyframeEffect,
  options?: AnimationOptions,
): PNodeAnimation {
  return new PNodeAnimation(node, keyframes, options);
}

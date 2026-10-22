import { onCleanup, type PNode, type TransitionEvents } from '@piant/core';
import { PNodeAnimation } from './PNodeAnimation';
import { applyProps, expandScale, readAnimatedProps } from './properties';
import type { AnimatableProps, AnimationOptions } from './types';

export type PresetOptions = Pick<Exclude<AnimationOptions, number>, 'duration' | 'delay' | 'endDelay' | 'easing'>;
export type SlideOptions = PresetOptions & { x?: number; y?: number };
export type ScaleOptions = PresetOptions & { from?: number };

/** Enter at alpha 0, leave at alpha 0; preserve the node's original alpha. */
export function fade(options: PresetOptions = {}): TransitionEvents {
  return preset({ alpha: 0 }, options);
}

/** Translation offsets are relative to the node's original animation offset. */
export function slide(options: SlideOptions = {}): TransitionEvents {
  const { x = 0, y = 24, ...timing } = options;
  return preset({ x, y }, timing, true);
}

/** Enter and leave at `from` times the original scale (default 0.9). */
export function scale(options: ScaleOptions = {}): TransitionEvents {
  const { from = 0.9, ...timing } = options;
  return preset({ scaleX: from, scaleY: from }, timing, true);
}

function preset(hidden: AnimatableProps, timing: PresetOptions, relative = false): TransitionEvents {
  const states = new Map<PNode, {
    shown: AnimatableProps;
    hidden: AnimatableProps;
    animation?: PNodeAnimation;
    removeDestroy: () => void;
  }>();
  const forget = (node: PNode) => {
    const state = states.get(node);
    state?.animation?.cancel({ preserve: true });
    state?.removeDestroy();
    states.delete(node);
  };
  onCleanup(() => { for (const node of states.keys()) forget(node); });
  const getState = (node: PNode) => {
    const existing = states.get(node);
    if (existing) return existing;
    const shown = readAnimatedProps(node, hidden);
    const concealed = { ...hidden };
    if (relative) {
      for (const key of Object.keys(concealed) as Array<keyof AnimatableProps>) {
        const base = shown[key];
        const value = concealed[key];
        if (typeof base === 'number' && typeof value === 'number') {
          Object.assign(concealed, { [key]: key.startsWith('scale') ? base * value : base + value });
        }
      }
    }
    const state = { shown, hidden: concealed, animation: undefined as PNodeAnimation | undefined, removeDestroy: () => {} };
    states.set(node, state);
    state.removeDestroy = node.onDestroy(() => forget(node));
    return state;
  };
  const run = (node: PNode, done: () => void, entering: boolean) => {
    if (node.isDestroyed) { done(); return () => {}; }
    const state = getState(node);
    const interrupted = state.animation !== undefined;
    state.animation?.cancel({ preserve: true });
    if (entering && !interrupted) applyProps(node, state.hidden);
    const target = expandScale(entering ? state.shown : state.hidden);
    const animation = new PNodeAnimation(node, [readAnimatedProps(node, target), target], { ...timing, fill: 'forwards' });
    state.animation = animation;
    let active = true;
    void animation.finished.then(() => {
      if (!active) return;
      // Completed exits can be reused later with the same original baseline.
      done();
    }, () => {});
    return () => {
      active = false;
      animation.cancel({ preserve: true });
    };
  };
  return {
    onEnter: (node: PNode, done) => run(node, done, true),
    onExit: (node: PNode, done) => run(node, done, false),
  };
}

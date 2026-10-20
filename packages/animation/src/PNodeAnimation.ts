import type { PNode } from '@piant/core';
import { Ticker } from 'pixi.js';
import { interpolateKeyframes, normalizeKeyframes } from './interpolate';
import type {
  AnimatableProps,
  AnimationOptions,
  AnimationPlaybackEvent,
  KeyframeEffect,
  NormalizedKeyframe,
  PlayState,
  ResolvedOptions,
} from './types';

/** Resolve raw options to a fully filled ResolvedOptions object. */
function resolveOptions(opts: AnimationOptions | undefined): ResolvedOptions {
  if (typeof opts === 'number') {
    return {
      duration: opts,
      delay: 0,
      endDelay: 0,
      easing: 'linear',
      iterations: 1,
      direction: 'normal',
      fill: 'none',
      playbackRate: 1,
    };
  }
  return {
    duration: opts?.duration ?? 300,
    delay: opts?.delay ?? 0,
    endDelay: opts?.endDelay ?? 0,
    easing: opts?.easing ?? 'linear',
    iterations: opts?.iterations ?? 1,
    direction: opts?.direction ?? 'normal',
    fill: opts?.fill ?? 'none',
    playbackRate: opts?.playbackRate ?? 1,
  };
}

/**
 * Snapshot the current animated properties of a node for "fill: none" restore.
 */
function captureInitialProps(
  node: PNode,
  keyframes: NormalizedKeyframe[],
): AnimatableProps {
  const initial: AnimatableProps = {
    x: node._animTranslate.x,
    y: node._animTranslate.y,
    alpha: node._animAlpha ?? undefined,
    scaleX: node._view.scale.x,
    scaleY: node._view.scale.y,
    rotation: node._view.rotation,
    opacity: node._layoutStyle.opacity,
    backgroundColor: node._layoutStyle.backgroundColor,
    borderRadius: node._layoutStyle.borderRadius,
    borderTopLeftRadius: node._layoutStyle.borderTopLeftRadius,
    borderTopRightRadius: node._layoutStyle.borderTopRightRadius,
    borderBottomRightRadius: node._layoutStyle.borderBottomRightRadius,
    borderBottomLeftRadius: node._layoutStyle.borderBottomLeftRadius,
    width:
      typeof node._layoutStyle.width === 'number'
        ? node._layoutStyle.width
        : undefined,
    height:
      typeof node._layoutStyle.height === 'number'
        ? node._layoutStyle.height
        : undefined,
  };
  const animatedKeys = new Set(keyframes.flatMap((frame) => Object.keys(frame)));
  if (animatedKeys.has('scale')) {
    animatedKeys.add('scaleX');
    animatedKeys.add('scaleY');
  }
  // Restoring one animation must not reset independent animations on this node.
  return Object.fromEntries(
    Object.entries(initial).filter(([key]) => animatedKeys.has(key)),
  );
}

/**
 * Apply a set of AnimatableProps to a PNode.
 * Transform props are set on the Pixi Container directly;
 * style props go through PNode.setStyle() to trigger layout.
 */
function applyProps(node: PNode, props: AnimatableProps): void {
  let needsDirty = false;

  if (props.x !== undefined || props.y !== undefined) {
    node._animTranslate.x = props.x ?? node._animTranslate.x;
    node._animTranslate.y = props.y ?? node._animTranslate.y;
    needsDirty = true;
  }

  if (props.alpha !== undefined) {
    node._animAlpha = props.alpha;
    needsDirty = true;
  }

  if (props.scale !== undefined) {
    node._view.scale.x = props.scale;
    node._view.scale.y = props.scale;
  }
  if (props.scaleX !== undefined) node._view.scale.x = props.scaleX;
  if (props.scaleY !== undefined) node._view.scale.y = props.scaleY;
  if (props.rotation !== undefined) node._view.rotation = props.rotation;

  // Style props that go through layout
  const styleKeys: Array<keyof AnimatableProps> = [
    'opacity',
    'backgroundColor',
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
    'width',
    'height',
  ];
  const styleUpdate: Record<string, unknown> = {};
  let hasStyle = false;
  for (const key of styleKeys) {
    // Check own properties so that restore calls with undefined-valued keys (i.e.
    // props that were unset initially) still call setStyle() and clear any
    // animated value — preventing stale values after fill:'none' or cancel().
    if (Object.hasOwn(props, key)) {
      styleUpdate[key] = props[key];
      hasStyle = true;
    }
  }
  if (hasStyle) {
    node.setStyle(styleUpdate as Parameters<PNode['setStyle']>[0]);
    needsDirty = false; // setStyle already marks dirty
  }

  if (needsDirty) {
    node.markDirty();
  }
}

/**
 * A Web Animation API-inspired animation controller for PNode.
 *
 * Created by calling `node.animate(keyframes, options)`.
 * Backed by the Pixi.js shared Ticker for frame-perfect updates.
 * Uses popmotion utilities for easing and value interpolation.
 */
export class PNodeAnimation {
  // ── Public Web Animation API surface ─────────────────────────────────────

  /** Fires when the animation reaches its natural end. */
  onfinish: ((event: AnimationPlaybackEvent) => void) | null = null;
  /** Fires when the animation is cancelled. */
  oncancel: ((event: AnimationPlaybackEvent) => void) | null = null;
  /** Resolves when the animation finishes normally; rejects on cancel. */
  readonly finished: Promise<PNodeAnimation>;
  /**
   * Resolves once the animation is ready to start (immediately, since we have
   * no asynchronous preparation step).
   */
  readonly ready: Promise<PNodeAnimation>;

  // ── Private state ─────────────────────────────────────────────────────────

  private readonly _node: PNode;
  private readonly _keyframes: NormalizedKeyframe[];
  private readonly _opts: ResolvedOptions;

  private _playState: PlayState = 'idle';
  /** Accumulated local animation time in ms (including delay and endDelay) */
  private _elapsed = 0;
  private _playbackRate: number;

  private _tickerFn: ((ticker: Ticker) => void) | null = null;
  private _finishResolve: ((a: PNodeAnimation) => void) | null = null;
  private _finishReject: ((err: Error) => void) | null = null;
  private readonly _initialProps: AnimatableProps;

  // ── Constructor ───────────────────────────────────────────────────────────

  constructor(node: PNode, effect: KeyframeEffect, options?: AnimationOptions) {
    this._node = node;
    this._opts = resolveOptions(options);
    this._playbackRate = this._opts.playbackRate;
    this._keyframes = normalizeKeyframes(effect, this._opts.easing);
    this._initialProps = captureInitialProps(node, this._keyframes);

    this.finished = new Promise<PNodeAnimation>((resolve, reject) => {
      this._finishResolve = resolve;
      this._finishReject = reject;
    });
    this.ready = Promise.resolve(this);

    // Apply fill='backwards' / 'both' initial state during delay
    if (this._opts.fill === 'backwards' || this._opts.fill === 'both') {
      this._applyAtProgress(this._getDirectedProgress(0, 0));
    }

    this.play();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get playState(): PlayState {
    return this._playState;
  }

  /** Local animation time in ms, including delay and endDelay. */
  get currentTime(): number {
    return this._elapsed;
  }

  /** Seek and sample immediately without changing playState or finished. */
  set currentTime(ms: number) {
    this._elapsed = Math.max(0, ms);
    this._applyAtCurrentTime();
  }

  get playbackRate(): number {
    return this._playbackRate;
  }

  set playbackRate(rate: number) {
    this._playbackRate = rate;
  }

  /** Start or resume the animation.
   *
   * Note: calling `play()` on a finished animation has no effect.
   * To replay, create a new `PNodeAnimation` via `node.animate()`.
   */
  play(): void {
    if (this._playState === 'finished') return;
    if (this._playState === 'running') return;
    this._playState = 'running';
    this._attachTicker();
  }

  /** Pause the animation at the current time. */
  pause(): void {
    if (this._playState !== 'running') return;
    this._playState = 'paused';
    this._detachTicker();
  }

  /** Cancel the animation and restore properties to their initial state. */
  cancel(): void {
    this._detachTicker();
    this._playState = 'idle';

    // Restore pre-animation state
    this._restoreInitialProps();

    const event = this._makeEvent('cancel');
    this.oncancel?.(event);
    this._finishReject?.(new Error('Animation cancelled'));
    this._finishResolve = null;
    this._finishReject = null;
  }

  /** Jump to the end of the animation immediately. */
  finish(): void {
    this._detachTicker();
    this._completeAnimation();
  }

  /** Reverse the playback direction. */
  reverse(): void {
    this._playbackRate *= -1;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _attachTicker(): void {
    if (this._tickerFn) return;
    this._tickerFn = this._onTick.bind(this);
    Ticker.shared.add(this._tickerFn);
  }

  private _detachTicker(): void {
    if (!this._tickerFn) return;
    Ticker.shared.remove(this._tickerFn);
    this._tickerFn = null;
  }

  private _onTick(ticker: Ticker): void {
    const delta = ticker.deltaMS * this._playbackRate;
    this._elapsed += delta;

    const { delay, duration, iterations, endDelay } = this._opts;

    if (this._playbackRate < 0 && this._elapsed <= 0) {
      this._elapsed = 0;
      this._completeAnimation('start');
      return;
    }

    const activeDuration = iterations === Infinity ? Infinity : duration * iterations;
    if (
      iterations !== Infinity &&
      this._elapsed >= delay &&
      this._elapsed - delay >= activeDuration &&
      this._elapsed >= delay + activeDuration + endDelay
    ) {
      this._completeAnimation();
      return;
    }

    this._applyAtCurrentTime();
  }

  /** Sample the same local timeline for both seeking and ticker updates. */
  private _applyAtCurrentTime(): void {
    const { delay, duration, iterations } = this._opts;
    const activeElapsed = this._elapsed - delay;
    if (activeElapsed < 0 || (this._playbackRate < 0 && this._elapsed === 0)) {
      this._applyBoundary('start');
    } else if (iterations !== Infinity && activeElapsed >= duration * iterations) {
      this._applyBoundary('end');
    } else {
      this._applyAtElapsed(activeElapsed);
    }
  }

  private _applyAtElapsed(activeElapsed: number): void {
    const { duration, iterations } = this._opts;
    const isInfinite = iterations === Infinity;

    let iterProgress: number;
    let iterIndex: number;

    if (isInfinite || duration <= 0) {
      iterProgress = duration <= 0 ? 1 : (activeElapsed % duration) / duration;
      iterIndex = duration <= 0 ? 0 : Math.floor(activeElapsed / duration);
    } else {
      const totalActive = duration * iterations;
      const clamped = Math.min(activeElapsed, totalActive);
      if (clamped >= totalActive) {
        this._applyAtProgress(this._getFinalDirectedProgress());
        return;
      }
      iterIndex = Math.min(
        Math.floor(clamped / duration),
        Math.ceil(iterations) - 1,
      );
      iterProgress = (clamped % duration) / duration;
    }

    const progress = this._getDirectedProgress(iterProgress, iterIndex);
    this._applyAtProgress(progress);
  }

  private _getDirectedProgress(
    iterProgress: number,
    iterIndex: number,
  ): number {
    const dir = this._opts.direction;
    if (dir === 'reverse') return 1 - iterProgress;
    if (dir === 'alternate')
      return iterIndex % 2 === 0 ? iterProgress : 1 - iterProgress;
    if (dir === 'alternate-reverse')
      return iterIndex % 2 === 0 ? 1 - iterProgress : iterProgress;
    return iterProgress; // 'normal'
  }

  private _applyAtProgress(progress: number): void {
    const values = interpolateKeyframes(this._keyframes, progress);
    applyProps(this._node, values);
  }

  private _getFinalDirectedProgress(): number {
    const { iterations } = this._opts;
    if (iterations <= 0) return this._getDirectedProgress(0, 0);

    const finiteIterations = iterations === Infinity ? 1 : iterations;
    const finalIterIdx = Math.max(0, Math.ceil(finiteIterations) - 1);
    const fractionalProgress = finiteIterations % 1;
    const finalIterProgress = fractionalProgress === 0 ? 1 : fractionalProgress;
    return this._getDirectedProgress(finalIterProgress, finalIterIdx);
  }

  private _completeAnimation(boundary: 'start' | 'end' = 'end'): void {
    this._detachTicker();
    this._playState = 'finished';

    this._applyBoundary(boundary);

    const event = this._makeEvent('finish');
    this.onfinish?.(event);
    this._finishResolve?.(this);
    this._finishResolve = null;
    this._finishReject = null;
  }

  /** Apply directional fill or clear a previously sampled active value. */
  private _applyBoundary(boundary: 'start' | 'end'): void {
    const { fill } = this._opts;
    const shouldFill =
      boundary === 'start'
        ? fill === 'backwards' || fill === 'both'
        : fill === 'forwards' || fill === 'both';
    if (shouldFill) {
      const progress =
        boundary === 'start'
          ? this._getDirectedProgress(0, 0)
          : this._getFinalDirectedProgress();
      this._applyAtProgress(progress);
    } else {
      this._restoreInitialProps();
    }
  }

  private _restoreInitialProps(): void {
    applyProps(this._node, this._initialProps);
    // An initially absent alpha override must be cleared, but only if animated here.
    if (Object.hasOwn(this._initialProps, 'alpha')) {
      this._node._animAlpha = this._initialProps.alpha ?? null;
    }
    this._node.markDirty();
  }

  private _makeEvent(type: 'finish' | 'cancel'): AnimationPlaybackEvent {
    return {
      type,
      target: this,
      currentTime: this._elapsed,
      timelineTime: null,
    };
  }
}

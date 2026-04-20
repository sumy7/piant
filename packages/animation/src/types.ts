import type { ColorSource } from 'pixi.js';

/**
 * Properties that can be animated on a PNode.
 *
 * Transform properties are applied directly to the Pixi Container.
 * Style properties trigger layout recalculation via setStyle().
 */
export type AnimatableProps = {
  /** X translation offset from the layout-computed position (px) */
  x?: number;
  /** Y translation offset from the layout-computed position (px) */
  y?: number;
  /** Uniform scale shorthand (applied to both scaleX and scaleY) */
  scale?: number;
  /** X-axis scale factor */
  scaleX?: number;
  /** Y-axis scale factor */
  scaleY?: number;
  /** Rotation in radians */
  rotation?: number;
  /** Alpha (0–1); overrides the opacity layout style during the animation */
  alpha?: number;
  /** Background color */
  backgroundColor?: ColorSource;
  /** Border radius in px */
  borderRadius?: number;
  /** Top-left border radius in px */
  borderTopLeftRadius?: number;
  /** Top-right border radius in px */
  borderTopRightRadius?: number;
  /** Bottom-right border radius in px */
  borderBottomRightRadius?: number;
  /** Bottom-left border radius in px */
  borderBottomLeftRadius?: number;
  /** Width in px */
  width?: number;
  /** Height in px */
  height?: number;
  /** Opacity (0–1); updates the layout style */
  opacity?: number;
};

/**
 * A single keyframe in the animation sequence.
 * Mirrors the Web Animation API Keyframe interface.
 */
export type Keyframe = AnimatableProps & {
  /** Position in the timeline, 0–1. Evenly distributed when omitted. */
  offset?: number;
  /** Easing for the segment starting at this keyframe. */
  easing?: string;
};

/**
 * Property-indexed keyframes format, mirroring the Web Animation API.
 * Each key maps to an array of values (one per implicit keyframe).
 */
export type PropertyIndexedKeyframes = {
  [K in keyof AnimatableProps]?: Array<AnimatableProps[K]>;
} & {
  offset?: number[];
  easing?: string | string[];
};

/** Accepted keyframe formats */
export type KeyframeEffect = Keyframe[] | PropertyIndexedKeyframes;

/** Normalized internal keyframe (offset always present) */
export type NormalizedKeyframe = Required<Pick<Keyframe, 'offset' | 'easing'>> &
  Omit<Keyframe, 'offset' | 'easing'>;

/** Mirrors the Web Animation API AnimationPlaybackEvent */
export type AnimationPlaybackEvent = {
  type: 'finish' | 'cancel';
  target: unknown;
  currentTime: number | null;
  timelineTime: number | null;
};

/** Mirrors the Web Animation API PlayState */
export type PlayState = 'idle' | 'running' | 'paused' | 'finished';

/** Animation options; accepts a plain number (duration in ms) or an options object */
export type AnimationOptions =
  | number
  | {
      /** Duration of one iteration in ms (default: 300) */
      duration?: number;
      /** Delay before the animation starts in ms (default: 0) */
      delay?: number;
      /** Additional delay after the animation ends in ms (default: 0) */
      endDelay?: number;
      /** Easing function name (default: 'linear') */
      easing?: string;
      /** Number of iterations (default: 1, use Infinity for looping) */
      iterations?: number;
      /** Playback direction (default: 'normal') */
      direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
      /**
       * Fill mode controlling property values before/after the animation
       * (default: 'none')
       */
      fill?: 'none' | 'forwards' | 'backwards' | 'both';
      /** Playback rate multiplier (default: 1) */
      playbackRate?: number;
    };

/** Resolved / normalised options (all fields required) */
export type ResolvedOptions = {
  duration: number;
  delay: number;
  endDelay: number;
  easing: string;
  iterations: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fill: 'none' | 'forwards' | 'backwards' | 'both';
  playbackRate: number;
};

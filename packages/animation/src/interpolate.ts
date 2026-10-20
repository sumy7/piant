import { Color, type ColorSource } from 'pixi.js';
import { mix } from 'popmotion';
import type { EasingFunction } from './easing';
import { parseEasing } from './easing';
import type {
  AnimatableProps,
  Keyframe,
  KeyframeEffect,
  NormalizedKeyframe,
  PropertyIndexedKeyframes,
} from './types';

/** Keys of AnimatableProps that accept numeric values */
const NUMERIC_PROPS = new Set<keyof AnimatableProps>([
  'x',
  'y',
  'scale',
  'scaleX',
  'scaleY',
  'rotation',
  'alpha',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'width',
  'height',
  'opacity',
]);

/** Use independent Pixi Colors so parsing never mutates caller or shared state. */
function normalizeColor(color: ColorSource): number[] {
  try {
    const rgba = new Color(color).toArray();
    if (rgba.every(Number.isFinite)) return rgba;
  } catch (cause) {
    throw new TypeError('Invalid backgroundColor: expected a valid PixiJS ColorSource.', { cause });
  }
  throw new TypeError('Invalid backgroundColor: RGBA channels must be finite.');
}

/** Interpolate RGBA, retaining byte-rounded RGB and full alpha precision. */
function mixColors(from: ColorSource, to: ColorSource, t: number): number[] {
  const fa = normalizeColor(from);
  const ta = normalizeColor(to);
  return fa.map((channel, index) => {
    const value = Math.max(0, Math.min(1, mix(channel, ta[index], t)));
    return index === 3 ? value : Math.round(value * 255) / 255;
  });
}

/**
 * Convert property-indexed keyframes to the array-of-keyframe format.
 */
function propertyIndexedToKeyframes(input: PropertyIndexedKeyframes): Keyframe[] {
  const offsets = input.offset;
  const easings = input.easing;
  const propKeys = Object.keys(input).filter(
    (k) => k !== 'offset' && k !== 'easing',
  ) as Array<keyof AnimatableProps>;

  const count = Math.max(
    ...propKeys.map((k) => (input[k] as unknown[])?.length ?? 0),
  );

  const frames: Keyframe[] = [];
  for (let i = 0; i < count; i++) {
    const frame: Keyframe = {};
    for (const key of propKeys) {
      const arr = input[key] as unknown[];
      if (arr && i < arr.length) {
        (frame as Record<string, unknown>)[key] = arr[i];
      }
    }
    if (offsets && i < offsets.length) {
      frame.offset = offsets[i];
    }
    if (easings !== undefined) {
      if (Array.isArray(easings) && i < easings.length) {
        frame.easing = easings[i];
      } else if (typeof easings === 'string') {
        frame.easing = easings;
      }
    }
    frames.push(frame);
  }
  return frames;
}

/**
 * Normalise a raw KeyframeEffect into a sorted array of NormalizedKeyframe
 * with explicit offset values distributed evenly for any missing offsets.
 *
 * @param effect       Raw keyframe input.
 * @param defaultEasing Easing to use when a keyframe does not specify its own
 *                     (e.g. the `easing` field from `AnimationOptions`).
 *                     Defaults to `'linear'`.
 */
export function normalizeKeyframes(effect: KeyframeEffect, defaultEasing = 'linear'): NormalizedKeyframe[] {
  // Normalise to array format
  const raw: Keyframe[] = Array.isArray(effect)
    ? effect
    : propertyIndexedToKeyframes(effect);

  // Validate even single/missing-endpoint colors before attaching a ticker,
  // and snapshot mutable ColorSource inputs as normalized RGBA arrays.
  const frames = raw.map((frame) => frame.backgroundColor === undefined ? frame : {
    ...frame,
    backgroundColor: normalizeColor(frame.backgroundColor),
  });

  if (frames.length === 0) return [];
  if (frames.length === 1) {
    // Single keyframe — treat as "to" (offset = 1)
    return [{ ...frames[0], offset: frames[0].offset ?? 1, easing: frames[0].easing ?? defaultEasing }];
  }

  // Fill in missing offsets
  const result: NormalizedKeyframe[] = frames.map((kf) => ({
    ...kf,
    offset: kf.offset ?? -1, // sentinel
    easing: kf.easing ?? defaultEasing,
  })) as NormalizedKeyframe[];

  // Ensure first and last have explicit offsets
  if (result[0].offset === -1) result[0].offset = 0;
  if (result[result.length - 1].offset === -1) result[result.length - 1].offset = 1;

  // Distribute missing offsets evenly between known offsets
  let i = 0;
  while (i < result.length) {
    if (result[i].offset !== -1) {
      i++;
      continue;
    }
    // Find next known offset
    let j = i + 1;
    while (j < result.length && result[j].offset === -1) j++;
    const start = result[i - 1].offset;
    const end = result[j].offset;
    const steps = j - i + 1;
    for (let k = i; k < j; k++) {
      result[k].offset = start + ((end - start) * (k - i + 1)) / steps;
    }
    i = j + 1;
  }

  // Sort by offset ascending
  result.sort((a, b) => a.offset - b.offset);
  return result;
}

/**
 * Interpolate the animated property values for a given progress (0–1) across
 * the normalised keyframes array.
 */
export function interpolateKeyframes(
  keyframes: NormalizedKeyframe[],
  progress: number,
): AnimatableProps {
  if (keyframes.length === 0) return {};
  if (keyframes.length === 1) {
    const { offset: _offset, easing: _easing, ...props } = keyframes[0];
    return props;
  }

  // Clamp progress to [0, 1]
  const p = Math.max(0, Math.min(1, progress));

  // Find the surrounding keyframe pair
  let fromIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (p >= keyframes[i].offset && p <= keyframes[i + 1].offset) {
      fromIdx = i;
      break;
    }
    if (p > keyframes[i + 1].offset) {
      fromIdx = i + 1;
    }
  }

  const from = keyframes[fromIdx];
  const to = keyframes[Math.min(fromIdx + 1, keyframes.length - 1)];

  // Segment progress (0-1 within this pair)
  let segProgress: number;
  if (from === to || from.offset === to.offset) {
    segProgress = p >= to.offset ? 1 : 0;
  } else {
    const rawSeg = (p - from.offset) / (to.offset - from.offset);
    const easingFn: EasingFunction = parseEasing(from.easing);
    segProgress = easingFn(Math.max(0, Math.min(1, rawSeg)));
  }

  const result: AnimatableProps = {};
  const allKeys = new Set([
    ...Object.keys(from),
    ...Object.keys(to),
  ]);

  for (const key of allKeys) {
    if (key === 'offset' || key === 'easing') continue;

    const propKey = key as keyof AnimatableProps;
    const fromVal = (from as Record<string, unknown>)[key];
    const toVal = (to as Record<string, unknown>)[key];

    if (fromVal === undefined && toVal === undefined) continue;
    if (fromVal === undefined) {
      (result as Record<string, unknown>)[key] = toVal;
      continue;
    }
    if (toVal === undefined) {
      (result as Record<string, unknown>)[key] = fromVal;
      continue;
    }

    if (NUMERIC_PROPS.has(propKey) && typeof fromVal === 'number' && typeof toVal === 'number') {
      (result as Record<string, unknown>)[key] = mix(fromVal, toVal, segProgress);
    } else if (propKey === 'backgroundColor' && from.backgroundColor !== undefined && to.backgroundColor !== undefined) {
      result.backgroundColor = mixColors(from.backgroundColor, to.backgroundColor, segProgress);
    } else {
      // Non-interpolatable: use from until halfway, then to
      (result as Record<string, unknown>)[key] = segProgress < 0.5 ? fromVal : toVal;
    }
  }

  return result;
}

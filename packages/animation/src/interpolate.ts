import { mix } from 'popmotion';
import type {
  AnimatableProps,
  Keyframe,
  KeyframeEffect,
  NormalizedKeyframe,
  PropertyIndexedKeyframes,
} from './types';
import type { EasingFunction } from './easing';
import { parseEasing } from './easing';

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

/**
 * Mix (linearly interpolate) two CSS/hex colour strings.
 * Supports #rrggbb, #rgb and rgb(r,g,b) formats.
 * Falls back to `from` on parse error.
 */
function mixColorStrings(from: string, to: string, t: number): string {
  const fa = parseColorToRgba(from);
  const ta = parseColorToRgba(to);
  if (!fa || !ta) return t >= 0.5 ? to : from;
  const r = Math.round(mix(fa[0], ta[0], t));
  const g = Math.round(mix(fa[1], ta[1], t));
  const b = Math.round(mix(fa[2], ta[2], t));
  const a = mix(fa[3], ta[3], t);
  return a === 1
    ? `rgb(${r},${g},${b})`
    : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function hexToRgba(hex: string): [number, number, number, number] | null {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
}

function parseColorToRgba(
  color: unknown,
): [number, number, number, number] | null {
  if (typeof color !== 'string') return null;
  const c = color.trim();
  if (c.startsWith('#')) return hexToRgba(c);
  const rgbaMatch = c.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgbaMatch) {
    return [
      Number(rgbaMatch[1]),
      Number(rgbaMatch[2]),
      Number(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    ];
  }
  return null;
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
 */
export function normalizeKeyframes(effect: KeyframeEffect): NormalizedKeyframe[] {
  // Normalise to array format
  const raw: Keyframe[] = Array.isArray(effect)
    ? effect
    : propertyIndexedToKeyframes(effect);

  if (raw.length === 0) return [];
  if (raw.length === 1) {
    // Single keyframe — treat as "to" (offset = 1)
    return [{ ...raw[0], offset: raw[0].offset ?? 1, easing: raw[0].easing ?? 'linear' }];
  }

  // Fill in missing offsets
  const result: NormalizedKeyframe[] = raw.map((kf) => ({
    ...kf,
    offset: kf.offset ?? -1, // sentinel
    easing: kf.easing ?? 'linear',
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
  if (keyframes.length === 1) return { ...keyframes[0] };

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
    } else if (key === 'backgroundColor' && typeof fromVal === 'string' && typeof toVal === 'string') {
      (result as Record<string, unknown>)[key] = mixColorStrings(fromVal, toVal, segProgress);
    } else {
      // Non-interpolatable: use from until halfway, then to
      (result as Record<string, unknown>)[key] = segProgress < 0.5 ? fromVal : toVal;
    }
  }

  return result;
}

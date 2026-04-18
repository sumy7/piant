import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeKeyframes, interpolateKeyframes } from '../src/interpolate';
import { parseEasing } from '../src/easing';
import type { Keyframe, NormalizedKeyframe } from '../src/types';

// ── normalizeKeyframes ────────────────────────────────────────────────────

describe('normalizeKeyframes', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeKeyframes([])).toEqual([]);
  });

  it('handles a single keyframe as offset=1 (to)', () => {
    const kfs = normalizeKeyframes([{ alpha: 1 }]);
    expect(kfs).toHaveLength(1);
    expect(kfs[0].offset).toBe(1);
    expect(kfs[0].alpha).toBe(1);
  });

  it('distributes offsets evenly for two keyframes', () => {
    const kfs = normalizeKeyframes([{ alpha: 0 }, { alpha: 1 }]);
    expect(kfs[0].offset).toBe(0);
    expect(kfs[1].offset).toBe(1);
  });

  it('distributes missing offsets between known ones', () => {
    const kfs = normalizeKeyframes([
      { alpha: 0, offset: 0 },
      { alpha: 0.5 },
      { alpha: 1, offset: 1 },
    ]);
    expect(kfs[1].offset).toBeCloseTo(0.5);
  });

  it('respects explicit offset values', () => {
    const kfs = normalizeKeyframes([
      { x: 0, offset: 0 },
      { x: 50, offset: 0.3 },
      { x: 100, offset: 1 },
    ]);
    expect(kfs[0].offset).toBe(0);
    expect(kfs[1].offset).toBe(0.3);
    expect(kfs[2].offset).toBe(1);
  });

  it('converts property-indexed keyframes to array format', () => {
    const kfs = normalizeKeyframes({ alpha: [0, 1] });
    expect(kfs).toHaveLength(2);
    expect(kfs[0].alpha).toBe(0);
    expect(kfs[1].alpha).toBe(1);
  });

  it('assigns easing from property-indexed format', () => {
    const kfs = normalizeKeyframes({ alpha: [0, 1], easing: 'ease-in' });
    expect(kfs[0].easing).toBe('ease-in');
  });
});

// ── interpolateKeyframes ──────────────────────────────────────────────────

describe('interpolateKeyframes', () => {
  const kfs: NormalizedKeyframe[] = normalizeKeyframes([
    { x: 0, alpha: 0 },
    { x: 100, alpha: 1 },
  ]);

  it('returns initial values at progress=0', () => {
    const v = interpolateKeyframes(kfs, 0);
    expect(v.x).toBeCloseTo(0);
    expect(v.alpha).toBeCloseTo(0);
  });

  it('returns final values at progress=1', () => {
    const v = interpolateKeyframes(kfs, 1);
    expect(v.x).toBeCloseTo(100);
    expect(v.alpha).toBeCloseTo(1);
  });

  it('interpolates midpoint correctly', () => {
    const v = interpolateKeyframes(kfs, 0.5);
    expect(v.x).toBeCloseTo(50);
    expect(v.alpha).toBeCloseTo(0.5);
  });

  it('clamps progress below 0', () => {
    const v = interpolateKeyframes(kfs, -0.5);
    expect(v.x).toBeCloseTo(0);
  });

  it('clamps progress above 1', () => {
    const v = interpolateKeyframes(kfs, 1.5);
    expect(v.x).toBeCloseTo(100);
  });

  it('returns empty object for empty keyframes', () => {
    expect(interpolateKeyframes([], 0.5)).toEqual({});
  });

  it('handles three keyframes with custom offsets', () => {
    const multi: NormalizedKeyframe[] = normalizeKeyframes([
      { x: 0, offset: 0 },
      { x: 50, offset: 0.5 },
      { x: 100, offset: 1 },
    ]);
    expect(interpolateKeyframes(multi, 0.25).x).toBeCloseTo(25);
    expect(interpolateKeyframes(multi, 0.75).x).toBeCloseTo(75);
  });
});

// ── parseEasing ───────────────────────────────────────────────────────────

describe('parseEasing', () => {
  it('returns a function for linear', () => {
    const fn = parseEasing('linear');
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(0.5)).toBeCloseTo(0.5);
    expect(fn(1)).toBeCloseTo(1);
  });

  it('parses ease-in-out as a valid easing', () => {
    const fn = parseEasing('ease-in-out');
    // midpoint of ease-in-out should be ~0.5 by symmetry
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
  });

  it('parses cubic-bezier string', () => {
    const fn = parseEasing('cubic-bezier(0.25, 0.1, 0.25, 1.0)');
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
  });

  it('falls back to linear for unknown easing', () => {
    const fn = parseEasing('super-bounce-crazy');
    expect(fn(0.5)).toBeCloseTo(0.5);
  });
});

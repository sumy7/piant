import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeKeyframes, interpolateKeyframes } from '../src/interpolate';
import { parseEasing } from '../src/easing';
import { PNodeAnimation } from '../src/PNodeAnimation';
import type { Keyframe, NormalizedKeyframe } from '../src/types';

// ── Mock pixi.js Ticker ───────────────────────────────────────────────────

const _tickerListeners: Array<(t: { deltaMS: number }) => void> = [];

vi.mock('pixi.js', () => ({
  Ticker: {
    shared: {
      add: vi.fn((fn: (t: { deltaMS: number }) => void) => {
        _tickerListeners.push(fn);
      }),
      remove: vi.fn((fn: (t: { deltaMS: number }) => void) => {
        const idx = _tickerListeners.indexOf(fn);
        if (idx !== -1) _tickerListeners.splice(idx, 1);
      }),
    },
  },
}));

/** Advance all attached ticker listeners by the given deltaMS. */
function tick(deltaMS: number) {
  for (const fn of [..._tickerListeners]) fn({ deltaMS } as any);
}

/** Create a minimal PNode-like object sufficient for PNodeAnimation. */
function createMockNode() {
  const node = {
    _animTranslate: { x: 0, y: 0 },
    _animAlpha: null as number | null,
    _view: { scale: { x: 1, y: 1 }, rotation: 0 },
    _layoutStyle: {} as Record<string, unknown>,
    setStyle: vi.fn(function (this: typeof node, s: Record<string, unknown>) {
      Object.assign(this._layoutStyle, s);
    }),
    markDirty: vi.fn(),
  };
  return node;
}

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

  it('parses cubic-bezier with negative y values (overshoot)', () => {
    // e.g. overshoot: cubic-bezier(0.68, -0.55, 0.27, 1.55)
    const fn = parseEasing('cubic-bezier(0.68, -0.55, 0.27, 1.55)');
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
  });

  it('parses cubic-bezier with no spaces', () => {
    const fn = parseEasing('cubic-bezier(0.42,0,0.58,1)');
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
  });

  it('falls back to linear for unknown easing', () => {
    const fn = parseEasing('super-bounce-crazy');
    expect(fn(0.5)).toBeCloseTo(0.5);
  });
});

// ── interpolateKeyframes single-keyframe no-leak ──────────────────────────

describe('interpolateKeyframes single keyframe', () => {
  it('does not leak offset or easing into returned props', () => {
    const kfs = normalizeKeyframes([{ alpha: 0.5 }]);
    const result = interpolateKeyframes(kfs, 0.5);
    expect('offset' in result).toBe(false);
    expect('easing' in result).toBe(false);
    expect(result.alpha).toBeCloseTo(0.5);
  });
});

// ── normalizeKeyframes defaultEasing ─────────────────────────────────────

describe('normalizeKeyframes defaultEasing', () => {
  it('uses defaultEasing when keyframe has no easing', () => {
    const kfs = normalizeKeyframes([{ alpha: 0 }, { alpha: 1 }], 'ease-in-out');
    expect(kfs[0].easing).toBe('ease-in-out');
    expect(kfs[1].easing).toBe('ease-in-out');
  });

  it('does not override explicit keyframe easing', () => {
    const kfs = normalizeKeyframes(
      [{ alpha: 0, easing: 'ease-out' }, { alpha: 1 }],
      'ease-in',
    );
    expect(kfs[0].easing).toBe('ease-out');
    expect(kfs[1].easing).toBe('ease-in');
  });

  it('defaults to linear when no defaultEasing is passed', () => {
    const kfs = normalizeKeyframes([{ alpha: 0 }, { alpha: 1 }]);
    expect(kfs[0].easing).toBe('linear');
  });
});

// ── PNodeAnimation ────────────────────────────────────────────────────────

describe('PNodeAnimation', () => {
  beforeEach(() => {
    _tickerListeners.length = 0;
    vi.clearAllMocks();
  });

  it('starts in running state immediately', () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 300);
    expect(anim.playState).toBe('running');
  });

  it('applies interpolated values on tick', () => {
    const node = createMockNode();
    new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 1000);
    tick(500);
    expect(node._animAlpha).toBeCloseTo(0.5, 1);
  });

  it('applies options.easing to keyframes without explicit easing', () => {
    const node = createMockNode();
    // With ease-in-out and t=0.5, result is ~0.5 (symmetric). Check it ran.
    new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], {
      duration: 1000,
      easing: 'ease-in-out',
    });
    tick(500);
    // ease-in-out(0.5) ≈ 0.5; just ensure animation ran and value changed from null
    expect(node._animAlpha).not.toBeNull();
    expect((node._animAlpha as number)).toBeGreaterThan(0);
    expect((node._animAlpha as number)).toBeLessThan(1);
  });

  it('fill: forwards keeps final value on completion', () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], {
      duration: 100,
      fill: 'forwards',
    });
    tick(200);
    expect(anim.playState).toBe('finished');
    expect(node._animAlpha).toBeCloseTo(1, 5);
  });

  it('fill: none restores initial alpha on completion', () => {
    const node = createMockNode();
    node._animAlpha = 0.7;
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], {
      duration: 100,
      fill: 'none',
    });
    tick(200);
    expect(anim.playState).toBe('finished');
    expect(node._animAlpha).toBeCloseTo(0.7, 5);
  });

  it('fill: none restores initially-undefined opacity style on completion', () => {
    const node = createMockNode();
    // opacity is NOT set initially
    const anim = new PNodeAnimation(node as any, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 100,
      fill: 'none',
    });
    tick(200);
    expect(anim.playState).toBe('finished');
    // setStyle should have been called with opacity: undefined to restore
    const calls = (node.setStyle as ReturnType<typeof vi.fn>).mock.calls;
    const restoreCall = calls.find((c: any[]) => Object.prototype.hasOwnProperty.call(c[0], 'opacity'));
    expect(restoreCall).toBeDefined();
    expect(restoreCall![0].opacity).toBeUndefined();
  });

  it('cancel() sets state to idle and restores initial alpha', () => {
    const node = createMockNode();
    node._animAlpha = 0.8;
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 500);
    // Suppress the expected rejection before calling cancel()
    anim.finished.catch(() => {});
    tick(100);
    anim.cancel();
    expect(anim.playState).toBe('idle');
    expect(node._animAlpha).toBeCloseTo(0.8, 5);
  });

  it('cancel() rejects the finished promise', async () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 1000);
    // Attach rejection handler BEFORE calling cancel() to avoid unhandled rejection
    const rejection = expect(anim.finished).rejects.toThrow('Animation cancelled');
    anim.cancel();
    await rejection;
  });

  it('pause() stops advancing the animation', () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 1000);
    tick(250);
    const alphaAtPause = node._animAlpha ?? 0;
    anim.pause();
    expect(anim.playState).toBe('paused');
    tick(250);
    expect(node._animAlpha).toBeCloseTo(alphaAtPause, 5);
  });

  it('play() resumes after pause', () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 1000);
    tick(250);
    anim.pause();
    const alphaAtPause = node._animAlpha ?? 0;
    anim.play();
    tick(250);
    expect((node._animAlpha as number)).toBeGreaterThan(alphaAtPause);
  });

  it('direction: reverse plays backwards (alpha starts near 1)', () => {
    const node = createMockNode();
    new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], {
      duration: 1000,
      direction: 'reverse',
    });
    tick(1);
    // At the very start of reversed animation, alpha ≈ 1
    expect((node._animAlpha as number)).toBeGreaterThan(0.9);
  });

  it('fires onfinish callback when animation ends', () => {
    const node = createMockNode();
    const onfinish = vi.fn();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 100);
    anim.onfinish = onfinish;
    tick(200);
    expect(onfinish).toHaveBeenCalledOnce();
  });

  it('finished promise resolves on natural completion', async () => {
    const node = createMockNode();
    const anim = new PNodeAnimation(node as any, [{ alpha: 0 }, { alpha: 1 }], 100);
    tick(200);
    await expect(anim.finished).resolves.toBe(anim);
  });

  it('translate offset applied on tick', () => {
    const node = createMockNode();
    new PNodeAnimation(node as any, [{ x: 0 }, { x: 100 }], 1000);
    tick(500);
    expect(node._animTranslate.x).toBeCloseTo(50, 0);
  });
});

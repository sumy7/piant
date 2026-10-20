import { PNode, PRoot } from '@piant/core';
import { Color, type ColorSource, Container, Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseEasing } from '../src/easing';
import { interpolateKeyframes, normalizeKeyframes } from '../src/interpolate';
import { PNodeAnimation } from '../src/PNodeAnimation';

const colorPairs: Array<[string, ColorSource, ColorSource]> = [
  ['numeric', 0xff0000, 0x0000ff],
  ['hex strings', '#f00', '#0000ff'],
  ['bare hex strings', 'ff0000', '0x0000ff'],
  ['rgb strings', 'rgb(255,0,0)', 'rgb(0,0,255)'],
  ['named colors', 'red', 'blue'],
  ['mixed numeric/string', 0xff0000, 'blue'],
  ['normalized arrays', [1, 0, 0], [0, 0, 1]],
  ['float arrays', new Float32Array([1, 0, 0]), new Float32Array([0, 0, 1])],
  ['byte arrays', new Uint8Array([255, 0, 0]), new Uint8Array([0, 0, 255])],
  ['clamped byte arrays', new Uint8ClampedArray([255, 0, 0]), new Uint8ClampedArray([0, 0, 255])],
  ['RGB objects', { r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }],
  ['HSL objects', { h: 0, s: 100, l: 50 }, { h: 240, s: 100, l: 50 }],
  ['HSV objects', { h: 0, s: 100, v: 100 }, { h: 240, s: 100, v: 100 }],
  ['Color instances', new Color('red'), new Color('blue')],
];

function sample(from: ColorSource, to: ColorSource, progress: number) {
  const frames = normalizeKeyframes([{ backgroundColor: from }, { backgroundColor: to }]);
  const result = interpolateKeyframes(frames, progress).backgroundColor;
  expect(result).toBeDefined();
  return new Color(result).toArray();
}

describe('backgroundColor ColorSource interpolation', () => {
  it.each(colorPairs)('interpolates %s at endpoints, quarter and midpoint', (_name, from, to) => {
    expect(sample(from, to, 0)).toEqual([1, 0, 0, 1]);
    expect(sample(from, to, 1)).toEqual([0, 0, 1, 1]);
    expect(sample(from, to, 0.25)[0]).toBeCloseTo(191 / 255, 5);
    expect(sample(from, to, 0.25)[2]).toBeCloseTo(64 / 255, 5);
    const mid = sample(from, to, 0.5);
    expect(mid[0]).toBeCloseTo(128 / 255, 5);
    expect(mid[1]).toBe(0);
    expect(mid[2]).toBeCloseTo(128 / 255, 5);
    expect(mid[3]).toBe(1);
  });

  it.each<[string, ColorSource, ColorSource]>([
    ['rgba strings', 'rgba(255,0,0,0.25)', 'rgba(0,0,255,0.75)'],
    ['alpha hex strings', '#ff000040', '#0000ffc0'],
    ['short alpha hex strings', '#f004', '#00fc'],
    ['RGBA arrays', [1, 0, 0, 0.25], [0, 0, 1, 0.75]],
    ['RGBA float arrays', new Float32Array([1, 0, 0, 0.25]), new Float32Array([0, 0, 1, 0.75])],
    ['RGBA byte arrays', new Uint8Array([255, 0, 0, 64]), new Uint8Array([0, 0, 255, 192])],
    ['RGBA clamped arrays', new Uint8ClampedArray([255, 0, 0, 64]), new Uint8ClampedArray([0, 0, 255, 192])],
    ['RGBA objects', { r: 255, g: 0, b: 0, a: 0.25 }, { r: 0, g: 0, b: 255, a: 0.75 }],
    ['HSLA objects', { h: 0, s: 100, l: 50, a: 0.25 }, { h: 240, s: 100, l: 50, a: 0.75 }],
    ['HSVA objects', { h: 0, s: 100, v: 100, a: 0.25 }, { h: 240, s: 100, v: 100, a: 0.75 }],
    ['mixed Color/array', new Color([1, 0, 0, 0.25]), [0, 0, 1, 0.75]],
    ['precise alpha arrays', [1, 0, 0, 0.12345], [0, 0, 1, 0.67891]],
    ['transparent/numeric', 'transparent', 0x0000ff],
    ['hsl strings', 'hsla(0,100%,50%,0.25)', 'hsla(240,100%,50%,0.75)'],
  ])('interpolates alpha for %s', (_name, from, to) => {
    const start = new Color(from).toArray();
    const end = new Color(to).toArray();
    for (const progress of [0, 0.25, 0.5, 1]) {
      const result = sample(from, to, progress);
      for (let channel = 0; channel < 3; channel++) {
        const expected = Math.round((start[channel] + (end[channel] - start[channel]) * progress) * 255) / 255;
        expect(result[channel]).toBeCloseTo(expected, 5);
      }
      expect(result[3]).toBeCloseTo(start[3] + (end[3] - start[3]) * progress, 5);
    }
  });

  it('keeps numeric black and interpolates each RGB channel independently', () => {
    const mid = sample(0, 0x804020, 0.5);
    expect(mid[0]).toBeCloseTo(64 / 255, 5);
    expect(mid[1]).toBeCloseTo(32 / 255, 5);
    expect(mid[2]).toBeCloseTo(16 / 255, 5);
  });

  it('applies segment easing to colors and other numeric properties', () => {
    const frames = normalizeKeyframes([
      { backgroundColor: 0xff0000, x: 0, easing: 'ease-in', offset: 0 },
      { backgroundColor: 'blue', x: 100, offset: 0.5 },
      { backgroundColor: 'red', x: 0, offset: 1 },
    ]);
    const result = interpolateKeyframes(frames, 0.25);
    const eased = parseEasing('ease-in')(0.5);
    expect(result.x).toBeCloseTo(100 * eased);
    expect(new Color(result.backgroundColor).toArray()[2]).toBeCloseTo(Math.round(255 * eased) / 255, 5);
  });

  it('clamps color channels when easing overshoots, while numeric animations still overshoot', () => {
    const frames = normalizeKeyframes([
      { backgroundColor: 'transparent', x: 0 },
      { backgroundColor: 'blue', x: 100 },
    ], 'back-out');
    const result = interpolateKeyframes(frames, 0.7);
    expect(result.x).toBeGreaterThan(100);
    expect(new Color(result.backgroundColor).toArray()).toEqual([0, 0, 1, 1]);
  });

  it('does not mutate caller sources or Color.shared', () => {
    const sharedBefore = Color.shared.toArray().slice();
    const sources: ColorSource[] = [
      [2, 0, 0, 0.5], new Float32Array([2, 0, 0, 0.5]),
      new Uint8Array([255, 0, 0, 128]), new Uint8ClampedArray([255, 0, 0, 128]),
      { r: 255, g: 0, b: 0, a: 0.5 }, new Color('rgba(255,0,0,0.5)'), Color.shared,
    ];
    for (const source of sources) {
      const before = source instanceof Color ? source.toArray().slice() : structuredClone(source);
      sample(source, 'blue', 0.5);
      expect(source instanceof Color ? source.toArray() : source).toEqual(before);
    }
    expect(Color.shared.toArray()).toEqual(sharedBefore);
  });

  it('snapshots mutable inputs in property-indexed keyframes', () => {
    const from = [1, 0, 0, 0.25];
    const to = new Color([0, 0, 1, 0.75]);
    const frames = normalizeKeyframes({ backgroundColor: [from, to] });
    from[0] = 0;
    to.setValue('green');
    const color = new Color(interpolateKeyframes(frames, 0.5).backgroundColor).toArray();
    expect(color[0]).toBeCloseTo(128 / 255, 5);
    expect(color[2]).toBeCloseTo(128 / 255, 5);
    expect(color[3]).toBeCloseTo(0.5, 5);
  });

  it('preserves alpha in single and missing-endpoint colors', () => {
    for (const frames of [
      normalizeKeyframes([{ backgroundColor: [1, 0, 0, 0.25] }]),
      normalizeKeyframes([{}, { backgroundColor: [1, 0, 0, 0.25] }]),
    ]) {
      expect(new Color(interpolateKeyframes(frames, 0.5).backgroundColor).toArray()).toEqual([1, 0, 0, 0.25]);
    }
  });

  it.each(
    (['not-a-color', '#gg0000', [], [1, 0], -1, 0x1000000, Number.NaN, [Number.NaN, 0, 0]] satisfies ColorSource[])
      .map((source) => ({ source })),
  )(
    'rejects invalid colors during keyframe normalization: $source', ({ source }) => {
      expect(() => normalizeKeyframes([{ backgroundColor: source }])).toThrow(/backgroundColor/);
      expect(() => normalizeKeyframes({ backgroundColor: ['red', source] })).toThrow(/backgroundColor/);
    },
  );
});

describe('backgroundColor rendering through PNode.setStyle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects invalid colors before attaching an animation ticker', () => {
    const add = vi.spyOn(Ticker.shared, 'add');
    const node = new PNode();
    expect(() => new PNodeAnimation(node, [{ backgroundColor: 'invalid' }], 1000)).toThrow(/backgroundColor/);
    expect(add).not.toHaveBeenCalled();
    node.destroyRecursive();
  });

  it.each([
    ['numeric', 0xff0000, 0x0000ff, 1],
    ['mixed alpha', { r: 255, g: 0, b: 0, a: 0.25 }, new Float32Array([0, 0, 1, 0.75]), 0.5],
  ] satisfies Array<[string, ColorSource, ColorSource, number]>)(
    'draws %s midpoint color and alpha with real Pixi Graphics', async (_name, from, to, expectedAlpha) => {
      vi.spyOn(Ticker.shared, 'add').mockReturnValue(Ticker.shared);
      vi.spyOn(Ticker.shared, 'remove').mockReturnValue(Ticker.shared);
      const root = new PRoot(new Container(), { width: 100, height: 100 });
      const node = new PNode();
      node.setStyle({ width: 50, height: 50, backgroundColor: 'green' });
      root.appendChild(node);
      const animation = new PNodeAnimation(node, [{ backgroundColor: from }, { backgroundColor: to }], 1000);
      animation.pause();
      animation.currentTime = 500;
      root.doLayout();

      const fill = node._viewBg.context.instructions.find((instruction) => instruction.action === 'fill');
      if (fill?.action !== 'fill') throw new Error('Expected background fill instruction');
      expect(fill.data.style.color).toBe(0x800080);
      expect(fill.data.style.alpha).toBeCloseTo(expectedAlpha, 5);

      const cancelled = expect(animation.finished).rejects.toThrow('Animation cancelled');
      animation.cancel();
      await cancelled;
      root.doLayout();
      const restored = node._viewBg.context.instructions.find((instruction) => instruction.action === 'fill');
      if (restored?.action !== 'fill') throw new Error('Expected restored background fill instruction');
      expect(restored.data.style.color).toBe(0x008000);
      expect(restored.data.style.alpha).toBe(1);
      root.destroyRecursive();
    },
  );
});

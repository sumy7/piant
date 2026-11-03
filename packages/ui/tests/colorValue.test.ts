import { describe, expect, it } from 'vitest';
import {
  formatHexColor,
  type Hsva,
  hsvaToRgba,
  normalizeHsva,
  parseHexColor,
  type Rgba,
  rgbaToHsva,
} from '../src/components/internal/colorValue';

describe('CSS hex sRGB color model', () => {
  it.each([
    ['#123', { r: 17, g: 34, b: 51, a: 1 }, '#112233ff'],
    ['#AbCd', { r: 170, g: 187, b: 204, a: 221 / 255 }, '#aabbccdd'],
    ['  #12AF09  ', { r: 18, g: 175, b: 9, a: 1 }, '#12af09ff'],
    ['#00ff0080', { r: 0, g: 255, b: 0, a: 128 / 255 }, '#00ff0080'],
    ['#0000', { r: 0, g: 0, b: 0, a: 0 }, '#00000000'],
  ] as const)(
    'parses %s and serializes canonical lowercase byte channels',
    (text, rgba, canonical) => {
      expect(parseHexColor(text)).toEqual(rgba);
      expect(formatHexColor(rgba)).toBe(canonical);
      expect(formatHexColor(rgba, false)).toBe(canonical.slice(0, 7));
    },
  );
  it.each([
    '',
    'fff',
    '0xfff',
    '#12',
    '#12345',
    '#1234567',
    '#123456789',
    '#ggg',
    '#１２３',
    '#12 3',
    'rgb(0 0 0)',
    'red',
    'transparent',
    '#000\nfff',
  ])('rejects unsupported syntax %j', (text) => {
    expect(parseHexColor(text)).toBeUndefined();
  });
  it('normalizes finite channels, wraps hue and quantizes alpha once to its eight-bit representation', () => {
    expect(normalizeHsva({ h: -60, s: 2, v: -1, a: 0.5 })).toEqual({
      h: 300,
      s: 1,
      v: 0,
      a: 128 / 255,
    });
    expect(normalizeHsva({ h: 720, s: 0.5, v: 0.25, a: 3 })).toEqual({
      h: 0,
      s: 0.5,
      v: 0.25,
      a: 1,
    });
    expect(Object.is(normalizeHsva({ h: -360, s: 0, v: 0, a: 0 }).h, -0)).toBe(
      false,
    );
    expect(formatHexColor({ r: 300, g: -1, b: 1.5, a: 0.5 })).toBe('#ff000280');
    const extreme = normalizeHsva({
      h: Number.MAX_VALUE,
      s: Number.MIN_VALUE,
      v: 1,
      a: 0,
    });
    expect(extreme.h).toBeGreaterThanOrEqual(0);
    expect(extreme.h).toBeLessThan(360);
  });
  it.each(['h', 's', 'v', 'a'] as const)(
    'rejects nonfinite HSV %s defensively',
    (channel) => {
      for (const value of [NaN, Infinity, -Infinity])
        expect(() =>
          normalizeHsva({
            ...{ h: 20, s: 0.5, v: 0.5, a: 1 },
            [channel]: value,
          }),
        ).toThrow('finite');
    },
  );
  it.each(['r', 'g', 'b', 'a'] as const)(
    'rejects nonfinite RGB %s defensively',
    (channel) => {
      for (const value of [NaN, Infinity, -Infinity]) {
        const rgba = { r: 10, g: 20, b: 30, a: 1, [channel]: value };
        expect(() => formatHexColor(rgba)).toThrow('finite');
        expect(() => rgbaToHsva(rgba)).toThrow('finite');
      }
    },
  );
  it.each([
    [0, { r: 255, g: 0, b: 0, a: 1 }],
    [60, { r: 255, g: 255, b: 0, a: 1 }],
    [120, { r: 0, g: 255, b: 0, a: 1 }],
    [180, { r: 0, g: 255, b: 255, a: 1 }],
    [240, { r: 0, g: 0, b: 255, a: 1 }],
    [300, { r: 255, g: 0, b: 255, a: 1 }],
  ] as const)(
    'converts HSV sector boundary %s to an exact primary or secondary',
    (h, rgba) => {
      expect(hsvaToRgba({ h, s: 1, v: 1, a: 1 })).toEqual(rgba);
      expect(rgbaToHsva(rgba).h).toBe(h);
    },
  );
  it('preserves latent hue for gray and latent hue/saturation for black without mutating previous state', () => {
    const previous: Hsva = { h: 270, s: 0.75, v: 0.5, a: 1 };
    const snapshot = { ...previous };
    expect(rgbaToHsva({ r: 128, g: 128, b: 128, a: 0 }, previous)).toEqual({
      h: 270,
      s: 0,
      v: 128 / 255,
      a: 0,
    });
    expect(rgbaToHsva({ r: 0, g: 0, b: 0, a: 1 }, previous)).toEqual({
      h: 270,
      s: 0.75,
      v: 0,
      a: 1,
    });
    expect(rgbaToHsva({ r: 0, g: 0, b: 0, a: 1 })).toEqual({
      h: 0,
      s: 0,
      v: 0,
      a: 1,
    });
    expect(previous).toEqual(snapshot);
    expect(rgbaToHsva({ r: 255, g: 0, b: 0, a: 1 }, previous)).toEqual({
      h: 0,
      s: 1,
      v: 1,
      a: 1,
    });
  });
  it('roundtrips representative RGB byte combinations exactly through HSV and canonical hex', () => {
    const channels = [
      0, 1, 2, 15, 16, 31, 63, 64, 127, 128, 129, 191, 254, 255,
    ];
    for (const r of channels)
      for (const g of channels)
        for (const b of channels) {
          const rgba: Rgba = { r, g, b, a: ((r + g + b) % 256) / 255 };
          expect(hsvaToRgba(rgbaToHsva(rgba))).toEqual(rgba);
          expect(parseHexColor(formatHexColor(rgba))).toEqual(rgba);
        }
  });
  it('roundtrips every alpha byte independently of hidden RGB channels at zero opacity', () => {
    for (let alpha = 0; alpha < 256; alpha++) {
      const rgba = { r: 13, g: 117, b: 251, a: alpha / 255 };
      expect(hsvaToRgba(rgbaToHsva(rgba))).toEqual(rgba);
      expect(parseHexColor(formatHexColor(rgba))).toEqual(rgba);
    }
    expect(formatHexColor({ r: 13, g: 117, b: 251, a: 0 }, false)).toBe(
      '#0d75fb',
    );
  });
});

it('covers every channel byte across gradients, near-grays and deterministic mixed colors', () => {
  for (let channel = 0; channel < 256; channel++) {
    const triples = [
      [channel, 0, 255],
      [255, channel, 0],
      [0, 255, channel],
      [channel, channel, channel],
      [channel, Math.max(0, channel - 1), Math.min(255, channel + 1)],
      [channel, (channel * 73) % 256, (channel * 151) % 256],
    ];
    for (const [r, g, b] of triples) {
      const rgba = { r, g, b, a: 1 };
      expect(hsvaToRgba(rgbaToHsva(rgba))).toEqual(rgba);
    }
  }
});

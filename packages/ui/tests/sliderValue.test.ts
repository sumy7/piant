import { describe, expect, it } from 'vitest';
import { getSliderRange } from '../src/components/internal/sliderValue';

describe('slider value lattice', () => {
  it('defaults to 0..100 in whole steps and clamps at each legal endpoint', () => {
    const range = getSliderRange();
    expect([range.min, range.max, range.step, range.last]).toEqual([
      0, 100, 1, 100,
    ]);
    expect(range.normalize(-20)).toBe(0);
    expect(range.normalize(130)).toBe(100);
    expect(range.normalize(12.49)).toBe(12);
    expect(range.normalize(12.5)).toBe(13);
    expect(range.ratio(25)).toBe(0.25);
    expect(range.fromRatio(0.255)).toBe(26);
    expect(range.fromRatio(-1)).toBe(0);
    expect(range.fromRatio(2)).toBe(100);
  });

  it('keeps an unaligned max outside the min-anchored lattice', () => {
    const range = getSliderRange(2, 12, 3);
    expect(range.last).toBe(11);
    expect(range.normalize(12)).toBe(11);
    expect(range.normalize(100)).toBe(11);
    expect(range.fromRatio(1)).toBe(11);
    expect(range.ratio(11)).toBe(0.9);
    expect(range.normalize(3.5)).toBe(5);
    expect(range.normalize(6.5)).toBe(8);
  });

  it('rounds negative halfway values toward the higher legal stop', () => {
    const range = getSliderRange(-1, 1, 0.2);
    expect(range.normalize(-0.9)).toBe(-0.8);
    expect(range.normalize(-0.7)).toBe(-0.6);
    expect(range.normalize(-0.1)).toBe(0);
    expect(Object.is(range.normalize(-0.1), -0)).toBe(false);
    expect(range.fromRatio(0.15)).toBe(-0.6);
  });

  it('produces stable decimal results without accumulated binary rounding tails', () => {
    const range = getSliderRange(0.1, 0.3, 0.1);
    expect(range.last).toBe(0.3);
    expect(range.normalize(0.1 + 0.2)).toBe(0.3);
    expect(range.normalize(0.25)).toBe(0.3);
    expect(range.fromRatio(0.75)).toBe(0.3);
    const tiny = getSliderRange(-3e-7, 3e-7, 1e-7);
    expect(tiny.normalize(2.5e-7)).toBe(3e-7);
    expect(tiny.fromRatio(0.5)).toBe(0);
    expect(tiny.last).toBe(3e-7);
  });

  it('supports exponential and subnormal steps and spans whose subtraction overflows', () => {
    const large = getSliderRange(-1e308, 1e308, 1e308);
    expect(large.normalize(8e307)).toBe(1e308);
    expect(large.fromRatio(0.5)).toBe(0);
    expect(large.ratio(0)).toBe(0.5);
    const small = getSliderRange(0, 1e-323, 5e-324);
    expect(small.fromRatio(0.5)).toBe(5e-324);
    expect(small.ratio(5e-324)).toBe(0.5);
    expect(getSliderRange(1e21, 1.3e21, 1e20).last).toBe(1.3e21);
    const extreme = getSliderRange(
      1.797693134862315e308,
      Number.MAX_VALUE,
      2e292,
    );
    expect(Number.isFinite(extreme.last)).toBe(true);
    expect(extreme.last).toBeLessThanOrEqual(Number.MAX_VALUE);
  });

  it('handles fixed and shorter-than-step ranges without a phantom upper stop', () => {
    for (const range of [
      getSliderRange(4, 4, 0.1),
      getSliderRange(4, 4.5, 1),
    ]) {
      expect(range.last).toBe(4);
      expect(range.normalize(100)).toBe(4);
      expect(range.fromRatio(1)).toBe(4);
      expect(range.ratio(4)).toBe(0);
    }
  });

  it('recomputes the lattice when min, max or step changes', () => {
    expect(getSliderRange(0, 10, 2).normalize(5)).toBe(6);
    expect(getSliderRange(1, 10, 2).normalize(5)).toBe(5);
    expect(getSliderRange(1, 4, 2).normalize(5)).toBe(3);
    expect(getSliderRange(1, 10, 3).normalize(5)).toBe(4);
  });

  it.each([
    [Number.NaN, 100, 1],
    [0, Number.POSITIVE_INFINITY, 1],
    [0, 100, Number.NEGATIVE_INFINITY],
    [0, 100, 0],
    [0, 100, -1],
    [10, 0, 1],
    [0, 1, 1e-20],
    [1e16, 1e16 + 8, 1],
  ])(
    'rejects invalid or unrepresentable range (%s,%s,%s)',
    (min, max, step) => {
      expect(() => getSliderRange(min, max, step)).toThrow(RangeError);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects nonfinite value and ratio %s',
    (value) => {
      const range = getSliderRange();
      expect(() => range.normalize(value)).toThrow(RangeError);
      expect(() => range.ratio(value)).toThrow(RangeError);
      expect(() => range.fromRatio(value)).toThrow(RangeError);
    },
  );
});

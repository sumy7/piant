import { describe, expect, it } from 'vitest';
import composeStyles from '../src/styleSheet/composeStyles';
import flattenStyle from '../src/styleSheet/flattenStyle';
import { StyleSheet } from '../src/styleSheet';

describe('composeStyles', () => {
  it('returns style2 when style1 is undefined', () => {
    const s2 = { flex: 1 } as any;
    expect(composeStyles(undefined, s2)).toBe(s2);
  });

  it('returns style1 when style2 is undefined', () => {
    const s1 = { flex: 1 } as any;
    expect(composeStyles(s1, undefined)).toBe(s1);
  });

  it('returns undefined when both are undefined', () => {
    expect(composeStyles(undefined, undefined)).toBeUndefined();
  });

  it('returns array of both styles when both provided', () => {
    const s1 = { flex: 1 } as any;
    const s2 = { flex: 2 } as any;
    const result = composeStyles(s1, s2);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain(s1);
    expect(result).toContain(s2);
  });
});

describe('flattenStyle', () => {
  it('returns undefined for null input', () => {
    expect(flattenStyle(null)).toBeUndefined();
  });

  it('returns undefined for non-object input', () => {
    expect(flattenStyle('string')).toBeUndefined();
    expect(flattenStyle(42)).toBeUndefined();
  });

  it('returns object as-is when not an array', () => {
    const s = { flex: 1, color: 'red' };
    expect(flattenStyle(s)).toBe(s);
  });

  it('flattens an array of style objects', () => {
    const result = flattenStyle([{ flex: 1, color: 'red' }, { color: 'blue' }]);
    expect(result).toEqual({ flex: 1, color: 'blue' });
  });

  it('later styles override earlier ones', () => {
    const result = flattenStyle([
      { fontSize: 14, fontWeight: 'normal' },
      { fontWeight: 'bold' },
    ]);
    expect(result.fontWeight).toBe('bold');
    expect(result.fontSize).toBe(14);
  });

  it('handles nested arrays', () => {
    const result = flattenStyle([[{ flex: 1 }, { color: 'red' }], { color: 'green' }]);
    expect(result).toEqual({ flex: 1, color: 'green' });
  });

  it('ignores null/undefined entries in array', () => {
    const result = flattenStyle([null, { flex: 1 }, undefined]);
    expect(result).toEqual({ flex: 1 });
  });

  it('returns empty object for empty array', () => {
    const result = flattenStyle([]);
    expect(result).toEqual({});
  });
});

describe('StyleSheet', () => {
  describe('create', () => {
    it('returns the same style object passed in', () => {
      const styles = StyleSheet.create({
        container: { flex: 1 },
        text: { fontSize: 16 },
      } as any);
      expect(styles.container).toEqual({ flex: 1 });
      expect(styles.text).toEqual({ fontSize: 16 });
    });
  });

  describe('compose', () => {
    it('returns array when both styles provided', () => {
      const s1 = { flex: 1 } as any;
      const s2 = { flex: 2 } as any;
      const composed = StyleSheet.compose(s1, s2);
      expect(Array.isArray(composed)).toBe(true);
    });

    it('returns single style when other is undefined', () => {
      const s1 = { flex: 1 } as any;
      expect(StyleSheet.compose(s1, undefined)).toBe(s1);
      expect(StyleSheet.compose(undefined, s1)).toBe(s1);
    });
  });

  describe('flatten', () => {
    it('flattens multiple styles into one', () => {
      const styles = StyleSheet.create({
        base: { fontSize: 14 } as any,
        override: { fontSize: 18 } as any,
      } as any);
      const result = StyleSheet.flatten([styles.base, styles.override]);
      expect(result.fontSize).toBe(18);
    });

    it('returns object unchanged', () => {
      const s = { fontSize: 16 } as any;
      expect(StyleSheet.flatten(s)).toBe(s);
    });
  });
});

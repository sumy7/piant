import { describe, expect, it } from 'vitest';
import { StyleSheet } from '../src/styleSheet';
import composeStyles from '../src/styleSheet/composeStyles';
import flattenStyle from '../src/styleSheet/flattenStyle';

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

  it('returns undefined when both are null', () => {
    expect(composeStyles(null, null)).toBeUndefined();
  });

  it('returns style2 when style1 is null', () => {
    const s2 = { flex: 1 } as any;
    expect(composeStyles(null, s2)).toBe(s2);
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

  describe('resolve', () => {
    it('resolves a plain style object', () => {
      const s = { flex: 1, color: 'red' } as any;
      expect(StyleSheet.resolve(s)).toBe(s);
    });

    it('resolves an array of styles', () => {
      const result = StyleSheet.resolve([
        { padding: 8 } as any,
        { padding: 16, color: 'blue' } as any,
      ]);
      expect(result).toEqual({ padding: 16, color: 'blue' });
    });

    it('returns undefined for falsy input', () => {
      expect(StyleSheet.resolve(null)).toBeUndefined();
      expect(StyleSheet.resolve(undefined)).toBeUndefined();
    });

    it('ignores false in arrays', () => {
      const result = StyleSheet.resolve([
        { flex: 1 } as any,
        false,
        { color: 'green' } as any,
      ]);
      expect(result).toEqual({ flex: 1, color: 'green' });
    });
  });

  describe('extend', () => {
    it('creates a StyleReference marker object', () => {
      const ref = StyleSheet.extend('base', { color: 'red' } as any);
      expect(ref.__isStyleRef).toBe(true);
      expect(ref.parents).toEqual(['base']);
      expect(ref.style).toEqual({ color: 'red' });
    });

    it('accepts an array of parent keys', () => {
      const ref = StyleSheet.extend(['a', 'b'], { flex: 1 } as any);
      expect(ref.parents).toEqual(['a', 'b']);
    });

    it('accepts a parent style object directly', () => {
      const parent = { padding: 12 } as any;
      const ref = StyleSheet.extend(parent, { color: 'blue' } as any);
      expect(ref.parents).toEqual([parent]);
    });

    it('defaults override to empty object', () => {
      const ref = StyleSheet.extend('base' as any);
      expect(ref.style).toEqual({});
    });
  });

  describe('create with extend (style inheritance)', () => {
    it('resolves single parent inheritance by key', () => {
      const styles = StyleSheet.create({
        base: { padding: 12, borderRadius: 8 } as any,
        primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' } as any),
      } as any);
      expect(styles.primary).toEqual({
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#0055ff',
      });
    });

    it('child properties override parent properties', () => {
      const styles = StyleSheet.create({
        base: { padding: 12, color: 'black' } as any,
        override: StyleSheet.extend('base', { color: 'red' } as any),
      } as any);
      expect(styles.override).toEqual({ padding: 12, color: 'red' });
    });

    it('resolves deep inheritance chain', () => {
      const styles = StyleSheet.create({
        base: { padding: 8 } as any,
        panel: StyleSheet.extend('base', { backgroundColor: '#fff' } as any),
        button: StyleSheet.extend('panel', { alignItems: 'center' } as any),
      } as any);
      expect(styles.button).toEqual({
        padding: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
      });
    });

    it('resolves multiple parent keys (multi-parent inheritance)', () => {
      const styles = StyleSheet.create({
        rounded: { borderRadius: 8 } as any,
        elevated: { opacity: 0.9 } as any,
        card: StyleSheet.extend(['rounded', 'elevated'], { backgroundColor: '#fff' } as any),
      } as any);
      expect(styles.card).toEqual({
        borderRadius: 8,
        opacity: 0.9,
        backgroundColor: '#fff',
      });
    });

    it('later parents override earlier parents in multi-parent inheritance', () => {
      const styles = StyleSheet.create({
        a: { color: 'red', padding: 4 } as any,
        b: { color: 'blue' } as any,
        c: StyleSheet.extend(['a', 'b'], {} as any),
      } as any);
      expect(styles.c).toEqual({ color: 'blue', padding: 4 });
    });

    it('child overrides all parents', () => {
      const styles = StyleSheet.create({
        a: { color: 'red' } as any,
        b: { color: 'blue' } as any,
        c: StyleSheet.extend(['a', 'b'], { color: 'green' } as any),
      } as any);
      expect(styles.c.color).toBe('green');
    });

    it('handles direct style object as parent in create', () => {
      const base = { padding: 16, flex: 1 } as any;
      const styles = StyleSheet.create({
        derived: StyleSheet.extend(base, { color: 'red' } as any),
      } as any);
      expect(styles.derived).toEqual({ padding: 16, flex: 1, color: 'red' });
    });

    it('does not mutate non-extended entries', () => {
      const baseObj = { padding: 12 } as any;
      const styles = StyleSheet.create({
        base: baseObj,
        child: StyleSheet.extend('base', { color: 'blue' } as any),
      } as any);
      expect(styles.base).toBe(baseObj);
      expect(styles.child).not.toBe(baseObj);
    });

    it('handles circular reference gracefully (no infinite loop)', () => {
      expect(() => {
        StyleSheet.create({
          a: StyleSheet.extend('b', { color: 'red' } as any),
          b: StyleSheet.extend('a', { color: 'blue' } as any),
        } as any);
      }).not.toThrow();
    });

    it('ignores unknown parent keys gracefully', () => {
      const styles = StyleSheet.create({
        derived: StyleSheet.extend('nonexistent', { padding: 8 } as any),
      } as any);
      expect(styles.derived).toEqual({ padding: 8 });
    });
  });
});

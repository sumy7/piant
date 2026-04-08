import { describe, expect, it } from 'vitest';
import { splitProps } from '../src/reactivity/props';

describe('splitProps', () => {
  it('splits props into picked and rest', () => {
    const props = { a: 1, b: 2, c: 3 };
    const [picked, rest] = splitProps(props, ['a', 'b']);
    expect(picked).toMatchObject({ a: 1, b: 2 });
    expect(rest).toMatchObject({ c: 3 });
  });

  it('returns empty picked when keys array is empty', () => {
    const props = { a: 1, b: 2 };
    const [picked, rest] = splitProps(props, []);
    expect(Object.keys(picked)).toHaveLength(0);
    expect(rest).toMatchObject({ a: 1, b: 2 });
  });

  it('rest contains all props when no keys match', () => {
    const props = { a: 1, b: 2 };
    const [picked, rest] = splitProps(props, ['c' as keyof typeof props]);
    expect(Object.keys(picked)).toHaveLength(0);
    expect(rest).toMatchObject({ a: 1, b: 2 });
  });

  it('supports splitting into multiple groups', () => {
    const props = { a: 1, b: 2, c: 3, d: 4 };
    const [g1, g2, rest] = splitProps(props, ['a'], ['b', 'c']) as any;
    expect(g1).toMatchObject({ a: 1 });
    expect(g2).toMatchObject({ b: 2, c: 3 });
    expect(rest).toMatchObject({ d: 4 });
  });

  it('preserves getters / property descriptors', () => {
    const props = {} as { dynamic: number };
    let _val = 10;
    Object.defineProperty(props, 'dynamic', {
      get: () => _val,
      enumerable: true,
      configurable: true,
    });

    const [picked] = splitProps(props, ['dynamic']);
    expect(picked.dynamic).toBe(10);
    _val = 20;
    expect(picked.dynamic).toBe(20); // getter is still live
  });

  it('key in picked group is no longer in rest', () => {
    const props = { x: 1, y: 2 };
    const [, rest] = splitProps(props, ['x']);
    expect('x' in rest).toBe(false);
    expect('y' in rest).toBe(true);
  });
});

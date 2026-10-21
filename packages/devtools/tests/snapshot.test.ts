import { describe, expect, it, vi } from 'vitest';
import { readonlySnapshot } from '../src';

describe('readonlySnapshot', () => {
  it('copies and deeply freezes data without invoking accessors or freezing application objects', () => {
    const getter = vi.fn(() => {
      throw new Error('must not run');
    });
    const value = {
      list: [{ count: 1 }],
      get secret() {
        return getter();
      },
    };
    const result = readonlySnapshot(value) as {
      list: readonly { count: number }[];
      secret: string;
    };
    expect(getter).not.toHaveBeenCalled();
    expect(result.secret).toBe('[Accessor]');
    expect(result.list).toEqual([{ count: 1 }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.list)).toBe(true);
    expect(Object.isFrozen(result.list[0])).toBe(true);
    value.list[0].count = 7;
    expect(result.list[0].count).toBe(1);
    expect(Object.isFrozen(value.list[0])).toBe(false);
  });

  it('serializes circular and unsupported values with explicit markers', () => {
    const value: Record<string, unknown> = {
      number: Number.NaN,
      missing: undefined,
      bigint: 1n,
      fn: () => {},
      date: new Date(),
    };
    value.self = value;
    const result = readonlySnapshot(value);
    expect(result).toEqual({
      number: 'NaN',
      missing: '[undefined]',
      bigint: '[bigint]',
      fn: '[function]',
      date: '[Non-plain object]',
      self: '[Circular]',
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('bounds depth, strings and wide containers', () => {
    const nested: { next?: unknown } = {};
    let current = nested;
    for (let i = 0; i < 8; i++) {
      const next = {};
      current.next = next;
      current = next;
    }
    expect(JSON.stringify(readonlySnapshot(nested))).toContain('[Max depth]');
    expect((readonlySnapshot('x'.repeat(10001)) as string).length).toBe(10011);
    const array = readonlySnapshot(
      Array.from({ length: 200 }, (_, index) => index),
    ) as readonly unknown[];
    expect(array).toHaveLength(101);
    expect(array[100]).toBe('[Truncated]');
  });

  it('preserves sparse array indices and trailing holes without changing the source', () => {
    const source = new Array<unknown>(5);
    source[2] = { count: 1 };
    const result = readonlySnapshot(source);
    expect(result).toEqual([null, null, { count: 1 }, null, null]);
    expect(JSON.stringify(result)).toBe('[null,null,{"count":1},null,null]');
    expect(source).toHaveLength(5);
    expect(Object.hasOwn(source, 0)).toBe(false);
    expect(Object.hasOwn(source, 4)).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('ignores array metadata and does not invoke array index accessors', () => {
    const getter = vi.fn(() => {
      throw new Error('must not run');
    });
    const source = [1, 2, 3];
    Object.defineProperty(source, '1', { enumerable: true, get: getter });
    Object.defineProperty(source, 'metadata', {
      enumerable: true,
      value: 'not an array item',
    });
    Object.defineProperty(source, 'secret', { enumerable: true, get: getter });
    expect(readonlySnapshot(source)).toEqual([1, '[Accessor]', 3]);
    expect(getter).not.toHaveBeenCalled();
    expect(source).toHaveLength(3);
  });

  it('bounds sparse arrays by length even when they have very few own properties', () => {
    const source = new Array<unknown>(1000000);
    source[999999] = 'outside the bound';
    const result = readonlySnapshot(source) as readonly unknown[];
    expect(result).toHaveLength(101);
    expect(result.slice(0, 100)).toEqual(
      Array.from({ length: 100 }, () => null),
    );
    expect(result[100]).toBe('[Truncated]');
  });

  it('contains property inspection failures without exposing application objects', () => {
    const proxy = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('unavailable');
        },
      },
    );
    expect(readonlySnapshot(proxy)).toBe('[Unavailable]');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { children, cleanup, effect, memo, root, untrack } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('root', () => {
  it('returns the value from the function', () => {
    const result = root(() => 42);
    expect(result).toBe(42);
  });

  it('provides a dispose function that runs registered cleanups', () => {
    const cleaned = vi.fn();
    root((dispose) => {
      cleanup(cleaned);
      dispose();
    });
    expect(cleaned).toHaveBeenCalledTimes(1);
  });

  it('runs cleanup functions in order when disposed', () => {
    const order: number[] = [];
    root((dispose) => {
      cleanup(() => order.push(1));
      cleanup(() => order.push(2));
      cleanup(() => order.push(3));
      dispose();
    });
    expect(order).toEqual([1, 2, 3]);
  });

  it('clears disposables after dispose is called', () => {
    const cleaned = vi.fn();
    root((dispose) => {
      cleanup(cleaned);
      dispose();
      dispose(); // second call should not trigger again
    });
    expect(cleaned).toHaveBeenCalledTimes(1);
  });
});

describe('effect', () => {
  it('runs immediately', () => {
    const fn = vi.fn();
    root(() => {
      effect(fn);
    });
    expect(fn).toHaveBeenCalled();
  });

  it('re-runs when observed state changes', () => {
    root(() => {
      const [get, set] = createState(0);
      const results: number[] = [];
      effect(() => {
        results.push(get());
      });
      set(1);
      set(2);
      expect(results).toEqual([0, 1, 2]);
    });
  });

  it('passes previous value to next run', () => {
    root(() => {
      const [get, set] = createState(1);
      const accumulator: number[] = [];
      effect<number, number>((prev) => {
        const current = get();
        accumulator.push(prev + current);
        return current;
      }, 0);
      set(2);
      expect(accumulator[0]).toBe(1); // 0 + 1
      expect(accumulator[1]).toBe(3); // 1 (prev) + 2 (current) = 3
    });
  });
});

describe('memo', () => {
  it('returns a getter with the computed value', () => {
    root(() => {
      const [get, set] = createState(5);
      const doubled = memo(() => get() * 2);
      expect(doubled()).toBe(10);
      set(7);
      expect(doubled()).toBe(14);
    });
  });

  it('does not update observable when value is equal', () => {
    root(() => {
      const [get, set] = createState(1);
      const m = memo(() => (get() > 0 ? 'positive' : 'non-positive'));
      expect(m()).toBe('positive');
      set(2); // still positive
      // The cached observable value stays the same
      expect(m()).toBe('positive');
    });
  });

  it('recomputes when value changes', () => {
    root(() => {
      const [get, set] = createState(1);
      const m = memo(() => get() > 0);
      expect(m()).toBe(true);
      set(-1);
      expect(m()).toBe(false);
    });
  });

  it('supports custom equals option', () => {
    root(() => {
      const [get, set] = createState({ a: 1 });
      let computeCount = 0;
      const m = memo(
        () => {
          computeCount++;
          return get().a;
        },
        undefined,
        { equals: false },
      );
      m();
      set({ a: 1 });
      m();
      expect(computeCount).toBeGreaterThan(1);
    });
  });
});

describe('untrack', () => {
  it('reads reactive value without tracking', () => {
    root(() => {
      const [get, set] = createState(0);
      let effectRuns = 0;
      effect(() => {
        effectRuns++;
        untrack(() => get()); // read without tracking
      });
      set(1);
      // Effect should not have re-run because we untracked
      expect(effectRuns).toBe(1);
    });
  });
});

describe('children', () => {
  it('resolves a function child (zero-arg) to a nested memo', () => {
    root(() => {
      const [get, set] = createState('hello');
      const c = children(() => () => get());
      // c() returns a getter (memo), calling it gives the actual value
      const inner = c() as any;
      expect(typeof inner).toBe('function');
      expect(inner()).toBe('hello');
      set('world');
      expect(inner()).toBe('world');
    });
  });

  it('resolves an array of children', () => {
    root(() => {
      const c = children(() => ['a', 'b', 'c']);
      expect(c()).toEqual(['a', 'b', 'c']);
    });
  });

  it('resolves nested arrays of children flatly', () => {
    root(() => {
      const c = children(() => ['a', ['b', 'c']]);
      expect(c()).toEqual(['a', 'b', 'c']);
    });
  });

  it('toArray returns array from non-array value', () => {
    root(() => {
      const c = children(() => 'single');
      expect(c.toArray()).toEqual(['single']);
    });
  });

  it('toArray returns empty array for null', () => {
    root(() => {
      const c = children(() => null);
      expect(c.toArray()).toEqual([]);
    });
  });

  it('toArray returns array as-is for array value', () => {
    root(() => {
      const c = children(() => ['a', 'b']);
      expect(c.toArray()).toEqual(['a', 'b']);
    });
  });
});

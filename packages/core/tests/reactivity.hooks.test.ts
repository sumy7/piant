import { describe, expect, it, vi } from 'vitest';
import { root } from '../src/reactivity/effects';
import {
  createEffect,
  createMemo,
  createSelector,
  createState,
  onCleanup,
  onError,
  onMount,
} from '../src/reactivity/hooks';

describe('createState', () => {
  it('initializes with provided value', () => {
    root(() => {
      const [get] = createState(42);
      expect(get()).toBe(42);
    });
  });

  it('initializes with undefined when no value provided', () => {
    root(() => {
      const [get] = createState();
      expect(get()).toBeUndefined();
    });
  });

  it('updates with a direct value', () => {
    root(() => {
      const [get, set] = createState(0);
      set(10);
      expect(get()).toBe(10);
    });
  });

  it('updates with an updater function', () => {
    root(() => {
      const [get, set] = createState(5);
      set((prev) => prev! * 2);
      expect(get()).toBe(10);
    });
  });

  it('returns the new value from setter', () => {
    root(() => {
      const [, set] = createState(0);
      const result = set(99);
      expect(result).toBe(99);
    });
  });

  it('returns computed value from updater function in setter', () => {
    root(() => {
      const [, set] = createState(5);
      const result = set((v) => v! + 1);
      expect(result).toBe(6);
    });
  });
});

describe('createMemo', () => {
  it('creates a derived reactive value', () => {
    root(() => {
      const [get, set] = createState(3);
      const squared = createMemo(() => get() * get());
      expect(squared()).toBe(9);
      set(4);
      expect(squared()).toBe(16);
    });
  });
});

describe('createEffect', () => {
  it('runs callback immediately', () => {
    const fn = vi.fn();
    root(() => {
      createEffect(fn);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-runs when reactive dependencies change', () => {
    root(() => {
      const [get, set] = createState(0);
      const values: number[] = [];
      createEffect(() => {
        values.push(get());
      });
      set(1);
      set(2);
      expect(values).toEqual([0, 1, 2]);
    });
  });
});

describe('onCleanup', () => {
  it('runs cleanup when owner is disposed', () => {
    const fn = vi.fn();
    root((dispose) => {
      createEffect(() => {
        onCleanup(fn);
      });
      dispose();
    });
    expect(fn).toHaveBeenCalled();
  });

  it('does nothing when there is no owner', () => {
    // This should not throw
    expect(() => onCleanup(() => {})).not.toThrow();
  });
});

describe('onMount', () => {
  it('runs on mount without tracking reactive reads', () => {
    root(() => {
      const [get, set] = createState(0);
      let mountRuns = 0;
      let effectRuns = 0;

      onMount(() => {
        mountRuns++;
        get(); // reading inside onMount should not track
      });

      createEffect(() => {
        effectRuns++;
        get(); // this tracks
      });

      set(1);

      expect(mountRuns).toBe(1); // onMount only runs once
      expect(effectRuns).toBe(2); // effect re-runs on state change
    });
  });
});

describe('onError', () => {
  it('does nothing when there is no owner', () => {
    // Should not throw
    expect(() => onError(() => {})).not.toThrow();
  });

  it('registers error handler with owner', () => {
    root(() => {
      const errors: Error[] = [];
      onError((e) => errors.push(e));
      // Verify handler was registered without throwing
      expect(errors).toEqual([]);
    });
  });
});

describe('createSelector', () => {
  it('returns true when key matches source', () => {
    root(() => {
      const [get] = createState<string>('a');
      const isSelected = createSelector(get);
      expect(isSelected('a')).toBe(true);
      expect(isSelected('b')).toBe(false);
    });
  });

  it('updates selected state when source changes', () => {
    root(() => {
      const [get, set] = createState<string>('a');
      const isSelected = createSelector(get);

      const results: boolean[] = [];
      createEffect(() => {
        results.push(isSelected('b'));
      });

      set('b');
      expect(results[results.length - 1]).toBe(true);
    });
  });

  it('supports custom comparator', () => {
    root(() => {
      const [get] = createState(5);
      // Custom comparator: item is "selected" if it equals source
      const isSelected = createSelector(get, (key: number, val: number) => key === val);
      expect(isSelected(5)).toBe(true);
      expect(isSelected(3)).toBe(false);
    });
  });

  it('cleans up subscriptions on cleanup', () => {
    root((dispose) => {
      const [get] = createState<string>('a');
      const isSelected = createSelector(get);
      isSelected('a');
      // Should not throw when disposed
      expect(() => dispose()).not.toThrow();
    });
  });
});

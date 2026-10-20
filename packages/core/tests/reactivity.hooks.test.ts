import { describe, expect, it, vi } from 'vitest';
import { createContext, useContext } from '../src/reactivity/context';
import { root } from '../src/reactivity/effects';
import { handleError } from '../src/reactivity/errors';
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
  it('runs after initialization without tracking reactive reads', async () => {
    const [get, set] = createState(0);
    let mountRuns = 0;
    let effectRuns = 0;
    const dispose = root((dispose) => {

      onMount(() => {
        mountRuns++;
        get(); // reading inside onMount should not track
      });

      createEffect(() => {
        effectRuns++;
        get(); // this tracks
      });

      set(1);

      expect(mountRuns).toBe(0);
      expect(effectRuns).toBe(2); // effect re-runs on state change
      return dispose;
    });
    await Promise.resolve();
    expect(mountRuns).toBe(1);
    set(2);
    await Promise.resolve();
    expect(mountRuns).toBe(1);
    expect(effectRuns).toBe(3);
    dispose();
  });

  it('cancels a pending callback when its root is disposed', async () => {
    const mount = vi.fn();
    root((dispose) => {
      onMount(mount);
      dispose();
    });
    await Promise.resolve();
    expect(mount).not.toHaveBeenCalled();
  });

  it('restores context and owns cleanup and effects created in the callback', async () => {
    const context = createContext('default');
    const [value, setValue] = createState(0);
    const cleanup = vi.fn();
    const values: number[] = [];
    let mountedContext: string | undefined;
    const dispose = root((dispose) => {
      context.Provider({
        value: 'provided',
        get children() {
          onMount(() => {
            mountedContext = useContext(context);
            onCleanup(cleanup);
            createEffect(() => values.push(value()));
          });
          return null;
        },
      });
      return dispose;
    });
    await Promise.resolve();
    expect(mountedContext).toBe('provided');
    expect(values).toEqual([0]);
    setValue(1);
    expect(values).toEqual([0, 1]);
    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
    setValue(2);
    expect(values).toEqual([0, 1]);
  });

  it('routes deferred errors to the registering owner', async () => {
    const error = new Error('mount-error');
    const handler = vi.fn();
    const dispose = root((dispose) => {
      onError(handler);
      onMount(() => {
        throw error;
      });
      return dispose;
    });
    await Promise.resolve();
    expect(handler).toHaveBeenCalledExactlyOnceWith(error);
    dispose();
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

      // Trigger an error — the registered handler should receive it
      const testError = new Error('hook-error');
      handleError(testError);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe(testError);
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

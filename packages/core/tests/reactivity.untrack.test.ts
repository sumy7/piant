import { describe, expect, it } from 'vitest';
import {
  createEffect,
  createState,
  onCleanup,
  root,
  untrack,
} from '../src/index';

describe('public untrack', () => {
  it('returns values without subscribing the outer effect to callback reads', () => {
    const [trigger, setTrigger] = createState(0);
    const [snapshot, setSnapshot] = createState(1);
    const observed: number[] = [];
    const dispose = root((dispose) => {
      createEffect(() => {
        trigger();
        observed.push(untrack(() => snapshot()));
      });
      return dispose;
    });
    try {
      setSnapshot(2);
      expect(observed).toEqual([1]);
      setTrigger(1);
      expect(observed).toEqual([1, 2]);
    } finally {
      dispose();
    }
  });

  it('preserves the owner, synchronous return value and thrown error', () => {
    let cleaned = 0;
    const dispose = root((dispose) => {
      expect(
        untrack(() => {
          onCleanup(() => {
            cleaned++;
          });
          return 42;
        }),
      ).toBe(42);
      return dispose;
    });
    expect(cleaned).toBe(0);
    dispose();
    expect(cleaned).toBe(1);
    const error = new Error('consumer');
    expect(() =>
      untrack(() => {
        throw error;
      }),
    ).toThrow(error);
  });
});

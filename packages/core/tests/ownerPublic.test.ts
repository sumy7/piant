import { describe, expect, it, vi } from 'vitest';
import {
  type ContextOwner,
  createContext,
  createEffect,
  createState,
  getOwner,
  onCleanup,
  onError,
  root,
  runWithOwner,
  useContext,
} from '../src';

describe('public owner helpers', () => {
  it('restores nested owners and the outside owner, including thrown callbacks', () => {
    expect(getOwner()).toBeNull();
    root((dispose) => {
      const parent = getOwner();
      expect(parent).not.toBeNull();
      root((disposeChild) => {
        const child = getOwner();
        expect(child?.owner).toBe(parent);
        expect(runWithOwner(parent, getOwner)).toBe(parent);
        expect(getOwner()).toBe(child);
        expect(() =>
          runWithOwner(null, () => {
            throw new Error('failure');
          }),
        ).toThrow('failure');
        expect(getOwner()).toBe(child);
        disposeChild();
      });
      expect(getOwner()).toBe(parent);
      dispose();
    });
    expect(getOwner()).toBeNull();
  });

  it('keeps deferred content in its captured context and disposes its effects exactly once', async () => {
    const context = createContext('outside');
    const [value, setValue] = createState(0);
    const seen: number[] = [];
    const cleanup = vi.fn();
    let owner: ContextOwner | null = null;
    let stop = () => {};
    const disposeParent = root((dispose) => {
      context.Provider({
        value: 'inside',
        children: () => {
          stop = root((disposeContent) => {
            owner = getOwner();
            return disposeContent;
          });
          onCleanup(stop);
        },
      });
      return dispose;
    });
    await Promise.resolve();
    runWithOwner(owner, () => {
      expect(useContext(context)).toBe('inside');
      createEffect(() => {
        seen.push(value());
      });
      onCleanup(cleanup);
    });
    expect(getOwner()).toBeNull();
    setValue(1);
    expect(seen).toEqual([0, 1]);
    disposeParent();
    stop();
    setValue(2);
    expect(seen).toEqual([0, 1]);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('routes errors to the captured owner without retaining it after the callback', () => {
    const handle = vi.fn();
    let owner: ContextOwner | null = null;
    const dispose = root((dispose) => {
      onError(handle);
      owner = getOwner();
      return dispose;
    });
    const error = new Error('deferred');
    expect(
      runWithOwner(owner, () => {
        throw error;
      }),
    ).toBeUndefined();
    expect(handle).toHaveBeenCalledWith(error);
    expect(getOwner()).toBeNull();
    dispose();
  });
});

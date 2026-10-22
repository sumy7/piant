import { PNode, root } from '@piant/core';
import { Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type AnimationTask, sequence, stagger } from '../src/orchestration';
import { PNodeAnimation } from '../src/PNodeAnimation';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const task = {
    finished: new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    }),
    // Deliberately does not settle: group cancellation must still settle promptly.
    cancel: vi.fn(),
  };
  return { task, resolve, reject };
}
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

afterEach(() => {
  vi.useRealTimers();
});

describe('animation orchestration', () => {
  it('starts lazy sequence steps only after successful completion, including nested groups', async () => {
    const first = deferred();
    const last = deferred();
    const order: number[] = [];
    const group = sequence([
      () => {
        order.push(1);
        return first.task;
      },
      () =>
        sequence([
          () => {
            order.push(2);
            return last.task;
          },
        ]),
    ]);
    expect(order).toEqual([1]);
    first.resolve();
    await flush();
    expect(order).toEqual([1, 2]);
    expect(group.playState).toBe('running');
    last.resolve();
    await group.finished;
    expect(group.playState).toBe('finished');
  });

  it('stagger measures starts from invocation and waits for all completions', async () => {
    vi.useFakeTimers();
    const tasks = [deferred(), deferred(), deferred()];
    const starts: number[] = [];
    const group = stagger(
      tasks.map(({ task }, i) => () => {
        starts.push(i);
        return task;
      }),
      40,
    );
    expect(starts).toEqual([0]);
    await vi.advanceTimersByTimeAsync(39);
    expect(starts).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    expect(starts).toEqual([0, 1]);
    await vi.advanceTimersByTimeAsync(40);
    expect(starts).toEqual([0, 1, 2]);
    tasks[2].resolve();
    tasks[0].resolve();
    await flush();
    expect(group.playState).toBe('running');
    tasks[1].resolve();
    await group.finished;
  });

  it('cancels running and pending steps and settles even for a non-settling child', async () => {
    vi.useFakeTimers();
    const child = deferred();
    const pending = vi.fn(() => deferred().task);
    const group = stagger([() => child.task, pending], 50);
    group.cancel();
    group.cancel();
    await expect(group.finished).rejects.toThrow('cancelled');
    await vi.advanceTimersByTimeAsync(100);
    expect(pending).not.toHaveBeenCalled();
    expect(child.task.cancel).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    child.resolve();
    await flush();
    expect(group.playState).toBe('cancelled');
  });

  it('propagates failures, drains siblings and never starts a later sequence step', async () => {
    const error = new Error('step failed');
    const child = deferred();
    const later = vi.fn(() => child.task);
    const group = sequence([() => child.task, later]);
    child.reject(error);
    await expect(group.finished).rejects.toBe(error);
    expect(later).not.toHaveBeenCalled();
    const sibling = deferred();
    const failed = stagger(
      [
        () => sibling.task,
        () => {
          throw error;
        },
      ],
      0,
    );
    await expect(failed.finished).rejects.toBe(error);
    expect(sibling.task.cancel).toHaveBeenCalledTimes(1);
    expect(failed.playState).toBe('failed');
  });

  it('cleans delayed work on owner disposal and settles empty groups', async () => {
    vi.useFakeTimers();
    const child = deferred();
    const pending = vi.fn(() => child.task);
    let dispose = () => {};
    const group = root((cleanup) => {
      dispose = cleanup;
      return stagger([() => child.task, pending], 20);
    });
    dispose();
    await expect(group.finished).rejects.toThrow('cancelled');
    await vi.advanceTimersByTimeAsync(50);
    expect(pending).not.toHaveBeenCalled();
    await expect(sequence([]).finished).resolves.toBeUndefined();
    await expect(stagger([]).finished).resolves.toBeUndefined();
    expect(() => stagger([], -1)).toThrow(RangeError);
    expect(() => stagger([], Infinity)).toThrow(RangeError);
  });

  it('cancels a handle returned after its factory synchronously disposes the owner', async () => {
    const child = deferred();
    const group = root((dispose) =>
      sequence([
        () => {
          dispose();
          return child.task;
        },
      ]),
    );
    await expect(group.finished).rejects.toThrow('cancelled');
    expect(child.task.cancel).toHaveBeenCalledTimes(1);
  });

  it('runs actual node animations through nested sequence/stagger and removes ticker resources', async () => {
    const ticker = Ticker.shared;
    const autoStart = ticker.autoStart;
    ticker.autoStart = false;
    ticker.stop();
    const baseline = ticker.count;
    const node = new PNode();
    const make = (x: number): AnimationTask =>
      new PNodeAnimation(node, [{ x: node._animTranslate.x }, { x }], {
        duration: 20,
        fill: 'forwards',
      });
    const group = sequence([
      () => make(10),
      () => stagger([() => make(20)], 10),
    ]);
    try {
      let time = Math.ceil(performance.now());
      ticker.update(time);
      time += 25;
      ticker.update(time);
      await flush();
      time += 25;
      ticker.update(time);
      await group.finished;
      expect(node._animTranslate.x).toBe(20);
      expect(ticker.count).toBe(baseline);
    } finally {
      group.cancel();
      node.destroy();
      ticker.stop();
      ticker.autoStart = autoStart;
    }
  });
});

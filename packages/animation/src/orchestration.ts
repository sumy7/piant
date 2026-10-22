import { onCleanup } from '@piant/core';

/** A lazily created animation or another sequence/stagger group. */
export interface AnimationTask {
  readonly finished: Promise<unknown>;
  cancel(): void;
}

export type AnimationStep = () => AnimationTask;
export type AnimationGroupState =
  'running' | 'finished' | 'cancelled' | 'failed';

export interface AnimationGroup extends AnimationTask {
  readonly finished: Promise<void>;
  readonly playState: AnimationGroupState;
}

function createGroup(
  steps: readonly AnimationStep[],
  interval?: number,
): AnimationGroup {
  let state: AnimationGroupState = 'running';
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const active = new Set<AnimationTask>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const finished = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  // Cancellation is observable to awaiters without creating an unhandled rejection
  // when a component only relies on automatic owner cleanup.
  void finished.catch(() => {});

  const stop = (next: 'cancelled' | 'failed', error: unknown) => {
    if (state !== 'running') return;
    state = next;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    for (const task of active) {
      try {
        task.cancel();
      } catch {
        /* Continue draining independent resources. */
      }
    }
    active.clear();
    reject(error);
  };
  const group: AnimationGroup = {
    finished,
    get playState() {
      return state;
    },
    cancel() {
      stop('cancelled', new Error('Animation group cancelled'));
    },
  };
  onCleanup(() => group.cancel());

  let completed = 0;
  const start = (index: number) => {
    if (state !== 'running') return;
    try {
      const task = steps[index]();
      // Observe completion before cancellation, including a factory that disposes
      // its own owner synchronously before returning the new handle.
      void task.finished.then(
        () => {
          active.delete(task);
          if (state !== 'running') return;
          completed += 1;
          if (completed === steps.length) {
            state = 'finished';
            resolve();
          } else if (interval === undefined) {
            start(index + 1);
          }
        },
        (error) => {
          stop('failed', error);
        },
      );
      if (state === 'running') active.add(task);
      else task.cancel();
    } catch (error) {
      stop('failed', error);
    }
  };

  if (!steps.length) {
    state = 'finished';
    resolve();
  } else {
    start(0);
    if (interval !== undefined) {
      for (let i = 1; i < steps.length && state === 'running'; i += 1) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          start(i);
        }, i * interval);
        timers.add(timer);
      }
    }
  }
  return group;
}

/** Start each factory only after the preceding task finishes successfully. */
export function sequence(steps: readonly AnimationStep[]): AnimationGroup {
  return createGroup([...steps]);
}

/** Start factories at offsets 0, interval, 2*interval… (milliseconds). */
export function stagger(
  steps: readonly AnimationStep[],
  interval = 50,
): AnimationGroup {
  if (!Number.isFinite(interval) || interval < 0) {
    throw new RangeError(
      'stagger interval must be a finite non-negative number',
    );
  }
  return createGroup([...steps], interval);
}

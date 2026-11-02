import { createEffect, root } from '@piant/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createToastStore,
  type ToastInput,
  type ToastStore,
  type ToastStoreOptions,
  type ToastUpdate,
} from '../src/components/internal/toastStore';

const stores: ToastStore[] = [];
const cleanups: (() => void)[] = [];
function make(options?: ToastStoreOptions) {
  const store = createToastStore(options);
  stores.push(store);
  return store;
}
function click() {
  return new MouseEvent('click', { cancelable: true });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  for (const store of stores.splice(0)) store.dispose();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('per-provider toast queue', () => {
  it('publishes reactive immutable snapshots with normalized data and independent provider IDs', () => {
    const store = make({ maxVisible: 1 });
    const other = make();
    const observed: string[][] = [];
    cleanups.push(
      root((dispose) => {
        createEffect(() => {
          observed.push(store.items().map((item) => item.title));
        });
        return dispose;
      }),
    );
    const action = vi.fn();
    const input = {
      title: '  Saved  ',
      description: '  Local draft  ',
      action: { label: ' Undo ', onAction: action },
    };
    const id = store.show(input)!;
    const snapshot = store.items();
    expect(snapshot[0]).toMatchObject({
      id,
      title: 'Saved',
      description: 'Local draft',
      duration: 0,
      priority: 'polite',
      action: { label: 'Undo', onAction: action },
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0].action)).toBe(true);
    input.title = 'Mutated input';
    input.action.label = 'Changed action';
    expect(store.items()[0].title).toBe('Saved');
    expect(store.items()[0].action?.label).toBe('Undo');
    store.show({ title: 'Queued' });
    expect(snapshot).toHaveLength(1);
    expect(store.visible().map((item) => item.title)).toEqual(['Saved']);
    expect(store.queuedCount()).toBe(1);
    other.show({ title: 'Other provider' });
    store.dismiss(id);
    expect(other.items().map((item) => item.title)).toEqual(['Other provider']);
    expect(observed).toEqual([[], ['Saved'], ['Saved', 'Queued'], ['Queued']]);
  });

  it('rejects newest at total capacity but upserts an explicit ID in place even when full', () => {
    const store = make({ maxVisible: 1, maxToasts: 2 });
    store.show({
      id: 'first',
      title: 'First',
      description: 'Old text',
      duration: 100,
      action: { label: 'Old action', onAction() {} },
    });
    store.show({ id: 'second', title: 'Second' });
    const before = store.items();
    expect(store.show({ title: 'Rejected' })).toBeUndefined();
    expect(store.items()).toBe(before);
    expect(store.show({ id: 'first', title: 'Updated first' })).toBe('first');
    expect(store.items().map((item) => item.id)).toEqual(['first', 'second']);
    expect(store.items()[0]).toMatchObject({
      title: 'Updated first',
      duration: 0,
      description: undefined,
      action: undefined,
    });
    expect(store.items()[0]).not.toBe(before[0]);
    store.dismiss('second');
    expect(store.show({ title: 'Generated' })).toBe('toast-1');
  });

  it('generates IDs without colliding with explicit IDs', () => {
    const store = make();
    store.show({ id: 'toast-1', title: 'Explicit' });
    expect(store.show({ title: 'Generated' })).toBe('toast-2');
  });

  it('starts only visible timers after mounting and promotes queued entries FIFO with their full duration', () => {
    const store = make({ maxVisible: 1, duration: 1000 });
    const dismissed = vi.fn();
    for (const id of ['first', 'second', 'third'])
      store.show({
        id,
        title: id,
        onDismiss: (reason) => dismissed(id, reason),
      });
    vi.advanceTimersByTime(5000);
    expect(store.items()).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
    store.setMounted(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(store.visible()[0].id).toBe('second');
    expect(store.queuedCount()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(store.visible()[0].id).toBe('second');
    vi.advanceTimersByTime(1);
    expect(store.visible()[0].id).toBe('third');
    vi.advanceTimersByTime(1000);
    expect(store.items()).toEqual([]);
    expect(dismissed.mock.calls).toEqual([
      ['first', 'timeout'],
      ['second', 'timeout'],
      ['third', 'timeout'],
    ]);
  });

  it('keeps persistent defaults unscheduled and times concurrent visible entries independently', () => {
    const persistent = make();
    persistent.setMounted(true);
    persistent.show({ title: 'Persistent', priority: 'off' });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10000);
    expect(persistent.items()).toHaveLength(1);
    const store = make({ maxVisible: 2 });
    const dismissed = vi.fn();
    store.setMounted(true);
    for (const [id, duration] of [
      ['a', 100],
      ['b', 200],
      ['c', 50],
    ] as const)
      store.show({ id, title: id, duration, onDismiss: () => dismissed(id) });
    vi.advanceTimersByTime(100);
    expect(store.visible().map((item) => item.id)).toEqual(['b', 'c']);
    vi.advanceTimersByTime(50);
    expect(store.visible().map((item) => item.id)).toEqual(['b']);
    vi.advanceTimersByTime(50);
    expect(store.items()).toEqual([]);
    expect(dismissed.mock.calls).toEqual([['a'], ['c'], ['b']]);
  });

  it('retains remaining duration through independent local pause reasons', () => {
    const store = make({ duration: 1000 });
    const dismissed = vi.fn();
    store.setMounted(true);
    const id = store.show({ title: 'Pausable', onDismiss: dismissed })!;
    vi.advanceTimersByTime(250);
    store.setPaused(id, 'hover', true);
    store.setPaused(id, 'focus', true);
    vi.advanceTimersByTime(1000);
    store.setPaused(id, 'hover', false);
    vi.advanceTimersByTime(1000);
    expect(store.items()).toHaveLength(1);
    store.setPaused(id, 'focus', false);
    vi.advanceTimersByTime(749);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it('combines global pauses with local pauses without resuming for a remaining reason', () => {
    const store = make({ maxVisible: 2, duration: 1000 });
    const dismissed = vi.fn();
    store.setMounted(true);
    const a = store.show({
      id: 'a',
      title: 'A',
      onDismiss: () => dismissed('a'),
    })!;
    store.show({ id: 'b', title: 'B', onDismiss: () => dismissed('b') });
    vi.advanceTimersByTime(200);
    store.setPaused(a, 'focus', true);
    vi.advanceTimersByTime(100);
    store.setGlobalPaused('document-hidden', true);
    store.setGlobalPaused('modal', true);
    store.setPaused(a, 'focus', false);
    vi.advanceTimersByTime(5000);
    store.setGlobalPaused('document-hidden', false);
    vi.advanceTimersByTime(1000);
    expect(dismissed).not.toHaveBeenCalled();
    store.setGlobalPaused('modal', false);
    vi.advanceTimersByTime(700);
    expect(dismissed.mock.calls).toEqual([['b']]);
    vi.advanceTimersByTime(100);
    expect(dismissed.mock.calls).toEqual([['b'], ['a']]);
  });

  it('pauses on viewport unmount and resumes the remaining time on remount', () => {
    const store = make({ duration: 1000 });
    const dismissed = vi.fn();
    store.setMounted(true);
    store.show({ title: 'Retained', onDismiss: dismissed });
    vi.advanceTimersByTime(400);
    store.setMounted(false);
    vi.advanceTimersByTime(5000);
    expect(dismissed).not.toHaveBeenCalled();
    store.setMounted(true);
    vi.advanceTimersByTime(599);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it('resets full duration on partial updates while retaining pause reasons and stable order', () => {
    const store = make({ maxVisible: 1, duration: 1000 });
    const action = vi.fn();
    const dismissed = vi.fn();
    store.setMounted(true);
    const id = store.show({
      title: 'Original',
      description: 'Description',
      action: { label: 'Undo', onAction: action },
      onDismiss: dismissed,
    })!;
    store.show({ id: 'queued', title: 'Queued' });
    const oldRecord = store.items()[0];
    vi.advanceTimersByTime(600);
    store.setPaused(id, 'hover', true);
    expect(
      store.update(id, { title: 'Updated', action: null, duration: 800 }),
    ).toBe(true);
    expect(store.items().map((item) => item.id)).toEqual([id, 'queued']);
    expect(store.items()[0]).toMatchObject({
      title: 'Updated',
      description: 'Description',
      action: undefined,
      duration: 800,
    });
    expect(store.items()[0]).not.toBe(oldRecord);
    vi.advanceTimersByTime(5000);
    expect(dismissed).not.toHaveBeenCalled();
    store.setPaused(id, 'hover', false);
    vi.advanceTimersByTime(799);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it('restarts active duration on upsert and uses the latest dismissal callback', () => {
    const store = make({ duration: 1000 });
    const original = vi.fn();
    const latest = vi.fn();
    store.setMounted(true);
    store.show({ id: 'same', title: 'First', onDismiss: original });
    vi.advanceTimersByTime(900);
    store.show({ id: 'same', title: 'Second', onDismiss: latest });
    vi.advanceTimersByTime(999);
    expect(latest).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(original).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it.each(['close', 'action', 'programmatic'] as const)(
    'removes before notifying the %s dismissal callback and never notifies twice',
    (reason) => {
      const store = make({ maxVisible: 1, duration: 100 });
      const dismissed = vi.fn(() => {
        expect(store.items().map((item) => item.id)).toEqual(['queued']);
        expect(store.visible()[0].id).toBe('queued');
        expect(store.dismiss('visible')).toBe(false);
      });
      store.setMounted(true);
      store.show({ id: 'visible', title: 'Visible', onDismiss: dismissed });
      store.show({ id: 'queued', title: 'Queued', duration: 0 });
      expect(store.close('visible', reason)).toBe(true);
      vi.advanceTimersByTime(1000);
      expect(dismissed).toHaveBeenCalledExactlyOnceWith(reason);
      expect(store.close('visible', reason)).toBe(false);
    },
  );

  it('cancels action dismissal when prevented and calls only the current action on the next activation', () => {
    const store = make();
    const dismissed = vi.fn();
    const veto = vi.fn((event: MouseEvent) => event.preventDefault());
    const id = store.show({
      title: 'Undoable',
      action: { label: 'Undo', onAction: veto },
      onDismiss: dismissed,
    })!;
    expect(store.activate(id, click())).toBe(false);
    expect(veto).toHaveBeenCalledTimes(1);
    expect(store.items()).toHaveLength(1);
    const current = vi.fn();
    store.update(id, { action: { label: 'Retry', onAction: current } });
    expect(store.activate(id, click())).toBe(true);
    expect(veto).toHaveBeenCalledTimes(1);
    expect(current).toHaveBeenCalledTimes(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('action');
  });

  it('preserves an entry updated or replaced during its action rather than closing the newer version', () => {
    const store = make();
    const dismissed = vi.fn();
    store.show({
      id: 'updated',
      title: 'Before',
      onDismiss: dismissed,
      action: {
        label: 'Update',
        onAction: () => store.update('updated', { title: 'After' }),
      },
    });
    expect(store.activate('updated', click())).toBe(false);
    expect(store.items()[0].title).toBe('After');
    expect(dismissed).not.toHaveBeenCalled();
    store.show({
      id: 'replaced',
      title: 'Before replace',
      onDismiss: dismissed,
      action: {
        label: 'Replace',
        onAction: () => {
          store.dismiss('replaced');
          store.show({ id: 'replaced', title: 'Replacement' });
        },
      },
    });
    expect(store.activate('replaced', click())).toBe(false);
    expect(store.items().find((item) => item.id === 'replaced')?.title).toBe(
      'Replacement',
    );
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('programmatic');
  });

  it('allows reentrant timeout dismissal to reuse an ID without an obsolete timer closing its replacement', () => {
    const store = make({ duration: 100 });
    const dismissed = vi.fn(() =>
      store.show({ id: 'same', title: 'Replacement', duration: 0 }),
    );
    store.setMounted(true);
    store.show({ id: 'same', title: 'Original', onDismiss: dismissed });
    vi.advanceTimersByTime(100);
    expect(store.items()[0].title).toBe('Replacement');
    vi.advanceTimersByTime(1000);
    expect(store.items()).toHaveLength(1);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('clears the original batch before dismissAll callbacks and retains reentrant new entries', () => {
    const store = make();
    const first = vi.fn(() => {
      expect(store.items()).toHaveLength(0);
      store.show({ id: 'new', title: 'New' });
    });
    const second = vi.fn(() =>
      expect(store.items().map((item) => item.id)).toEqual(['new']),
    );
    store.show({ title: 'First', onDismiss: first });
    store.show({ title: 'Second', onDismiss: second });
    store.dismissAll();
    expect(first).toHaveBeenCalledExactlyOnceWith('programmatic');
    expect(second).toHaveBeenCalledExactlyOnceWith('programmatic');
    expect(store.items().map((item) => item.id)).toEqual(['new']);
  });

  it('drains batch notifications after a callback error while keeping the queue already cleared', () => {
    const store = make();
    const failure = new Error('dismiss callback failed');
    const second = vi.fn();
    store.show({
      title: 'First',
      onDismiss: () => {
        throw failure;
      },
    });
    store.show({ title: 'Second', onDismiss: second });
    expect(() => store.dismissAll()).toThrow(failure);
    expect(store.items()).toEqual([]);
    expect(second).toHaveBeenCalledExactlyOnceWith('programmatic');
  });

  it('drops all pending work on disposal, stops reentrant activation and makes future operations inert', () => {
    const store = make({ duration: 100 });
    const dismissed = vi.fn();
    const action = vi.fn(() => store.dispose());
    store.setMounted(true);
    store.show({
      id: 'action',
      title: 'Action',
      action: { label: 'Finish', onAction: action },
      onDismiss: dismissed,
    });
    store.show({ id: 'other', title: 'Other', onDismiss: dismissed });
    expect(store.activate('action', click())).toBe(false);
    expect(store.isDisposed()).toBe(true);
    expect(store.items()).toEqual([]);
    expect(store.visible()).toEqual([]);
    expect(store.queuedCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(store.show({ title: '' })).toBeUndefined();
    expect(store.update('action', { title: '' })).toBe(false);
    expect(store.dismiss('action')).toBe(false);
    expect(store.close('other', 'close')).toBe(false);
    expect(store.activate('action', click())).toBe(false);
    store.setMounted(true);
    store.setPaused('action', 'focus', false);
    store.setGlobalPaused('hidden', false);
    store.dismissAll();
    store.dispose();
    vi.advanceTimersByTime(1000);
    expect(dismissed).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it.each([
    { maxVisible: 0 },
    { maxToasts: 0 },
    { maxVisible: 1.5 },
    { maxVisible: 3, maxToasts: 2 },
    { duration: -1 },
    { duration: Number.NaN },
    { duration: Number.POSITIVE_INFINITY },
  ])('rejects invalid configuration %j', (options) =>
    expect(() => createToastStore(options)).toThrow(),
  );

  it('validates complete show/update input before changing snapshots, timers or generated identity', () => {
    const store = make({ duration: 100 });
    const dismissed = vi.fn();
    store.setMounted(true);
    const invalid: ToastInput[] = [
      { title: '  ' },
      { title: 'Title', id: ' ' },
      { title: 'Title', duration: -1 },
      { title: 'Title', duration: Number.NaN },
      { title: 'Title', duration: Number.POSITIVE_INFINITY },
      { title: 'Title', action: { label: ' ', onAction() {} } },
    ];
    for (const input of invalid) expect(() => store.show(input)).toThrow();
    expect(store.show({ title: 'Valid', onDismiss: dismissed })).toBe(
      'toast-1',
    );
    vi.advanceTimersByTime(60);
    const snapshot = store.items();
    for (const patch of [
      { title: ' ' },
      { duration: -1 },
      { duration: Number.NaN },
      { action: { label: '', onAction() {} } },
    ] as ToastUpdate[])
      expect(() => store.update('toast-1', patch)).toThrow();
    expect(store.items()).toBe(snapshot);
    vi.advanceTimersByTime(40);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it('supports finite durations larger than the native timeout limit without expiring early', () => {
    const store = make();
    const dismissed = vi.fn();
    store.setMounted(true);
    store.show({
      title: 'Long duration',
      duration: 2_147_483_647 + 100,
      onDismiss: dismissed,
    });
    vi.advanceTimersByTime(2_147_483_647);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });
  it('ignores callbacks from canceled timer handles without changing the current remaining duration', () => {
    const scheduled = vi.spyOn(globalThis, 'setTimeout');
    const store = make({ duration: 100 });
    const dismissed = vi.fn();
    store.setMounted(true);
    const id = store.show({ title: 'Current timer', onDismiss: dismissed })!;
    const original = scheduled.mock.calls[0][0] as () => void;
    vi.advanceTimersByTime(40);
    store.setPaused(id, 'focus', true);
    original();
    expect(store.items()).toHaveLength(1);
    expect(dismissed).not.toHaveBeenCalled();
    store.setPaused(id, 'focus', false);
    original();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(59);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
    original();
    expect(dismissed).toHaveBeenCalledTimes(1);
    scheduled.mockRestore();
  });

  it('does not let an old updated timer corrupt the new timer or replacement entry', () => {
    const scheduled = vi.spyOn(globalThis, 'setTimeout');
    const store = make({ duration: 100 });
    const dismissed = vi.fn();
    store.setMounted(true);
    store.show({ id: 'same', title: 'Original', onDismiss: dismissed });
    const original = scheduled.mock.calls[0][0] as () => void;
    vi.advanceTimersByTime(40);
    store.update('same', { duration: 200 });
    original();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(199);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
    store.show({ id: 'same', title: 'Replacement', duration: 0 });
    original();
    expect(store.items()[0].title).toBe('Replacement');
    scheduled.mockRestore();
  });

  it('keeps timeout cancellation and queue promotion committed when a dismissal callback throws', () => {
    const store = make({ maxVisible: 1, duration: 100 });
    const failure = new Error('callback failed');
    store.setMounted(true);
    store.show({
      id: 'old',
      title: 'Old',
      onDismiss: () => {
        throw failure;
      },
    });
    store.show({ id: 'next', title: 'Next', duration: 0 });
    expect(() => store.dismiss('old')).toThrow(failure);
    expect(store.visible()[0].id).toBe('next');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves the current toast open when its action throws and runs no dismissal callback', () => {
    const store = make();
    const dismissed = vi.fn();
    const failure = new Error('action failed');
    store.show({
      id: 'retry',
      title: 'Retry',
      action: {
        label: 'Retry',
        onAction: () => {
          throw failure;
        },
      },
      onDismiss: dismissed,
    });
    expect(() => store.activate('retry', click())).toThrow(failure);
    expect(store.items()[0].id).toBe('retry');
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('stops remaining dismissAll callbacks if a notification disposes the provider', () => {
    const store = make();
    const second = vi.fn();
    store.show({ title: 'Dispose', onDismiss: () => store.dispose() });
    store.show({ title: 'Skipped', onDismiss: second });
    store.dismissAll();
    expect(store.isDisposed()).toBe(true);
    expect(second).not.toHaveBeenCalled();
  });
  it('retains active pause reasons while an explicit-ID upsert replaces the full input', () => {
    const store = make({ duration: 100 });
    const oldDismissed = vi.fn();
    const latest = vi.fn();
    store.setMounted(true);
    store.show({ id: 'same', title: 'Original', onDismiss: oldDismissed });
    vi.advanceTimersByTime(20);
    store.setPaused('same', 'hover', true);
    store.setPaused('same', 'hover', true);
    store.show({
      id: 'same',
      title: 'New input',
      duration: 50,
      onDismiss: latest,
    });
    vi.advanceTimersByTime(1000);
    expect(latest).not.toHaveBeenCalled();
    store.setPaused('same', 'hover', false);
    vi.advanceTimersByTime(49);
    expect(latest).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(latest).toHaveBeenCalledExactlyOnceWith('timeout');
    expect(oldDismissed).not.toHaveBeenCalled();
  });

  it('keeps queued updates untimed and retains queued pause state when promoted', () => {
    const store = make({ maxVisible: 1 });
    const dismissed = vi.fn();
    store.setMounted(true);
    store.show({ id: 'first', title: 'Persistent first' });
    store.show({
      id: 'queued',
      title: 'Old queued',
      duration: 100,
      onDismiss: dismissed,
    });
    store.setPaused('queued', 'focus', true);
    store.update('queued', { title: 'Updated queued', duration: 300 });
    vi.advanceTimersByTime(1000);
    expect(dismissed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    store.dismiss('first');
    expect(store.visible()[0].title).toBe('Updated queued');
    vi.advanceTimersByTime(1000);
    expect(dismissed).not.toHaveBeenCalled();
    store.setPaused('queued', 'focus', false);
    vi.advanceTimersByTime(299);
    expect(dismissed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dismissed).toHaveBeenCalledExactlyOnceWith('timeout');
  });
});

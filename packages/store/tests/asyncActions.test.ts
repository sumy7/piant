import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDemoUserLoader,
  createUserStore,
  type User,
} from '../../../docs/examples/storeAsyncModel';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const user = { id: 1, name: 'Piant' };
const newerUser = { id: 2, name: 'Latest' };

afterEach(() => vi.useRealTimers());

describe('documented async Store actions (actual online example model)', () => {
  it('notifies subscribers with a complete success state after await', async () => {
    const pending = deferred<User>();
    const useStore = createUserStore(() => pending.promise);
    const listener = vi.fn();
    const unsubscribe = useStore.subscribe(
      (s) => ({ loading: s.loading, error: s.error, data: s.data }),
      listener,
    );
    try {
      const result = useStore().load(1);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toEqual({
        loading: true,
        error: null,
        data: null,
      });
      pending.resolve(user);
      await expect(result).resolves.toEqual({ status: 'success', data: user });
      // The post-await set batches data/loading/error into one notification.
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[1][0]).toEqual({
        loading: false,
        error: null,
        data: user,
      });
    } finally {
      unsubscribe();
    }
  });

  it('exposes failure, clears the error on retry, recovers and can request again', async () => {
    const first = deferred<User>();
    const retry = deferred<User>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(retry.promise)
      .mockResolvedValueOnce(newerUser);
    const useStore = createUserStore(loader);
    const failed = useStore().load(2);
    first.reject(new Error('offline'));
    await expect(failed).resolves.toEqual({
      status: 'error',
      error: 'offline',
    });
    expect(useStore()).toMatchObject({
      loading: false,
      error: 'offline',
      data: null,
    });
    const recovered = useStore().retry();
    expect(loader.mock.calls[1][0]).toBe(2);
    expect(useStore()).toMatchObject({ loading: true, error: null });
    retry.resolve(newerUser);
    await expect(recovered).resolves.toEqual({
      status: 'success',
      data: newerUser,
    });
    expect(useStore()).toMatchObject({
      loading: false,
      error: null,
      data: newerUser,
    });
    await expect(useStore().load(2)).resolves.toEqual({
      status: 'success',
      data: newerUser,
    });
    expect(useStore().loading).toBe(false);
  });

  it('preserves previous success data during refresh and failure', async () => {
    const pending = deferred<User>();
    const loader = vi
      .fn()
      .mockResolvedValueOnce(user)
      .mockReturnValueOnce(pending.promise);
    const useStore = createUserStore(loader);
    await useStore().load(1);
    const result = useStore().load(2);
    expect(useStore()).toMatchObject({
      data: user,
      requestedId: 2,
      loading: true,
    });
    pending.reject('refresh failed');
    await expect(result).resolves.toEqual({
      status: 'error',
      error: 'refresh failed',
    });
    expect(useStore()).toMatchObject({
      data: user,
      loading: false,
      error: 'refresh failed',
    });
  });

  it('handles synchronous loader failures without leaving loading set', async () => {
    const useStore = createUserStore(() => {
      throw new Error('invalid request');
    });
    await expect(useStore().load(1)).resolves.toEqual({
      status: 'error',
      error: 'invalid request',
    });
    expect(useStore().loading).toBe(false);
  });

  it.each(['success', 'failure'] as const)(
    'ignores old %s after newer success even if abort is ignored',
    async (outcome) => {
      const old = deferred<User>();
      const latest = deferred<User>();
      const loader = vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise);
      const useStore = createUserStore(loader);
      const oldResult = useStore().load(1);
      const latestResult = useStore().load(2);
      expect(loader.mock.calls[0][1].aborted).toBe(true);
      latest.resolve(newerUser);
      await latestResult;
      if (outcome === 'success') old.resolve(user);
      else old.reject(new Error('old failure'));
      await expect(oldResult).resolves.toEqual({ status: 'ignored' });
      expect(useStore()).toMatchObject({
        data: newerUser,
        requestedId: 2,
        loading: false,
        error: null,
      });
    },
  );

  it.each(['success', 'failure'] as const)(
    'old %s cannot clear loading while the newest request is pending',
    async (outcome) => {
      const old = deferred<User>();
      const latest = deferred<User>();
      const loader = vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(latest.promise);
      const useStore = createUserStore(loader);
      const oldResult = useStore().load(1);
      const latestResult = useStore().load(2);
      if (outcome === 'success') old.resolve(user);
      else old.reject(new Error('old failure'));
      await expect(oldResult).resolves.toEqual({ status: 'ignored' });
      expect(useStore()).toMatchObject({
        data: null,
        loading: true,
        error: null,
      });
      latest.reject(new Error('latest failure'));
      await latestResult;
      expect(useStore()).toMatchObject({
        data: null,
        loading: false,
        error: 'latest failure',
      });
    },
  );

  it('old success cannot erase the latest error', async () => {
    const old = deferred<User>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockRejectedValueOnce(new Error('latest failure'));
    const useStore = createUserStore(loader);
    const oldResult = useStore().load(1);
    await useStore().load(2);
    old.resolve(user);
    await expect(oldResult).resolves.toEqual({ status: 'ignored' });
    expect(useStore()).toMatchObject({
      data: null,
      loading: false,
      error: 'latest failure',
    });
  });

  it.each(['success', 'failure'] as const)(
    'cancel invalidates late %s and permits later requests',
    async (outcome) => {
      const pending = deferred<User>();
      const loader = vi
        .fn()
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce(newerUser);
      const useStore = createUserStore(loader);
      const result = useStore().load(1);
      useStore().cancel();
      expect(loader.mock.calls[0][1].aborted).toBe(true);
      expect(useStore()).toMatchObject({
        loading: false,
        error: null,
        data: null,
      });
      if (outcome === 'success') pending.resolve(user);
      else pending.reject(new Error('late failure'));
      await expect(result).resolves.toEqual({ status: 'ignored' });
      expect(useStore()).toMatchObject({
        loading: false,
        error: null,
        data: null,
      });
      await expect(useStore().load(2)).resolves.toEqual({
        status: 'success',
        data: newerUser,
      });
    },
  );

  it('the deterministic demo fails then recovers, and cancels its timer on cleanup', async () => {
    vi.useFakeTimers();
    const useStore = createUserStore(createDemoUserLoader());
    const failed = useStore().load(1);
    await vi.advanceTimersByTimeAsync(900);
    await expect(failed).resolves.toMatchObject({ status: 'error' });
    const retry = useStore().retry();
    await vi.advanceTimersByTimeAsync(900);
    await expect(retry).resolves.toEqual({
      status: 'success',
      data: { id: 1, name: '用户 1（第 2 次请求）' },
    });
    const cancelled = useStore().load(2);
    expect(vi.getTimerCount()).toBe(1);
    useStore().cancel();
    await expect(cancelled).resolves.toEqual({ status: 'ignored' });
    expect(vi.getTimerCount()).toBe(0);
    expect(useStore()).toMatchObject({
      loading: false,
      error: null,
      data: { id: 1 },
    });
  });
});

import { createStore } from '@piant/store';

export interface User {
  id: number;
  name: string;
}

export type LoadUser = (id: number, signal: AbortSignal) => Promise<User>;

// 调用方可以处理失败；被替代或取消的请求不会触发成功/失败副作用。
export type LoadResult =
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }
  | { status: 'ignored' };

interface UserState {
  data: User | null;
  loading: boolean;
  error: string | null;
  requestedId: number;
  load: (id: number) => Promise<LoadResult>;
  retry: () => Promise<LoadResult>;
  cancel: () => void;
}

// 应用层示例工厂，不是 @piant/store 的新增 API。
export function createUserStore(loadUser: LoadUser) {
  return createStore<UserState>((set, get) => {
    let latestRequest = 0;
    let controller: AbortController | undefined;

    return {
      data: null,
      loading: false,
      error: null,
      requestedId: 1,
      load: async (id) => {
        const request = ++latestRequest;
        controller?.abort();
        const current = new AbortController();
        controller = current;
        set({ requestedId: id, loading: true, error: null });

        try {
          const data = await loadUser(id, current.signal);
          // 即使 loader 不支持取消，也只接纳最新请求。
          if (request !== latestRequest) return { status: 'ignored' };
          set({ data, loading: false, error: null });
          return { status: 'success', data };
        } catch (cause) {
          if (request !== latestRequest) return { status: 'ignored' };
          const error = cause instanceof Error ? cause.message : String(cause);
          // 保留上次成功数据，失败信息同时通过状态和返回值交给调用方。
          set({ loading: false, error });
          return { status: 'error', error };
        } finally {
          if (request === latestRequest) controller = undefined;
        }
      },
      retry: () => get().load(get().requestedId),
      cancel: () => {
        ++latestRequest;
        controller?.abort();
        controller = undefined;
        set({ loading: false, error: null });
      },
    };
  });
}

// 确定性模拟：每位用户第一次请求失败，之后成功；无真实网络依赖。
export function createDemoUserLoader(): LoadUser {
  const attempts = new Map<number, number>();
  return (id, signal) => {
    const attempt = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, attempt);
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new Error('请求已取消'));
      };
      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', abort);
          if (attempt === 1) reject(new Error(`用户 ${id} 加载失败，请重试`));
          else resolve({ id, name: `用户 ${id}（第 ${attempt} 次请求）` });
        },
        id === 1 ? 900 : 300,
      );
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  };
}

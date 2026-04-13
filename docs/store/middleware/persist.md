# persist

`persist` middleware 会在每次状态更新时自动将 store 数据序列化并写入本地存储（默认为 `localStorage`），并在下次 store 创建时自动恢复上次保存的状态。

## 基本用法

```ts
import { createStore, persist } from '@piant/store';

interface CounterState {
  count: number;
  increment: () => void;
}

const useCounterStore = createStore<CounterState>(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }),
    { name: 'counter' }, // localStorage key
  ),
);
```

刷新页面后，`count` 会自动恢复为上次保存的值。

## 签名

```ts
function persist<T extends object>(
  creator: StateCreator<T>,
  options: PersistOptions<T>,
): StateCreator<T>
```

### `PersistOptions<T>`

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | `string` | **必填** | 在 storage 中使用的键名 |
| `storage` | `StorageAdapter` | `localStorage` | 自定义存储后端，需实现 `getItem / setItem / removeItem` |
| `partialize` | `(state: T) => Partial<T>` | 整个 state | 选择需要持久化的字段子集 |
| `serialize` | `(state: Partial<T>) => string` | `JSON.stringify` | 自定义序列化函数 |
| `deserialize` | `(raw: string) => Partial<T>` | `JSON.parse` | 自定义反序列化函数 |
| `onRehydrateStorage` | `(state: T) => void` | — | 恢复数据后的回调 |
| `skipHydration` | `boolean` | `false` | 设为 `true` 跳过初始化时的数据恢复 |

## 只持久化部分字段

动作（函数类型字段）通常无需序列化，使用 `partialize` 只保存数据字段：

```ts
import { createStore, persist } from '@piant/store';

interface AuthState {
  token: string;
  tempData: Record<string, unknown>;
  setToken: (token: string) => void;
}

const useAuthStore = createStore<AuthState>(
  persist(
    (set) => ({
      token: '',
      tempData: {},
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth',
      partialize: (s) => ({ token: s.token }), // 只持久化 token
    },
  ),
);
```

## 自定义存储后端

`persist` 可以使用任何实现了 `StorageAdapter` 接口的对象作为存储后端：

```ts
// 使用 sessionStorage（页面关闭后清除）
const useStore = createStore(
  persist(
    (set) => ({ count: 0 }),
    { name: 'session-counter', storage: sessionStorage },
  ),
);

// 自定义内存存储（用于测试 / SSR）
const memoryStorage = new Map<string, string>();
const useStore = createStore(
  persist(
    (set) => ({ value: 0 }),
    {
      name: 'mem',
      storage: {
        getItem: (key) => memoryStorage.get(key) ?? null,
        setItem: (key, val) => memoryStorage.set(key, val),
        removeItem: (key) => memoryStorage.delete(key),
      },
    },
  ),
);
```

## 恢复数据后回调

通过 `onRehydrateStorage` 可在数据恢复完成后执行额外逻辑：

```ts
const useStore = createStore(
  persist(
    (set) => ({ count: 0 }),
    {
      name: 'counter',
      onRehydrateStorage: (state) => {
        console.log('hydrated:', state.count);
      },
    },
  ),
);
```

## 与 todos 示例集成

以下是 Piant todo 示例的完整 store 写法，使用 `persist` 将待办列表持久化到 `localStorage`：

```ts
import { createStore, persist } from '@piant/store';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  _nextId: number;
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string, completed: boolean) => void;
}

export const useTodoStore = createStore<TodoState>(
  persist(
    (set) => ({
      todos: [
        { id: '1', text: 'Learn Piant', completed: true },
        { id: '2', text: 'Build a Todo App', completed: false },
      ],
      _nextId: 3,
      addTodo: (text) =>
        set((s) => ({
          _nextId: s._nextId + 1,
          todos: [...s.todos, { id: String(s._nextId), text, completed: false }],
        })),
      deleteTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      toggleTodo: (id, completed) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
        })),
    }),
    {
      name: 'piant-todos',
      // 只序列化数据字段，动作函数在创建时重建
      partialize: (s) => ({ todos: s.todos, _nextId: s._nextId }),
    },
  ),
);
```

刷新页面后，todos 列表会自动从 `localStorage` 中恢复，不会丢失用户的待办数据。

## 与 `combine` 组合

`persist` 和 `combine` 可以组合使用，先用 `combine` 分离数据与动作，再用 `persist` 包裹整体：

```ts
import { createStore, combine, persist } from '@piant/store';

const useStore = createStore(
  persist(
    combine(
      { count: 0 },
      (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        reset: () => set({ count: 0 }),
      }),
    ),
    {
      name: 'counter',
      partialize: (s) => ({ count: s.count }),
    },
  ),
);
```

> **提示**：`combine` 放在内层（先执行），`persist` 放在外层（后执行并拦截 `setState`），顺序不能颠倒。

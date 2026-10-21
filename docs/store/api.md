# API 参考

## `createStore`

```ts
function createStore<T extends object>(creator: StateCreator<T>): UseStore<T>;
```

创建一个 MobX-backed store，返回一个 **store hook**。

### 参数

| 参数      | 类型              | 说明                                              |
| --------- | ----------------- | ------------------------------------------------- |
| `creator` | `StateCreator<T>` | 初始化函数，接收 `set` 和 `get`，返回初始状态对象 |

### 返回值

`UseStore<T>` — 一个可调用的函数，同时挂载了 `getState`、`setState`、`subscribe` 静态方法：

```ts
const useStore = createStore(...);

// 1. 调用 hook → 返回响应式 state 对象
const state = useStore();

// 2. 静态方法
useStore.getState()          // 返回当前 state
useStore.setState(partial)   // 更新 state
useStore.subscribe(listener) // 订阅状态变更，返回 unsub 函数
```

### 示例

```ts
interface BearState {
  bears: number;
  increase: () => void;
}

const useBearStore = createStore<BearState>((set) => ({
  bears: 0,
  increase: () => set((s) => ({ bears: s.bears + 1 })),
}));
```

---

## `StateCreator<T>`

```ts
type StateCreator<T extends object> = (
  set: SetState<T>,
  get: GetState<T>,
  api: StoreApi<T>,
) => T;
```

传给 `createStore` 的初始化函数类型。Middleware 可以在 creator 返回前替换 `api.setState`，从而拦截所有状态更新。

---

## `SetState<T>`

```ts
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
```

更新 store 状态的函数。支持两种调用形式：

**对象形式（浅合并）**

```ts
set({ count: 1 });
```

**更新函数形式（基于当前状态计算）**

```ts
set((s) => ({ count: s.count + 1 }));
```

> `set` 内部使用 `Object.assign` 进行浅合并。对于嵌套对象，需手动展开旧值。

`set` 在 MobX `runInAction` 中提交状态；异步 action 在 `await` 后也应通过 `set` 更新 observable 状态。`createStore` 不自动管理 loading、错误、重试或请求顺序，完整用法见[异步 action 与错误恢复](./async-actions)。该指南中的工厂和结果类型属于应用层示例，不是包导出。

---

## `GetState<T>`

```ts
type GetState<T> = () => T;
```

返回当前 store 状态的函数。通常在 action 内部用于读取最新状态：

```ts
const useStore = createStore((set, get) => ({
  count: 0,
  doubled: () => get().count * 2,
}));
```

---

## `UseStore<T>`

```ts
type UseStore<T extends object> = (() => T) & StoreApi<T>;
```

`createStore` 的返回类型。

---

## `StoreApi<T>`

```ts
interface StoreApi<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: Subscribe<T>;
}
```

### `getState()`

返回当前 store 状态（MobX observable 对象）。

```ts
const current = useStore.getState();
```

### `setState(partial)`

在组件外更新 store 状态，使用方式与 `set` 相同。

```ts
useStore.setState({ count: 99 });
useStore.setState((s) => ({ count: s.count + 1 }));
```

### `subscribe(listener)` / `subscribe(selector, listener, options?)`

两种调用形式：

**全状态订阅**（对 store 任意属性变化均触发）：

```ts
const unsub = useStore.subscribe((state, prevState) => {
  console.log('changed:', prevState, '→', state);
});
```

**选择器订阅**（只跟踪 selector 返回的切片，避免整棵状态树的深度克隆开销）：

```ts
// 只在 count 变化时触发
const unsub = useStore.subscribe(
  (s) => s.count,
  (count, prevCount) => console.log(count, prevCount),
);

// 自定义相等性判断
const unsub2 = useStore.subscribe(
  (s) => s.value,
  (v, prev) => console.log(v, prev),
  { equals: (a, b) => Math.abs(a - b) < 10 },
);
```

> 两种形式均基于 MobX `reaction` + `comparer.structural` 实现：仅当状态**结构性变化**时才触发 listener。

```ts
// 取消订阅
unsub();
```

---

## `Subscribe<T>`

```ts
interface Subscribe<T> {
  // 全状态订阅
  (listener: (state: T, prevState: T) => void): () => void;
  // 选择器订阅（只跟踪选中切片）
  <U>(
    selector: (state: T) => U,
    listener: (selectedState: U, prevSelectedState: U) => void,
    options?: { equals?: (a: U, b: U) => boolean },
  ): () => void;
}
```

---

## `createStoreHistory`

```ts
function createStoreHistory<T extends object>(
  store: StoreApi<T>,
  options?: StoreHistoryOptions,
): StoreHistory | null;
```

显式创建 Store 数据历史记录器。`options.enabled` 必须为 `true`；否则返回 `null`，不读取或订阅 Store。仅创建业务 Store 不会自动记录。

| 选项         | 默认值    | 说明                          |
| ------------ | --------- | ----------------------------- |
| `enabled`    | 未启用    | 显式设为 `true` 才开始记录。  |
| `name`       | `'Store'` | 在调试面板显示的来源名称。    |
| `maxEntries` | `100`     | 保存记录上限，限制在 2–1000。 |

### `StoreHistory`

| 成员                  | 行为                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `name`                | 记录器名称。                                                            |
| `snapshot()`          | 返回冻结的数据快照 `{ entries, currentId, disposed }`，不暴露业务对象。 |
| `subscribe(listener)` | 历史变化时通知，返回取消订阅函数。                                      |
| `restore(id)`         | 恢复可恢复记录并返回 `true`；记录无效、不可恢复或已销毁时返回 `false`。 |
| `clear()`             | 清除旧历史，以当前实际状态创建新初始记录；ID 不复用。                   |
| `dispose()`           | 幂等停止记录、恢复和通知，释放订阅。                                    |

每条 `StoreHistoryEntry` 包含 `id`、`timestamp`（`Date.now()` 毫秒）、`state`、`restorable` 及可选 `reason`。记录数据排除顶层 action，恢复保留 action 与 observable 根身份。无法无损恢复的值只展示原因，不允许恢复。

Restore 本身不追加历史；恢复后新的业务变化会丢弃恢复点之后的记录并建立分支。与 `persist` 组合时，恢复沿用更新管道并写入存储，仍遵循 `partialize` / `serialize`。它不撤销请求或外部副作用。

完整接入与生命周期见 [Store 历史与恢复](/devtools/store-history)。面板是单独安装的 `@piant/devtools`，不会自动发现记录器；收起或卸载面板不代替记录器的 `dispose()`。

---

## 类型导出一览

```ts
import type {
  GetState,
  SetState,
  StateCreator,
  StoreApi,
  StoreHistory,
  StoreHistoryEntry,
  StoreHistoryOptions,
  StoreHistorySnapshot,
  StoreSnapshotValue,
  Subscribe,
  UseStore,
} from '@piant/store';
```

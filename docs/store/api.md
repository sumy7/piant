# API 参考

## `createStore`

```ts
function createStore<T extends object>(creator: StateCreator<T>): UseStore<T>
```

创建一个 MobX-backed store，返回一个 **store hook**。

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
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
type StateCreator<T extends object> = (set: SetState<T>, get: GetState<T>) => T;
```

传给 `createStore` 的初始化函数类型。

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

### `subscribe(listener)`

订阅 store 状态变化。当任意可观察属性发生变化时，listener 被调用，参数为新旧状态快照。

```ts
const unsub = useStore.subscribe((state, prevState) => {
  console.log('changed:', prevState, '→', state);
});

// 取消订阅
unsub();
```

> 基于 MobX `reaction` + `comparer.structural` 实现：仅当状态**结构性变化**时才触发 listener，相同值重复 set 不会触发。

---

## `Subscribe<T>`

```ts
type Subscribe<T> = (listener: (state: T, prevState: T) => void) => () => void;
```

---

## 类型导出一览

```ts
import type {
  GetState,
  SetState,
  StateCreator,
  StoreApi,
  Subscribe,
  UseStore,
} from '@piant/store';
```

# combine

`combine` 是一个轻量级 middleware，用于将**初始状态数据对象**与**动作创建器函数**合并为一个统一的 `StateCreator`。

它让你能够把数据（plain data）和业务逻辑（actions）在代码组织上分离，同时在 store 中无缝地合并为同一个对象。

## 基本用法

```ts
import { createStore, combine } from '@piant/store';

const useStore = createStore(
  combine(
    // 第一个参数：初始状态数据
    { count: 0, text: 'hello' },
    // 第二个参数：动作创建器（接收 set / get / api）
    (set, get) => ({
      increment: () => set((s) => ({ count: s.count + 1 })),
      decrement: () => set((s) => ({ count: s.count - 1 })),
      getText: () => get().text,
    }),
  ),
);
```

使用方式与普通 store 完全一致：

```tsx
const store = useStore();
store.count;       // 0
store.increment(); // count → 1
store.getText();   // 'hello'
```

## 签名

```ts
function combine<T extends object, A extends object>(
  initialState: T,
  actionsCreator: (set: SetState<T & A>, get: GetState<T & A>, api: StoreApi<T & A>) => A,
): StateCreator<T & A>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `initialState` | `T` | 纯数据对象，作为 store 的初始数据字段 |
| `actionsCreator` | `(set, get, api) => A` | 返回动作方法集合的函数；`set`/`get`/`api` 类型为 `T & A` |

返回值是一个 `StateCreator<T & A>`，可直接传给 `createStore` 或与其他 middleware 组合。

## 与 `persist` 组合

`combine` 可以与 `persist` 嵌套使用，先用 `combine` 分离数据和动作，再用 `persist` 持久化到本地存储：

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
      // 只持久化数据字段，动作函数无需序列化
      partialize: (s) => ({ count: s.count }),
    },
  ),
);
```

## 为什么使用 `combine`？

不使用 `combine`，数据和动作混在一起：

```ts
const useStore = createStore((set) => ({
  count: 0,
  text: 'hello',
  increment: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set({ count: 0 }),
}));
```

使用 `combine` 后，代码结构更清晰，尤其当 store 字段较多时可读性明显提升：

```ts
const useStore = createStore(
  combine(
    { count: 0, text: 'hello' },         // ← 数据一目了然
    (set) => ({                           // ← 动作独立管理
      increment: () => set((s) => ({ count: s.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
  ),
);
```

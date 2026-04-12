# 快速开始

本节通过一个计数器示例带你快速上手 `@piant/store`。

## 1. 创建 Store

使用 `createStore` 定义状态与动作：

```ts
// counterStore.ts
import { createStore } from '@piant/store';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

`createStore` 接收一个 **initializer 函数**，该函数接收两个参数：

- `set(partial | updater)` — 更新 store 状态
- `get()` — 读取当前 store 状态（供 action 内部使用）

返回值即为 store 的初始状态（数据 + 动作方法）。

## 2. 在组件中使用

调用 store hook 获取响应式状态对象，在 JSX 中直接访问属性即可获得自动更新：

```tsx
// Counter.tsx
import { StyleSheet, Text, View } from '@piant/core';
import { useCounterStore } from './counterStore';

export function Counter() {
  const styles = StyleSheet.create({
    container: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    btn: {
      width: 40, height: 40,
      backgroundColor: '#171717',
      justifyContent: 'center', alignItems: 'center',
      borderRadius: 8,
    },
    btnText: { color: '#fff' },
    count: { width: 40, textAlign: 'center' },
  });

  const store = useCounterStore();

  return (
    <View style={styles.container}>
      <View style={styles.btn} onClick={store.decrement}>
        <Text style={styles.btnText}>-</Text>
      </View>
      <View style={styles.count}>
        <Text>{store.count}</Text>
      </View>
      <View style={styles.btn} onClick={store.increment}>
        <Text style={styles.btnText}>+</Text>
      </View>
    </View>
  );
}
```

由于 `useCounterStore()` 返回的是 MobX observable 对象，`store.count` 在响应式上下文（Piant 组件渲染）中会被自动追踪。每次调用 `store.increment()` 时，依赖 `store.count` 的视图会自动更新。

## 3. 在多个组件中共享状态

Store 是**模块级单例**，多个组件可直接导入同一个 store hook：

```tsx
// StatusBar.tsx
import { Text } from '@piant/core';
import { useCounterStore } from './counterStore';

export function StatusBar() {
  const store = useCounterStore();
  return <Text>当前计数：{store.count}</Text>;
}
```

`StatusBar` 和 `Counter` 中的 `store.count` 引用同一个 observable，任何一侧的更新都会同步到另一侧。

## 4. 在组件外部使用

通过 store 的静态方法，可以在任何地方读写状态，无需组件上下文：

```ts
import { useCounterStore } from './counterStore';

// 读取
const current = useCounterStore.getState().count;

// 写入
useCounterStore.setState({ count: 10 });

// 订阅
const unsub = useCounterStore.subscribe((state, prevState) => {
  console.log('count changed:', prevState.count, '→', state.count);
});

// 取消订阅
unsub();
```

## 下一步

- [API 参考](./api) — 完整 API 文档

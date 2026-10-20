# @piant/store

基于 MobX 的轻量状态管理，提供 Zustand 风格的 `createStore` API，可在 Piant 组件间共享响应式状态，也可独立读写和订阅状态。

## 安装

```bash
pnpm add @piant/store "mobx@^6.16.1"
```

Peer 依赖为 `mobx ^6.16.1`。在 Piant 组件中使用时，还需安装并配置 `@piant/core`。

## 使用

```ts
import { createStore } from '@piant/store';

interface CounterState {
  count: number;
  increment: () => void;
}

export const useCounterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

const unsubscribe = useCounterStore.subscribe(
  (state) => state.count,
  (count) => console.log('count:', count),
);

useCounterStore.getState().increment();
useCounterStore.setState({ count: 10 });
unsubscribe();
```

在已配置 Piant JSX 的组件中读取同一份状态：

```tsx
import { Text, View } from '@piant/core';
import { useCounterStore } from './counterStore';

export function Counter() {
  const store = useCounterStore();
  return (
    <View onClick={store.increment}>
      <Text>{store.count}</Text>
    </View>
  );
}
```

将第一个示例保存为 `counterStore.ts`。`useCounterStore()` 返回共享的 MobX observable，直接读取属性即可被 Piant 的响应式渲染追踪。包还导出 `persist` 和 `combine` 中间件，详见 [API 参考](https://piant.sumygg.com/store/api)。

## 更多信息

- [文档](https://piant.sumygg.com/store/introduction)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

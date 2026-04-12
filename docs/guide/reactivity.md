# 响应式系统

Piant 的响应式系统基于 [MobX](https://mobx.js.org/)，提供了类似 SolidJS 的细粒度响应式 API。当状态发生变化时，只有依赖该状态的计算和副作用会重新执行，而不是整个组件重新渲染。

## createState

`createState` 创建一个响应式状态，返回 `[getter, setter]` 元组。

```tsx
import { createState } from '@piant/core';

const [count, setCount] = createState(0);

// 读取值（需要调用 getter 函数）
console.log(count()); // 0

// 设置新值
setCount(1);

// 使用更新函数（基于上一个值）
setCount((prev) => prev + 1);
```

### 类型签名

```ts
function createState<T>(initialValue: T): readonly [Getter<T>, Setter<T>];
function createState<T = undefined>(): readonly [
  Getter<T | undefined>,
  Setter<T | undefined>,
];
```

## createEffect

`createEffect` 创建一个副作用，当其依赖的响应式状态变化时自动重新执行。

```tsx
import { createEffect, createState } from '@piant/core';

const [name, setName] = createState('Piant');

createEffect(() => {
  console.log('name changed to:', name());
});

setName('New Name'); // 触发 effect，输出 "name changed to: New Name"
```

Effect 在组件销毁时自动清理（通过 owner 机制）。

## createMemo

`createMemo` 创建一个派生的计算值，只有当依赖变化时才重新计算，结果会被缓存。

```tsx
import { createMemo, createState } from '@piant/core';

const [firstName, setFirstName] = createState('张');
const [lastName, setLastName] = createState('三');

const fullName = createMemo(() => `${firstName()}${lastName()}`);

console.log(fullName()); // "张三"
setFirstName('李');
console.log(fullName()); // "李三"（重新计算）
```

### 自定义相等比较

```ts
const value = createMemo(() => expensiveCalculation(), undefined, {
  equals: (prev, next) => prev.id === next.id,
});
```

## createContext / useContext

`createContext` 和 `useContext` 用于跨组件树传递数据，无需逐层传递 props。

```tsx
import { createContext, useContext } from '@piant/core';

// 创建 context（可提供默认值）
const ThemeContext = createContext<'light' | 'dark'>('light');

// 提供者
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Child />
    </ThemeContext.Provider>
  );
}

// 消费者
function Child() {
  const theme = useContext(ThemeContext);
  return <Text>{theme}</Text>;
}
```

## createSelector

`createSelector` 用于高效地判断某个键是否被选中，适合列表中的选中状态管理。

```tsx
import { createSelector, createState } from '@piant/core';

const [selectedId, setSelectedId] = createState<string | null>(null);

// 创建选择器
const isSelected = createSelector(selectedId);

// 在列表项中使用（只有选中状态变化的项才会更新）
function ListItem({ id }: { id: string }) {
  return (
    <View
      style={{ backgroundColor: isSelected(id) ? '#e0e0ff' : 'transparent' }}
      onClick={() => setSelectedId(id)}
    >
      <Text>{id}</Text>
    </View>
  );
}
```

## onMount

`onMount` 在组件挂载（首次渲染完成）后执行一次，常用于初始化操作。

```tsx
import { onMount } from '@piant/core';

function MyComponent() {
  onMount(() => {
    console.log('组件已挂载');
    // 执行初始化逻辑
  });

  return <View />;
}
```

## onCleanup

`onCleanup` 注册一个清理函数，在 effect 重新执行或组件卸载时调用。

```tsx
import { createEffect, onCleanup } from '@piant/core';

createEffect(() => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);

  onCleanup(() => clearInterval(timer));
});
```

## onError

`onError` 注册一个错误处理函数，捕获当前 owner 范围内抛出的错误。

```tsx
import { onError } from '@piant/core';

function MyComponent() {
  onError((err) => {
    console.error('捕获到错误:', err);
  });

  return <View />;
}
```

## 响应式原语类型

```ts
type Getter<T> = () => T;

type Setter<T> = {
  (value: T): T;
  (update: (prev: T) => T): T;
};
```

## 注意事项

- **必须调用 getter**：`count()` 而不是 `count`，否则不会被追踪为依赖
- **批量更新**：MobX 会自动批量更新，无需手动调用类似 `batch()` 的方法
- **不追踪读取**：如果需要在 effect 中读取值但不追踪依赖，使用 MobX 的 `untracked(() => value())`（`import { untracked } from 'mobx'`）

# For 与 Index

Piant 提供了两个列表渲染组件：`For` 和 `Index`，适用于不同的使用场景。

## For

`For` 用于渲染以**数组项**为中心的列表，每个数组项对应一个组件实例。当数组项本身变化时（引用变化），对应的组件会重新创建。

### 基本用法

```tsx
import { For, View, TextView, createState } from '@piant/core';

function TodoList() {
  const [items, setItems] = createState(['苹果', '香蕉', '橙子']);

  return (
    <View style={{ flexDirection: 'column', gap: 8 }}>
      <For each={items()}>
        {(item, index) => (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextView>{index() + 1}.</TextView>
            <TextView>{item}</TextView>
          </View>
        )}
      </For>
    </View>
  );
}
```

### fallback

当 `each` 数组为空时，渲染 `fallback`：

```tsx
<For each={items()} fallback={<TextView>暂无数据</TextView>}>
  {(item) => <ItemComponent item={item} />}
</For>
```

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `each` | `T[]` | 要渲染的数组 |
| `children` | `(item: T, index: Getter<number>) => JSX.Element` | 渲染函数，第二个参数 `index` 是响应式的 getter |
| `fallback` | `JSX.Element` | 数组为空时的内容（可选） |

> **注意**：`index` 是一个 getter 函数，需要调用 `index()` 获取当前索引值。

---

## Index

`Index` 与 `For` 类似，但以**索引**为中心。每个索引位置对应一个组件实例，当该位置的值变化时，组件会通过响应式更新而不是重新创建。

适合数组长度固定、但内容频繁变化的场景。

### 基本用法

```tsx
import { Index, View, TextView } from '@piant/core';

<Index each={items()}>
  {(item, index) => (
    <View>
      <TextView>{index}: {item()}</TextView>
    </View>
  )}
</Index>
```

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `each` | `T[]` | 要渲染的数组 |
| `children` | `(item: Getter<T>, index: number) => JSX.Element` | 渲染函数，`item` 是响应式 getter，`index` 是普通数字 |
| `fallback` | `JSX.Element` | 数组为空时的内容（可选） |

## For vs Index 对比

| | `For` | `Index` |
|-|-------|---------|
| 中心 | 数组项（item） | 索引位置（index） |
| `item` 参数 | 直接值 `T` | 响应式 getter `Getter<T>` |
| `index` 参数 | 响应式 getter `Getter<number>` | 普通数字 `number` |
| 适合场景 | 数组项频繁增删的列表 | 固定长度但内容频繁变化的列表 |

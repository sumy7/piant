# Switch 与 Match

`Switch` 和 `Match` 组合用于多条件分支渲染，类似于 JavaScript 的 `switch/case` 语句。

## 基本用法

```tsx
import { Switch, Match, Text, createState } from '@piant/core';

function StatusDisplay() {
  const [status, setStatus] = createState<'loading' | 'success' | 'error'>('loading');

  return (
    <Switch fallback={<Text>未知状态</Text>}>
      <Match when={status() === 'loading'}>
        <Text>加载中...</Text>
      </Match>
      <Match when={status() === 'success'}>
        <Text>加载成功！</Text>
      </Match>
      <Match when={status() === 'error'}>
        <Text>加载失败</Text>
      </Match>
    </Switch>
  );
}
```

## Switch Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `fallback` | `JSX.Element` | 所有 Match 都不匹配时渲染的内容 |
| `children` | `JSX.Element` | 应为一组 `Match` 组件 |

## Match Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `when` | `T \| false \| null` | 条件值，为真值时匹配 |
| `keyed` | `boolean` | 是否以 `when` 的引用作为 key（默认 `false`） |
| `children` | `JSX.Element \| ((value: T \| (() => T)) => JSX.Element)` | 匹配时渲染的内容 |

## 访问匹配值

当 `children` 是函数时，可以访问 `when` 的值：

```tsx
const [user, setUser] = createState<User | null>(null);

<Switch>
  <Match when={user()}>
    {(u) => <Text>欢迎，{u().name}</Text>}
  </Match>
</Switch>
```

## keyed 模式

设置 `keyed={true}` 时，每次 `when` 的引用变化都会重新创建子组件（而不只是更新），适合对象引用变化的场景：

```tsx
<Switch>
  <Match when={selectedItem()} keyed>
    {(item) => <ItemDetail item={item} />}
  </Match>
</Switch>
```

## 与 Show 的区别

- `Show` 适合简单的二元条件（`if/else`）
- `Switch/Match` 适合多个互斥条件（`switch/case`），只有第一个匹配的 `Match` 会被渲染

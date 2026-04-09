# Show

`Show` 组件用于条件渲染，相当于 `if/else` 语句。

## 基本用法

```tsx
import { Show, View, TextView, createState } from '@piant/core';

function Toggle() {
  const [visible, setVisible] = createState(true);

  return (
    <View>
      <Show when={visible()}>
        <TextView>内容可见</TextView>
      </Show>
    </View>
  );
}
```

## fallback

当 `when` 为假值时，渲染 `fallback`：

```tsx
<Show
  when={isLoggedIn()}
  fallback={<LoginButton />}
>
  <UserDashboard />
</Show>
```

## 访问条件值

当 `children` 是一个接受参数的函数时，可以访问条件值（narrowed 类型）：

```tsx
const [user, setUser] = createState<User | null>(null);

<Show when={user()} fallback={<TextView>未登录</TextView>}>
  {(u) => <TextView>欢迎，{u().name}</TextView>}
</Show>
```

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `when` | `T` | 条件值，为真时渲染 children |
| `children` | `JSX.Element \| ((item: () => T) => JSX.Element)` | 条件为真时显示的内容 |
| `fallback` | `JSX.Element` | 条件为假时显示的内容（可选） |

## 注意事项

- `when` 为 `null`、`undefined`、`false`、`0`、`''` 时视为假值
- 与 React 不同，不建议直接用 `{condition && <Component />}` 模式，应使用 `Show` 组件以确保正确的挂载/卸载语义

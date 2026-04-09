# Dynamic

`Dynamic` 组件允许动态地渲染不同的组件类型，适合根据数据决定渲染哪个组件的场景。

## 基本用法

```tsx
import { Dynamic, createState } from '@piant/core';
import { ViewA, ViewB, ViewC } from './components';

function DynamicExample() {
  const [type, setType] = createState<'a' | 'b' | 'c'>('a');

  const componentMap = {
    a: ViewA,
    b: ViewB,
    c: ViewC,
  };

  return (
    <Dynamic
      component={componentMap[type()]}
      props={{ /* 传给目标组件的 props */ }}
    />
  );
}
```

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `component` | `JSX.Element` | 要渲染的组件（函数组件或元素） |
| `props` | `any` | 传递给目标组件的 props |

## 响应式切换组件

`Dynamic` 内部使用 `memo` 追踪 `component` 的变化，当 `component` 改变时会切换渲染的组件：

```tsx
const [isAdmin, setIsAdmin] = createState(false);

<Dynamic
  component={isAdmin() ? AdminPanel : UserPanel}
  props={{ userId: currentUserId() }}
/>
```

## 注意事项

- `component` 支持函数组件，传入后会以 `props` 为参数调用
- 当 `component` 不是函数时，`Dynamic` 会直接渲染该元素（忽略 `props`）

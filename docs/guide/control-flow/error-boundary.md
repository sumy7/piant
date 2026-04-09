# ErrorBoundary

`ErrorBoundary` 用于捕获子组件树中抛出的错误，防止错误导致整个应用崩溃，并显示降级 UI。

## 基本用法

```tsx
import { ErrorBoundary, TextView } from '@piant/core';

function App() {
  return (
    <ErrorBoundary
      fallback={<TextView>发生了错误，请刷新重试</TextView>}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

## 带重置功能

`fallback` 可以是一个接受错误和重置函数的回调：

```tsx
<ErrorBoundary
  fallback={(err, reset) => (
    <View>
      <TextView>错误：{err.message}</TextView>
      <View onClick={reset} style={{ backgroundColor: '#0066cc', padding: 8, borderRadius: 4 }}>
        <TextView style={{ color: 'white' }}>重试</TextView>
      </View>
    </View>
  )}
>
  <RiskyComponent />
</ErrorBoundary>
```

调用 `reset()` 会清除错误状态，重新渲染子组件。

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `fallback` | `JSX.Element \| ((err: Error, reset: () => void) => JSX.Element)` | 错误时显示的降级 UI |
| `children` | `JSX.Element` | 需要保护的子组件树 |

## 工作原理

`ErrorBoundary` 内部使用 `onError` 钩子捕获子树中的错误，并将错误状态保存在 `createState` 中。当错误发生时，显示 `fallback`；调用 `reset()` 时，将错误状态重置为 `null`，恢复正常渲染。

## 注意事项

- `ErrorBoundary` 捕获的是组件树**渲染过程**中的同步错误
- 异步错误（如 `setTimeout`、`Promise` 中的错误）不会被自动捕获
- 可以嵌套使用多个 `ErrorBoundary` 来隔离不同区域的错误

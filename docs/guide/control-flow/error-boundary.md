# ErrorBoundary

`ErrorBoundary` 用于捕获子组件树中抛出的错误，防止错误导致整个应用崩溃，并显示降级 UI。

## 在线示例

点击「触发渲染错误」，观察局部降级界面；再点击「修复并重置」恢复正常内容。

<LiveExample example="errorBoundary" title="捕获错误并恢复" />

## 基本用法

使用 `children` getter 按需创建受保护子树，并把边界封装为父容器中的独立组件。Piant 的 JSX 属性会提前求值并缓存 `children`；直接把 `<RiskyComponent />` 嵌进 `<ErrorBoundary>`，可能在边界安装错误处理前就创建子组件，也可能在重置时复用已清理的节点。需要捕获构造错误或支持重试时，使用下面的工厂写法。

```tsx
import { ErrorBoundary, Text, View } from '@piant/core';

function SafePanel() {
  return ErrorBoundary({
    get children() {
      return <RiskyComponent />;
    },
    fallback: <Text>发生了错误，请重试</Text>,
  });
}

function App() {
  return (
    <View>
      <SafePanel />
    </View>
  );
}
```

## 带重置功能

`fallback` 可以是一个接受错误和重置函数的回调。让 `children` getter 创建子树，重置时才能创建新的组件状态和节点：

```tsx
function SafePanel() {
  return ErrorBoundary({
    get children() {
      return <RiskyComponent />;
    },
    fallback: (error, reset) => {
      const message = `错误：${error.message}`;
      return (
        <View>
          <Text>{message}</Text>
          <View
            onClick={reset}
            style={{ backgroundColor: '#0066cc', padding: 8, borderRadius: 4 }}
          >
            <Text style={{ color: 'white' }}>重试</Text>
          </View>
        </View>
      );
    },
  });
}
```

调用 `reset()` 会清除错误状态，再次读取 `children`。不要把提前创建好的节点作为可重试子树反复返回；导致错误的数据或资源也应先修复，否则重试仍会进入降级界面。在线示例每次恢复都会创建全新的局部状态，可连续触发、恢复。

## Props

| 属性       | 类型                                                              | 说明                |
| ---------- | ----------------------------------------------------------------- | ------------------- |
| `fallback` | `JSX.Element \| ((err: Error, reset: () => void) => JSX.Element)` | 错误时显示的降级 UI |
| `children` | `JSX.Element`                                                     | 需要保护的子组件树  |

## 工作原理

`ErrorBoundary` 内部使用 `onError` 钩子捕获子树中的错误，并将错误状态保存在 `createState` 中。当错误发生时，显示 `fallback`；调用 `reset()` 时，将错误状态重置为 `null`，恢复正常渲染。

## 注意事项

- `ErrorBoundary` 捕获的是组件树**渲染过程**中的同步错误
- 将边界封装成组件后放在父容器中，隔离其响应式作用域；避免在应用根作用域直接注册边界，与根级错误处理混在一起
- 异步错误（如 `setTimeout`、`Promise` 中的错误）不会被自动捕获
- 可以嵌套使用多个 `ErrorBoundary` 来隔离不同区域的错误

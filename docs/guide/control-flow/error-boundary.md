# ErrorBoundary

`ErrorBoundary` 用于捕获子组件树中抛出的错误，防止错误导致整个应用崩溃，并显示降级 UI。

## 在线示例

点击「触发渲染错误」，观察局部降级界面；再点击「修复并重置」恢复正常内容。

<LiveExample example="errorBoundary" title="捕获错误并恢复" />

## 基本用法

将需要保护的组件放在 `ErrorBoundary` 内。子组件在边界的独立错误作用域中创建，构造或响应式渲染过程中的同步错误会显示降级界面，父级与同级内容继续工作。

```tsx
import { ErrorBoundary, Text, View } from '@piant/core';

function App() {
  return (
    <View>
      <ErrorBoundary fallback={<Text>发生了错误</Text>}>
        <RiskyComponent />
      </ErrorBoundary>
    </View>
  );
}
```

## 带重置功能

`fallback` 可以是一个接受错误和重置函数的回调。调用 `reset()` 重新创建受保护子树，并初始化新的局部状态：

```tsx
function SafePanel() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        const message = `错误：${error.message}`;
        return (
          <View>
            <Text>{message}</Text>
            <View
              onClick={reset}
              style={{
                backgroundColor: '#0066cc',
                padding: 8,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: 'white' }}>重试</Text>
            </View>
          </View>
        );
      }}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

导致错误的数据或资源应先修复，否则重试仍会进入降级界面。使用 JSX 子组件创建新节点，不要反复返回提前创建并已从渲染树移除的节点。在线示例可以连续触发错误与恢复。

## Props

| 属性       | 类型                                                              | 说明                |
| ---------- | ----------------------------------------------------------------- | ------------------- |
| `fallback` | `JSX.Element \| ((err: Error, reset: () => void) => JSX.Element)` | 错误时显示的降级 UI |
| `children` | `JSX.Element`                                                     | 需要保护的子组件树  |

## 工作原理

`ErrorBoundary` 为受保护子树创建独立的响应式作用域，用 `onError` 捕获错误。当错误发生时，释放失败子树的响应式副作用并显示 `fallback`；调用 `reset()` 时清除错误、创建新的子树。渲染节点的替换与移除仍由渲染器处理。

## 注意事项

- `ErrorBoundary` 捕获的是组件树**渲染过程**中的同步错误
- `fallback` 自身抛出的错误交给外层边界或应用错误处理，不会由同一个边界反复捕获
- 异步错误（如 `setTimeout`、`Promise` 中的错误）不会被自动捕获
- 可以嵌套使用多个 `ErrorBoundary` 来隔离不同区域的错误

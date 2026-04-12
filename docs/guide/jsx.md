# JSX 语法

Piant 使用 JSX 语法来声明 UI，外观上与 React 非常相似，但底层直接操作 Canvas 节点而非 DOM。

## 配置 JSX

需要安装并配置 `@piant/babel-preset-piant`（详见[安装与配置](/guide/installation)）。

在 `tsconfig.json` 中添加：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@piant/core"
  }
}
```

## 基本用法

```tsx
import { View, Text } from '@piant/core';

function Hello() {
  return (
    <View style={{ padding: 16 }}>
      <Text>Hello, Piant!</Text>
    </View>
  );
}
```

## 表达式插值

在 JSX 中使用 `{}` 插入 JavaScript 表达式：

```tsx
const name = 'Piant';

<Text>{`Hello, ${name}!`}</Text>;
```

## 响应式值

Piant 的响应式值（`createState` 返回的 getter）是函数，需要**调用**才能读取当前值：

```tsx
import { createState, View, Text } from '@piant/core';

function Counter() {
  const [count, setCount] = createState(0);

  return (
    <View onClick={() => setCount(count() + 1)}>
      <Text>{count()}</Text>
    </View>
  );
}
```

## 条件渲染

使用 `Show` 组件进行条件渲染（不要直接使用三元表达式，因为 Canvas 节点需要正确的挂载/卸载）：

```tsx
import { Show, View } from '@piant/core';

<Show when={isVisible()} fallback={<View />}>
  <Content />
</Show>;
```

## 列表渲染

使用 `For` 组件渲染列表：

```tsx
import { For, View, Text } from '@piant/core';

<For each={items()}>
  {(item) => (
    <View>
      <Text>{item.name}</Text>
    </View>
  )}
</For>;
```

## 事件处理

事件属性使用驼峰式命名，如 `onClick`、`onPointerDown`：

```tsx
<View onClick={() => console.log('clicked!')} />
```

## ref

使用 `ref` 属性获取底层 Canvas 节点实例（`PView`、`PImage` 等）：

```tsx
let viewRef: PView;

<View ref={(el) => (viewRef = el)} style={{ width: 100, height: 100 }} />;
```

## 注意事项

- Piant 的 JSX 运行时与 React 不同，组件函数返回的是 Canvas 节点而非虚拟 DOM
- 文本内容必须包裹在 `<Text>` 组件中，不能直接在 `<View>` 中使用字符串子节点
- 响应式 getter 需要显式调用（如 `count()`），而不是直接使用变量

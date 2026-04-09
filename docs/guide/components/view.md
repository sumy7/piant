# View

`View` 是 Piant 中最基础的容器组件，类似于 HTML 中的 `<div>`。它支持 Flexbox 布局和视觉样式，并且可以处理交互事件。

## 基本用法

```tsx
import { View, StyleSheet } from '@piant/core';

function Container() {
  return (
    <View
      style={{
        width: 200,
        height: 100,
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
      }}
    >
      {/* 子组件 */}
    </View>
  );
}
```

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `ViewStyles \| ViewStyles[]` | 样式对象或样式数组 |
| `children` | `any` | 子元素 |
| `ref` | `(el: PView) => void` | 获取底层节点实例 |
| `onClick` | `(e: FederatedPointerEvent) => void` | 点击事件 |
| `onMouseDown` | `(e: FederatedPointerEvent) => void` | 鼠标按下事件 |
| `onMouseUp` | `(e: FederatedPointerEvent) => void` | 鼠标抬起事件 |
| 其他事件属性 | — | 详见[事件处理](/guide/events)，事件回调参数为 PixiJS 的 federated event（如 `FederatedPointerEvent`） |

## 样式数组

`style` 属性支持数组，数组中后面的样式会覆盖前面的样式：

```tsx
const styles = StyleSheet.create({
  base: { padding: 8, backgroundColor: '#fff' },
  active: { backgroundColor: '#e0e0ff' },
});

<View style={[styles.base, isActive && styles.active]} />
```

## 嵌套布局

```tsx
<View style={{ flexDirection: 'row', gap: 8 }}>
  <View style={{ flex: 1, height: 40, backgroundColor: '#ff0000' }} />
  <View style={{ flex: 2, height: 40, backgroundColor: '#00ff00' }} />
</View>
```

## 事件交互

当绑定事件处理器时，View 会自动设置 `interactive = true`：

```tsx
<View
  style={{ width: 100, height: 40 }}
  onClick={() => console.log('clicked')}
  onMouseEnter={() => console.log('mouse enter')}
  onMouseLeave={() => console.log('mouse leave')}
/>
```

## 获取节点引用

```tsx
import { PView } from '@piant/core';

let viewRef: PView;

<View ref={(el) => (viewRef = el)} style={{ width: 100, height: 100 }}>
  {/* ... */}
</View>
```

## 实现细节

`View` 内部创建一个 `PView` 实例（封装 PixiJS 的 `Container`）。样式变化通过 `effect` 响应式地调用 `setStyle()` 更新布局节点。子元素通过 `insert()` 函数插入到 Canvas 节点树中。

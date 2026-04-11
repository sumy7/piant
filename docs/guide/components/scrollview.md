# ScrollView

`ScrollView` 是可滚动的容器组件，允许内容超出可见区域时进行滚动查看。

## 基本用法

```tsx
import { ScrollView, View, Text } from '@piant/core';

function MyScrollList() {
  return (
    <ScrollView style={{ width: 300, height: 200 }}>
      {Array.from({ length: 20 }, (_, i) => (
        <View style={{ height: 40, borderBottomWidth: 1, borderColor: '#eee' }}>
          <Text>列表项 {i + 1}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
```

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `ViewStyles \| ViewStyles[]` | 容器样式（需要设置固定 `width` 和 `height`） |
| `children` | `any` | 子元素（会被插入内部滚动内容层） |
| `ref` | `(el: PScrollView) => void` | 获取底层节点实例 |
| 事件属性 | — | 详见[事件处理](/guide/events) |

## 注意事项

- `ScrollView` 需要设置固定的 `width` 和 `height`，否则无法确定可视区域
- 内部使用 PixiJS Ticker 驱动滚动动画，已自动注册 `onTick`
- 子元素被插入到内部的 `scrollContent` 节点，而非 `ScrollView` 本身

## 实现细节

`ScrollView` 内部创建 `PScrollView` 节点，该节点封装了一个可滚动的内容层（`scrollContent`）。通过 `onTick` 钩子在每帧更新滚动位置，实现流畅的滚动效果。

<!-- TODO: 补充滚动方向、是否弹性等配置项的说明（待实现） -->

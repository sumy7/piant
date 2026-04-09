# CustomView

`CustomView` 允许使用 PixiJS `Graphics` API 直接绘制自定义图形，适合需要精确像素控制的场景，如图表、自定义形状等。

## 基本用法

```tsx
import { CustomView } from '@piant/core';

function Circle() {
  return (
    <CustomView
      style={{ width: 100, height: 100 }}
      onDraw={(graphics, width, height) => {
        graphics.clear();
        graphics
          .circle(width / 2, height / 2, Math.min(width, height) / 2)
          .fill({ color: '#ff6600' });
      }}
    />
  );
}
```

## Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `ViewStyles \| ViewStyles[]` | 容器样式（宽高决定绘制区域） |
| `onDraw` | `(graphics: Graphics, width: number, height: number) => void` | 绘制回调，在尺寸变化时调用 |
| `ref` | `(el: PCustomView) => void` | 获取底层节点实例 |
| 事件属性 | — | 详见[事件处理](/guide/events) |

## onDraw 回调

`onDraw` 在组件首次渲染以及**每次尺寸发生变化**时调用：

- `graphics`：PixiJS `Graphics` 实例，可直接调用绘制 API
- `width`：当前组件宽度（像素）
- `height`：当前组件高度（像素）

在 `onDraw` 中应先调用 `graphics.clear()` 清除之前的绘制内容，再重新绘制。

## 响应式绘制

`onDraw` 会被包裹在 `effect` 中，所以可以读取响应式状态：

```tsx
import { CustomView, createState } from '@piant/core';

function ProgressBar() {
  const [progress, setProgress] = createState(0.5);

  return (
    <CustomView
      style={{ width: 200, height: 20, borderRadius: 10 }}
      onDraw={(graphics, width, height) => {
        graphics.clear();
        // 背景
        graphics
          .roundRect(0, 0, width, height, 10)
          .fill({ color: '#e0e0e0' });
        // 前景（读取响应式 progress）
        graphics
          .roundRect(0, 0, width * progress(), height, 10)
          .fill({ color: '#0066cc' });
      }}
    />
  );
}
```

## 完整示例：圆角矩形边框

```tsx
<CustomView
  style={{ width: 200, height: 80 }}
  onDraw={(g, w, h) => {
    g.clear();
    g.roundRect(0, 0, w, h, 12)
      .stroke({ color: '#cccccc', width: 1 })
      .fill({ color: '#ffffff' });
  }}
/>
```

## 注意事项

- `onDraw` 在组件尺寸变化时自动重新调用，无需手动监听
- 如果需要基于响应式状态更新绘制，直接在 `onDraw` 中读取 getter 即可（`effect` 会自动追踪依赖）
- `CustomView` 没有子元素，仅用于绘制图形

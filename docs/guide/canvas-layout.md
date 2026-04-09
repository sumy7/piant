# Canvas 布局

Piant 在 Canvas 画布上实现了完整的 Flexbox 布局，底层使用 [Yoga Layout](https://www.yogalayout.dev/) 引擎（Meta 开源的跨平台布局库，也被 React Native 使用）。

## 布局模型

与 DOM 不同，Piant 的所有元素都是 Canvas 上的绘制节点。布局计算由 `PRoot` 驱动，在每帧的 PixiJS Ticker 回调中执行：

```
PRoot (根节点)
  └── PView (容器)
        ├── PView (子容器)
        └── PText (文本)
```

每个节点持有一个 Yoga LayoutNode，布局系统在根节点处统一触发 `calculateLayout(width, height)`，然后逐层 `applyLayout()` 将计算结果应用到 PixiJS 的 `Container` 位置上。

## Flexbox 支持

Piant 支持大多数 CSS Flexbox 属性，包括：

| 属性 | 说明 |
|------|------|
| `flexDirection` | `'row'` \| `'column'` \| `'row-reverse'` \| `'column-reverse'` |
| `flexWrap` | `'nowrap'` \| `'wrap'` \| `'wrap-reverse'` |
| `justifyContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'space-between'` \| `'space-around'` \| `'space-evenly'` |
| `alignItems` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'baseline'` \| `'stretch'` |
| `alignSelf` | 同 `alignItems`，作用于单个子元素 |
| `flex` | 简写属性 |
| `flexGrow` | 弹性增长系数 |
| `flexShrink` | 弹性收缩系数 |
| `flexBasis` | 弹性基准尺寸 |
| `gap` / `rowGap` / `columnGap` | 间距 |

## 尺寸与定位

```tsx
<View
  style={{
    width: 200,        // 固定宽度（像素）
    height: '50%',     // 百分比高度
    minWidth: 100,
    maxWidth: 400,
    position: 'absolute',
    top: 10,
    left: 20,
  }}
/>
```

支持的值类型：
- **数字**：像素值，如 `200`
- **百分比字符串**：如 `'50%'`
- **数字字符串**：如 `'200'`（等同于像素值）

## 定位方式

| `position` 值 | 说明 |
|---------------|------|
| `'relative'`（默认）| 参与正常布局流 |
| `'absolute'` | 从布局流中脱离，相对于父节点定位 |

## 内边距与外边距

```tsx
<View
  style={{
    padding: 16,        // 四边内边距
    paddingInline: 12,  // 左右内边距
    paddingBlock: 8,    // 上下内边距
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    margin: 8,          // 外边距（同理）
  }}
/>
```

## `boxSizing`

Piant 支持 `boxSizing` 属性：

- `'border-box'`（默认）：宽高包含 padding 和 border
- `'content-box'`：宽高不含 padding 和 border

## 布局脏标记机制

`PRoot` 使用脏标记（`_isDirty`）来避免不必要的布局计算。当任何子节点的样式发生变化时，根节点被标记为 dirty，并在下一帧的 Ticker 回调中重新计算布局。

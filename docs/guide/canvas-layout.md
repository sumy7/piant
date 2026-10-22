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

## 嵌入页面与多个实例

Canvas 可以只占普通页面的一块区域。为容器设定尺寸，再将它交给 `mount`；无需让 Canvas 覆盖整个窗口。

下面两个区域分别使用已有 Canvas 和自动创建的 Canvas。示例假定 `Counter` 在组件函数内通过 `createState` 创建计数状态，因此两边互不影响。

```html
<div class="panels">
  <section id="left"><canvas id="left-canvas"></canvas></section>
  <section id="right"></section>
</div>
```

```css
.panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
}
.panels > section {
  min-width: 0;
  height: 320px;
}
```

```ts
import { mount } from '@piant/core';
import { Counter } from './Counter';

const leftHost = document.getElementById('left')!;
const leftCanvas = document.querySelector<HTMLCanvasElement>('#left-canvas')!;
const rightHost = document.getElementById('right')!;

const left = await mount(Counter, {
  target: leftCanvas,
  resizeTo: leftHost,
});
const right = await mount(Counter, { target: rightHost });

// 容器调整后分别同步；销毁左侧不会停止右侧。
leftHost.style.height = '400px';
left.destroy();

// 已有 Canvas 保留，可再次挂载。
const replacement = await mount(Counter, {
  target: leftCanvas,
  resizeTo: leftHost,
});

// 页面卸载时：
replacement.destroy();
right.destroy();
```

容器挂载默认观察内容区尺寸；已有 Canvas 默认读取挂载时的客户区尺寸，需要响应容器变化时显式传入 `resizeTo`。容器的高度应由 CSS 或页面布局决定，不能依赖内部 Canvas 撑开。页面滚动和容器偏移不会改变 Piant 的逻辑坐标原点；指针交互和 `Input` 的 DOM 输入层以各自 Canvas 的实际位置对齐。

设置 `width` / `height` 可以按轴固定尺寸，例如 `{ target: rightHost, height: 240 }` 保持高度固定，宽度仍跟随容器。调用 `instance.resize(480, 240)` 可立即更新画布和根布局；参数只对本次同步生效，后续容器或窗口尺寸变化会重新读取配置与尺寸来源。设置 `resizeTo: false` 可关闭容器观察；需要稳定尺寸时，在挂载选项中指定 `width` / `height`。

布局尺寸使用逻辑像素，默认渲染分辨率为当前设备 DPR，调整尺寸时会同步读取。`mount` 同步设置 Canvas CSS 尺寸与像素缓冲区，不应再单独通过 CSS 拉伸 Canvas。已有 Canvas 在销毁时保留并恢复挂载前的尺寸及样式属性，自动创建的 Canvas 在销毁时移除。取消初始化和完整清理边界见[渲染 API](/reference/renderer#mount)。

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

运行仓库中的完整双实例页面：`pnpm --filter @piant/examples-todos dev`，打开 `/embedded.html`。页面提供独立计数、DOM 输入、容器尺寸调整、销毁和重建，可滚动页面及父容器验证交互位置。

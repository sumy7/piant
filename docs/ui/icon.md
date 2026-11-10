# Icon

显示应用已有的图形，或按组件的实际尺寸绘制一个图标。预览展示了不同形状和大小。

<LiveExample example="uiIcon" title="Icon：不同几何形状与尺寸缩放" :height="250" hide-source />

## 用法

```tsx
import { Icon } from '@piant/ui';

<Icon
  size={24}
  label="已完成"
  draw={(graphics, width, height, color) => {
    graphics
      .moveTo(width * 0.2, height * 0.5)
      .lineTo(width * 0.42, height * 0.72)
      .lineTo(width * 0.8, height * 0.28)
      .stroke({ color, width: 2 });
  }}
/>;
```

- 用 `src` 显示已有的 Pixi `Sprite` 或 `Graphics`，或用 `draw` 绘制。使用 `draw` 时可设 `color`，默认取主题文字色。
- `size` 同时设置宽高，默认 24。用 `style` 可以分别指定宽高。
- 只在图标本身传达信息时提供 `label`。可点击的图标操作使用 [IconButton](/ui/icon-button)。
- 通过 `src` 传入的资产由调用方管理。同一显示对象要同时出现在多处时，为每处提供独立实例。

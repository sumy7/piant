# Surface

给一块内容添加背景、圆角和留白，适合设置面板和卡片。试着切换外观，观察面板如何随主题变化。

<LiveExample example="uiSurface" title="Surface：明暗主题、密度与文字缩放" :height="340" hide-source />

## 用法

```tsx
import { Text } from '@piant/core';
import { Surface } from '@piant/ui';

<Surface tone="raised" padding="lg" radius="md" bordered>
  <Text>项目设置</Text>
</Surface>;
```

`tone` 可用 `'surface'`（默认）、`'raised'` 和 `'canvas'`。`padding` 和 `radius` 默认为主题的 `'md'`，也可传数字。`bordered` 加上主题边框。

用 `style` 覆盖布局或背景。内部 `Text` 的文字样式单独设置，需要裁剪内容时设置 `style.overflow: 'hidden'`。

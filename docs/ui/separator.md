# Separator

用一条横线或竖线分隔相邻区域。预览展示了两种方向。

<LiveExample example="uiSeparator" title="Separator：横向与纵向分隔" :height="300" hide-source />

## 用法

```tsx
import { Button, Separator, Stack } from '@piant/ui';

<Stack direction="row" align="center" gap="sm">
  <Button>编辑</Button>
  <Separator orientation="vertical" length={24} />
  <Button variant="secondary">分享</Button>
</Stack>;
```

默认为横线，宽度占满可用空间。横向布局中可用 `orientation="vertical"`，指定 `length` 固定高度，也可省略长度以拉伸。用 `thickness` 调整线宽，默认 1 个逻辑像素。只需要留白时用 [Spacer](/ui/spacer)。

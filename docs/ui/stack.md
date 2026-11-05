# Stack

沿一个方向排列一组内容。试着切换横向和纵向，观察空间不足时的换行。

<LiveExample example="uiStack" title="Stack：切换排列方向与自动换行" :height="320" hide-source />

## 用法

```tsx
import { Button, Stack } from '@piant/ui';

<Stack direction="row" gap="sm" align="center" wrap>
  <Button>保存</Button>
  <Button variant="secondary">取消</Button>
</Stack>;
```

`direction` 默认为 `'column'`。用 `align` 设置交叉轴对齐，`justify` 设置主轴对齐。间距可用主题值（例如 `'sm'` 或 `'md'`）或数字。窄容器可以加 `wrap`，让放不下的项换到下一行。

用 [Surface](/ui/surface) 给内容加面板背景，用 [Spacer](/ui/spacer) 把操作推到两端。

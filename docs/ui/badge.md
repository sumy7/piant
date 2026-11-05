# Badge

用短标签显示状态或数量。试着切换内容和外观，观察长标签在有限宽度下如何显示。

<LiveExample example="uiBadge" title="Badge：内容变化、主题、密度与文字溢出" :height="330" hide-source />

## 用法

```tsx
import { Badge } from '@piant/ui';

<Badge tone="primary">已同步</Badge>;
```

`tone` 可选 `'neutral'`（默认）、`'primary'` 或 `'danger'`。内容可以是文字或数字。默认单行，可用 `style.maxWidth` 限制宽度，溢出时显示省略号。用 `textStyle` 调整文字外观。需要主动通知或提供撤销操作时，用 [Toast](/ui/toast)。

# Spinner

用旋转标识提示用户等待。试着暂停动画或改变标识的尺寸。

<LiveExample example="uiSpinner" title="Spinner：尺寸、暂停与减少动画" :height="330" hide-source />

## 用法

```tsx
import { Spinner } from '@piant/ui';

<Spinner size={20} label="正在加载预览" />;
```

省略 `size` 时使用主题的正文行高。可用 `color` 和 `thickness` 调整颜色与线宽。`active={false}` 或启用减少动画时显示静态环。标识旁边已有相同的提示文字时，可以省略 `label`。

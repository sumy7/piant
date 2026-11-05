# ProgressBar

显示任务进度，或表示任务正在进行但完成比例未知。试着切换确定和不确定两种模式。

<LiveExample example="uiProgressBar" title="ProgressBar：进度边界、模式切换与减少动画" :height="320" hide-source />

## 用法

```tsx
import { ProgressBar } from '@piant/ui';

<ProgressBar label="上传进度" value={45} max={100} />;
```

用 `value` 更新当前进度，默认范围是 0–100，超出范围的数值按边界显示。未知完成比例时设置 `indeterminate`。提供 `label` 说明正在跟踪的任务。用 `thickness` 调整条形高度。不确定模式会遵循主题的减少动画设置。

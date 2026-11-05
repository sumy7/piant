# Checkbox

`Checkbox` 用于勾选独立选项，也可以显示一组子项的部分选中状态。

<LiveExample example="uiCheckbox" title="切换勾选与混合态" :height="720" hide-source />

## 用法

```tsx
import { Checkbox } from '@piant/ui';

<Checkbox
  label="包含参考图层"
  description="将隐藏的参考图层一并导出"
  defaultChecked
  onCheckedChange={updateExportLayers}
/>;
```

点击控件或标签，或聚焦后按 Space，切换勾选。使用 `defaultChecked` 设置初值，默认未选中。应用持有状态时，传入 `checked` 并在 `onCheckedChange` 中更新。用 `disabled` 禁止切换。

`checked="mixed"` 显示部分选中。激活混合态会请求 `true`。各子项如何变化、何时重新显示混合态，由应用决定。表示设置开关时用 [ToggleSwitch](/ui/toggle-switch)。

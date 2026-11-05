# RadioGroup

`RadioGroup` 将少量选项同时展示出来，让用户从中选择一项。

<LiveExample example="uiRadioGroup" title="选择导出质量" :height="780" hide-source />

## 用法

```tsx
import { RadioGroup } from '@piant/ui';

<RadioGroup
  label="导出质量"
  defaultValue="standard"
  options={[
    { value: 'standard', label: '标准' },
    { value: 'high', label: '高质量' },
  ]}
  onValueChange={setExportQuality}
/>;
```

每个选项要有唯一的 `value` 和可见的 `label`，也可设置 `description` 或 `disabled`。组默认纵向排列，可用 `orientation="horizontal"` 改为横向。

Tab 进入或离开整组。方向键循环切换可用项，Home / End 移到首末可用项，Space 选择当前项。需要由应用持有状态时用 `value` 配合 `onValueChange`。移除当前选项后，组件保留原值，直到用户再次选择或应用提交新值。

选项较多、希望节省空间时，用 [Select](/ui/select)。

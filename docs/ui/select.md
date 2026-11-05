# Select

`Select` 用于从下拉列表中选定一个值，例如项目可见性或导出格式。触发器显示当前已提交的选项。

<LiveExample example="uiSelect" title="选择项目可见性" :height="520" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import { Select, SelectContent, SelectTrigger } from '@piant/ui';

<Select
  label="项目可见性"
  defaultValue="team"
  options={[
    { value: 'team', label: '团队' },
    { value: 'private', label: '私密' },
  ]}
  onValueChange={setVisibility}
>
  {() => (
    <View>
      <SelectTrigger />
      <SelectContent />
    </View>
  )}
</Select>;
```

在 [OverlayHost](/ui/overlays) 下创建。用 `label` 命名字段，每个选项使用唯一的 `value`，可设置 `disabled`。没有有效选项时显示 `placeholder`，空列表会禁用触发器。

方向键和名称前缀用来浏览选项，Enter / Space 或点击才提交。Escape、Tab 或点击外部会取消本次浏览。用 `value` 和 `onValueChange` 管理选值，传入 `null` 表示未选择。需要键入内容来筛选候选时用 [Combobox](/ui/combobox)。

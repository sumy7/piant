# Combobox

输入文字筛选候选，再从结果中选定一项。适合预设、标签等本地单选场景。将 Combobox 放在 [UIProvider](./theme) 的 [OverlayHost](./overlays) 中。

<LiveExample example="uiCombobox" title="Combobox：本地候选过滤、选择与空结果" :height="340" hide-source />

输入关键词缩小范围，用方向键移动高亮，按 Enter 选中。

## 基本用法

```tsx
import { createState } from '@piant/core';
import { Combobox } from '@piant/ui';

function PresetPicker() {
  const [preset, setPreset] = createState<string | null>(null);
  return (
    <Combobox
      label="布局预设"
      options={[
        { value: 'compact', label: '紧凑布局' },
        { value: 'comfortable', label: '舒适布局' },
      ]}
      value={preset()}
      onValueChange={setPreset}
    />
  );
}
```

## 文本、选中值与展开状态

- `value` 是已经选定的候选键，`null` 表示未选择。每个候选的 `value` 须非空且唯一。
- `inputValue` 是正在编辑的文字。需要在应用中使用这段文字时，传入 `inputValue` 和 `onInputValueChange`。外部更新选中值时，如需同步输入文字，也应更新 `inputValue`。
- `defaultValue`、`defaultInputValue` 和 `defaultOpen` 分别设置初始选中值、文字和展开状态。未指定初始文字时使用初始选项标签。

## 过滤与操作

默认按标签做不区分大小写的子串匹配。用 `filter(option, input)` 自定义规则，用 `emptyText` 设置空结果提示。Enter 提交高亮项，Escape 关闭并恢复已选标签，Tab 离开时保留编辑文字。清除按钮同时清空选择和文本，可用 `clearable={false}` 隐藏。

候选为本地同步数据，只支持单选，任意输入的文字不会提交为选项。没有筛选需求时可使用 [Select](./select)。

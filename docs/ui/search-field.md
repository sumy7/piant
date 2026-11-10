# SearchField

用带清除按钮的输入框提交搜索，或在输入时筛选当前列表。

<LiveExample example="uiSearchField" title="SearchField：中文输入、提交、清除和只读" :height="260" hide-source />

输入关键词后按 Enter，再点清除按钮比较两种操作。

## 基本用法

```tsx
import { SearchField } from '@piant/ui';

function LayerSearch(props: { search: (query: string) => void }) {
  return (
    <SearchField
      aria-label="搜索图层"
      placeholder="输入图层名称"
      onSearch={props.search}
      clearLabel="清除搜索"
    />
  );
}
```

## 输入、提交与清除

- 用 `onValueChange` 接收输入和清除产生的文本变化。要做即时筛选，在这里更新查询；要由应用控制输入，再传入 `value`。非受控初始文字可通过 `defaultValue` 设置。
- `onSearch` 在 Enter 时提交当前文字，输入法合成期间不会触发。
- 点击清除按钮或在非空输入中按 Escape 可清空文字，清除后仍聚焦输入框。`onClear` 可以监听清除动作。
- `readOnly` 允许搜索和复制已有文字；`disabled` 禁止输入和搜索。标签可通过 `aria-label` 或 [Field](./field) 提供。

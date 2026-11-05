# Accordion

把相关设置分为多块可折叠的内容。预览上方一次打开一块，下方可以同时打开多块。

<LiveExample example="uiAccordion" title="Accordion：单开、多开、键盘导航与草稿保留" :height="700" hide-source />

## 用法

```tsx
import { Accordion, TextField } from '@piant/ui';

<Accordion
  type="single"
  defaultValue="account"
  items={[
    {
      value: 'account',
      label: '账户',
      children: () => <TextField aria-label="账户名称" />,
    },
    {
      value: 'display',
      label: '显示',
      children: () => <TextField aria-label="显示名称" />,
    },
  ]}
/>;
```

- `type="single"` 的选择值为一个 key 或 `null`。默认允许折叠当前项，`collapsible={false}` 可要求当前项保持展开，直到用户切换。
- `type="multiple"` 的选择值为 key 数组。给每个条目稳定且唯一的 `value`，让排序变化时仍能找到同一个面板。
- 使用 `defaultValue` 指定初值，或用 `value` 与 `onValueChange` 控制。聚焦标题后用方向键在标题间移动，Enter 或 Space 切换当前项。
- 需要保留折叠面板的草稿时使用 `mountStrategy="lazy"`。见[面板保留方式](/ui/containers#面板生命周期)。

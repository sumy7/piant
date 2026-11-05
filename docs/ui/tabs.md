# Tabs

在同一位置切换多个页面。先在“资料”输入草稿，切换到“偏好”后再返回，观察草稿保留。

<LiveExample example="uiTabs" title="Tabs：自动/手动激活、草稿保留与动态标签" :height="460" hide-source />

## 用法

```tsx
import { Tabs, TextField } from '@piant/ui';

<Tabs
  label="项目设置"
  defaultValue="general"
  mountStrategy="lazy"
  items={[
    {
      value: 'general',
      label: '常规',
      children: () => <TextField aria-label="项目名称" defaultValue="Piant" />,
    },
    {
      value: 'advanced',
      label: '高级',
      children: () => <TextField aria-label="高级配置" />,
    },
  ]}
/>;
```

- 为每项提供稳定且唯一的 `value` 和可见的 `label`。`children` 用函数返回面板内容。
- 默认选中第一个可用项。用 `defaultValue` 指定初始页，或用 `value` 和 `onValueChange` 交给应用控制。传入 `null` 可表示无选择。
- 默认按方向键即选中目标页。用 `activationMode="manual"` 让方向键只移动焦点，再按 Enter 或 Space 确认。`orientation="vertical"` 改用上下方向键。
- 默认切离时释放面板。用 `mountStrategy="lazy"` 保留已访问页面的状态，或用 `"keepMounted"` 提前创建全部面板。见[面板保留方式](/ui/containers#面板生命周期)。

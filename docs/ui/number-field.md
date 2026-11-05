# NumberField

用于编辑缩放、尺寸或其他数值参数。用户可以输入数字，也可以用增减按钮或上下方向键调整。

<LiveExample example="uiNumberField" title="NumberField：临时输入、小数步进、范围和空值" :height="260" hide-source />

试着清空数值后按 Enter，再用增减按钮从零开始调整。

## 基本用法

```tsx
import { NumberField } from '@piant/ui';

<NumberField aria-label="缩放" defaultValue={0.2} min={0} max={2} step={0.1} />;
```

## 提交与步进

Enter 或失焦提交数值，空白提交 `null`。输入可以暂留小数点、负号等内容；提交无效数字或按 Escape 时恢复上次已提交的值。步进从当前有效的编辑值起算，否则使用已提交值或零。

| 属性                                | 用法                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `value` / `defaultValue`            | 传入 `value` 由应用控制数值，或用 `defaultValue` 设置初始值。默认 `null`。       |
| `onValueChange`                     | 提交或步进时接收 `number \| null`。如需跟踪编辑文字，使用 `onInputValueChange`。 |
| `min` / `max`                       | 限制提交和步进的范围，省略时无界。                                               |
| `step`                              | 增减量，须为正有限数，默认 1。                                                   |
| `decrementLabel` / `incrementLabel` | 自定义两个增减按钮的可访问名称。                                                 |

用 `aria-label` 或 [Field](./field) 命名输入。输入支持点号小数，不处理本地化分组符或货币格式。只读时可以选中和复制数值。

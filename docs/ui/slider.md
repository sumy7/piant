# Slider

拖动滑块或用方向键在范围内选择一个值，适合调节音量、不透明度等参数。

<LiveExample example="uiSlider" title="Slider：小数步长、RTL、纵向非受控与禁用" :height="620" hide-source />

拖动横向滑块，再切换 RTL 试试左右方向键。纵向滑块从下往上增大。

## 基本用法

```tsx
import { createState } from '@piant/core';
import { Slider } from '@piant/ui';

function Volume() {
  const [volume, setVolume] = createState(40);
  return (
    <Slider
      name="音量"
      max={100}
      step={5}
      value={volume()}
      onValueChange={setVolume}
      valueText={(value) => `${value}%`}
    />
  );
}
```

## 数值与步长

范围默认 0 到 100，步长默认 1。刻度从 `min` 开始，`max` 不在刻度上时取范围内最后一格。例如 `min={2}`、`max={11}`、`step={4}` 的可选值是 2、6、10。

用 `defaultValue` 设置初始值，默认从范围起点开始。需要与应用状态同步时，传入 `value` 并在 `onValueChange` 中更新。拖动期间会连续通知不同的有效值。

## 指针与键盘

| 操作                     | 结果                                                 |
| ------------------------ | ---------------------------------------------------- |
| 方向键                   | 每次调整一个步长。`dir="rtl"` 反转横向滑块的左右键。 |
| Home / End               | 跳到最小值或最大合法刻度。                           |
| `orientation="vertical"` | 垂直排列，上方为大值。可用 `style` 给出所需高度。    |
| `disabled`               | 禁止调整并跳过 Tab 停靠。                            |

提供必填的 `name`，需要表达单位时传入 `valueText`。如果用户需要直接键入精确数值，可组合 [NumberField](./number-field)。

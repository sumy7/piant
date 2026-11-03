# ColorPicker

`ColorPicker` 在非模态弹层内编辑单个颜色。点击带棋盘格透明度预览和十六进制文字的按钮，使用二维色域、Hue/Alpha 滑块、数值通道或 Hex 输入编辑。放在 `UIProvider` 与 `OverlayHost` 内，从 `@piant/ui` 根入口导入。

<LiveExample example="uiColorPicker" title="ColorPicker：色域、通道、透明度与 Hex 草稿" :height="760" />

```tsx
import { createState } from '@piant/core';
import { ColorPicker } from '@piant/ui';

const [fill, setFill] = createState('#3366ffff');

<ColorPicker label="填充色" value={fill()} onValueChange={setFill} />;
```

## 颜色格式与受控值

公开值为 CSS Hex 字符串，接受 `#rgb`、`#rgba`、`#rrggbb` 和 `#rrggbbaa`，忽略首尾空白及大小写。输出统一为小写 `#rrggbbaa`；`alpha={false}` 强制不透明，输出小写六位 `#rrggbb` 并隐藏 Alpha 编辑控件。传入的 `value` 或 `defaultValue` 必须是有效 Hex，组件不接受命名色、RGB/HSL 函数、CSS 变量或颜色数组。

省略 `value` 时使用内部状态，初始为 `defaultValue`，默认 `#3366ffff`。传入 `value` 后，最终接受的 RGB/Alpha 由调用方回传值决定，`onValueChange` 是规范化颜色变更请求。调用方拒绝时，控件恢复已接受颜色；回调 getter 更新会用于后续操作。同一颜色的简写、大小写和完整写法按规范化值比较，不产生重复通知。

二维色域、数值步进和滑块实时请求提交有效颜色。弹层关闭不会回滚此前已经接受的颜色，也不提供额外的确认/取消事务。需要整组撤销时，由调用方保存编辑前的颜色并显式恢复。

内部使用 HSVA：Hue 为角度 `[0, 360)`，Saturation、Brightness 和 Alpha 为 `[0, 1]`。灰色保留上次 Hue，黑色保留上次 Hue 和 Saturation。改变这些潜在通道而 RGB 投影未变化时，不发送重复颜色回调，但后续增加饱和度或亮度可以恢复用户选择的方向。数值框最多显示两位小数，显示舍入不改变内部色域编辑状态。RGB 和透明度最终量化到 8 位通道；例如 Alpha 的 50% 序列化为 `80`，其精确回读约为 50.2%。它们在 Hex、百分比与滑块之间往返可能出现舍入差异。

## Hex 与数字草稿

Hex 输入的编辑字符串与已提交颜色独立。输入中可以保留不完整或无效字符串；Enter 或失焦时仅提交合法 Hex，空字符串与无效值恢复已接受的规范值。焦点仍在 Hex 时，外部颜色变更不会覆盖正在编辑的草稿；Enter、失焦或 Escape 后使用最新接受值。切换 `alpha` 会立即更新 Hex 的输出位数。

焦点在有草稿的 Hex 输入时，第一次 Escape 丢弃草稿并保留弹层；再次 Escape 关闭弹层。IME 合成期间不会因 Enter 或 Escape 提交、撤销或关闭。离开合成中的输入后，其他控件仍可以正常用 Escape 关闭。

数值通道分别是 Hue 的 `0–360` 度，以及 Saturation、Brightness、Alpha 的 `0–100` 百分比，步长为 `1`。Hue 的 `360` 环回为 `0`；其他通道限制在范围内。数字框复用 `NumberField` 的编辑契约，临时 `-`、小数点或空值不会立即更改颜色。Enter、失焦或步进提交有效数值；空值不表示“没有颜色”，会恢复当前通道。数值草稿上按 Escape 会关闭弹层并丢弃尚未提交的草稿。

## 键盘、焦点与只读

触发按钮具有稳定的 `label` 辅助名称，与具名 Color editor 弹层关联。关闭后按现有 Popover 规则恢复焦点。弹层复用可滚动内容区和独立关闭按钮，在窄可视空间或大字号下可先滚动再访问剩余通道。

二维色域的横轴为 Saturation、纵轴为 Brightness；左右方向键调整饱和度，上下方向键调整亮度。它使用组语义并给出数值字段替代路径，不将两个独立维度伪装成单个范围。Hue 和 Alpha 滑块具有独立名称与范围语义；四个数字框和 Hex 使用真实原生输入。预览同时显示 Hex 文字，颜色变化不是唯一的信息通道。

`disabled` 阻止打开与编辑，并请求关闭当前弹层。非受控弹层重新启用后保持关闭，等待下一次打开操作；受控 `open` 仍由调用方决定，若拒绝关闭请求，重新启用后会恢复展开。`readOnly` 允许打开、查看和复制原生输入中的值，阻止色域、数字、Hex 和滑块更改；关闭按钮仍可操作。只读滑块禁用交互，实际复制使用 Hex/数字输入。

## 属性

| 属性                         | 类型与默认值                        | 行为                                       |
| ---------------------------- | ----------------------------------- | ------------------------------------------ |
| `label`                      | 必填非空 `string`                   | 触发按钮辅助名称及各通道名称前缀           |
| `value`                      | `string`                            | 受控颜色，支持四种 CSS Hex 长度            |
| `defaultValue`               | `string`，默认 `'#3366ffff'`        | 非受控初始颜色，只读取一次                 |
| `onValueChange`              | `(hex: string) => void`             | 规范化颜色变更请求                         |
| `alpha`                      | `boolean`，默认 `true`              | 允许透明度；`false` 强制不透明六位 Hex     |
| `disabled`                   | `boolean`，默认 `false`             | 阻止打开和编辑                             |
| `readOnly`                   | `boolean`，默认 `false`             | 允许查看/复制，阻止编辑                    |
| `open` / `defaultOpen`       | `boolean`，初始 `false`             | 独立受控/非受控展开状态                    |
| `onOpenChange`               | `(open: boolean) => void`           | 展开状态变更请求                           |
| `size`                       | `'sm' \| 'md' \| 'lg'`，默认 `'md'` | 触发按钮、原生输入、步进按钮与关闭按钮尺寸 |
| `popupWidth` / `popupHeight` | `number`，默认 `360` / `520`        | 弹层逻辑 CSS 像素尺寸，受可视空间限制      |
| `style`                      | `StyleValue<ViewStyles>`            | 根布局样式                                 |
| `ref`                        | View ref                            | 根布局节点                                 |
| `onError`                    | `(error: unknown) => void`          | 弹层初始化或渲染错误                       |

组件使用当前主题的颜色、间距、密度和字号。二维色域的默认高度为 `150`，弹层滚动区保留全部通道与关闭动作。多实例的颜色、焦点、草稿和浮层生命周期相互独立；销毁会释放监听、ticker 和待完成的浮层挂载。

## 边界与验证

此组件提供编码 sRGB 下的 HSVA 编辑与 8 位 Hex 输出，不提供广色域、颜色空间转换、取色器、渐变、多选或颜色历史。自动化覆盖通道转换、受控拒绝、灰/黑色潜在通道、IME、草稿提交/回滚、焦点及销毁；实际辅助技术播报需按目标浏览器与读屏器组合验收。

Hex 格式范围依据 [CSS Color 的十六进制 sRGB 记法](https://www.w3.org/TR/css-color-4/#hex-notation)。实现不将支持这些字符串扩展为对全部 CSS Color 语法或广色域的支持。

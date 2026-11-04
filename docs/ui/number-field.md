# NumberField

`NumberField` 从 `@piant/ui` 导出，在 `UIProvider` 延迟子树中创建。它将编辑字符串与数值提交分开，复用 [TextField](./text-field) 的原生文本编辑，并提供增减按钮及 spinbutton 语义。

<LiveExample example="uiNumberField" title="NumberField：临时输入、小数步进、范围和空值" :height="260" />

```tsx
const [value, setValue] = createState<number | null>(0.2);
<NumberField
  aria-label="缩放"
  value={value()}
  onValueChange={setValue}
  min={0}
  max={2}
  step={0.1}
/>;
```

| 属性                                | 类型 / 默认值                          | 说明                                                                   |
| ----------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `value`                             | `number \| null`，可选                 | 提供时受控；`null` 显示为空，`undefined` 选择非受控                    |
| `defaultValue`                      | `number \| null`，`null`               | 仅初始化读取                                                           |
| `onValueChange`                     | `(value: number \| null) => void`      | 提交或步进的数值变化，调用方决定受控最终值                             |
| `onInputValueChange`                | `(text: string, event: Event) => void` | 真实输入时的编辑字符串，包括无效及临时内容                             |
| `min` / `max`                       | `number`，无下限 / 无上限              | 提交与步进夹紧到范围，必须有序，不接受 NaN；显式无穷端点仅允许向外无界 |
| `step`                              | `number`，`1`                          | 有限正数；按当前编辑数值加减，不吸附到网格                             |
| `decrementLabel` / `incrementLabel` | `string`，`'Decrease'` / `'Increase'`  | 增减按钮语义名称，画面分别显示 `−` / `+`                                                 |
| `ref`                               | `(node: PInput) => void`               | 实际原生输入节点                                                       |

继承 TextField 的标签、大小、disabled、readOnly、样式、原生编辑及回调；`onInput` / `onChange` 仍接收字符串。输入固定为 `text`、`inputMode="decimal"`，保留光标和临时 `-`、`.`、`1e`，不使用浏览器 number 输入强制转换。只读与禁用禁止提交及步进；只读仍可聚焦复制。

Enter 或失焦提交；空白提交 `null`。解析接受点号十进制及完整指数，拒绝十六进制、非有限结果和未完成字符串。无效提交恢复已提交值，Escape 也恢复。非有限 `value` / `defaultValue` 或无效范围、步长属于配置错误。外部数值及范围变化同步文本；普通编辑不会被无关重渲染重置。受控调用方拒绝提交时恢复其最终值。

ArrowUp/ArrowDown 和增减按钮从有效编辑值开始步进；空或无效编辑从当前数值开始，当前为空时从 0 开始。浮点加减后以 15 位有效数字消除常见小数尾差，再夹紧；不承诺任意精度计算。按钮操作后聚焦输入。IME 合成期间及结束边界不提交、不步进；合成中的失焦不提交，后续显式提交生效。

原生输入公开 `role="spinbutton"` 和有限的 `aria-valuemin` / `aria-valuemax` / `aria-valuenow`。Tab 访问输入及两个独立增减按钮；没有额外焦点停靠。此组件只提供点号数字格式，无货币/分组/本地化解析框架，表单原生值仍是编辑字符串。

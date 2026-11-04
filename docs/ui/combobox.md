# Combobox 可编辑候选

`Combobox` 用于从本地候选中选择单个字符串值。输入框使用 `TextField`，候选在 `OverlayHost` 中显示；输入焦点保留在真实的原生输入框。需要在 `UIProvider` 内安装 `OverlayHost`。

<LiveExample example="uiCombobox" title="Combobox：本地候选过滤、选择与空结果" :height="340" />

```tsx
const [preset, setPreset] = createState<string | null>(null);
const [query, setQuery] = createState('');

<Combobox
  label="预设"
  options={[
    { value: 'compact', label: '紧凑布局' },
    { value: 'comfortable', label: '舒适布局' },
  ]}
  value={preset()}
  onValueChange={setPreset}
  inputValue={query()}
  onInputValueChange={setQuery}
/>;
```

## 文本、选中值与展开状态

`value` 是已提交候选的 `value`，允许 `null`；`inputValue` 是正在编辑的字符串。输入只通知 `onInputValueChange`，不会自动清空或提交选中值。选择候选分别请求更新这两个状态，并请求关闭浮层。外部改变 `value` 不会覆盖正在编辑的文字；需要同步显示时调用方同时更新 `inputValue`。

省略对应受控 prop 时使用内部状态，初始值分别取 `defaultValue`、`defaultInputValue`、`defaultOpen`。未提供默认输入文本时，使用初始选中候选的标签，否则为空字符串。受控状态始终以调用方回传值为准；回调是变更请求，不保证调用方接受。`undefined` 表示非受控，`null` 是受控的空选中值。

Escape 关闭并将文本恢复为当前选中值对应的最新标签，没有匹配候选时恢复为空。外部点击、Tab 或焦点离开关闭浮层并保留编辑文本，不提交候选。候选更新不会自动更改已提交的值；删除或禁用当前高亮候选会清除高亮。

## 过滤与操作

默认对标签和输入执行 NFKC 规范化、不区分大小写的子串匹配。`filter(option, input)` 可以替换过滤规则，返回 `true` 表示显示该项。禁用项可见，但不能高亮或提交。无结果时显示 `emptyText`，仍允许继续编辑。

方向键向下/向上打开候选并移动高亮，跳过禁用项，到首尾停止。Enter 仅在浮层打开且有高亮时提交；不接受任意自由文本。普通 Home、End、空格和左右方向键保持原生文字编辑行为；Alt+Home / Alt+End 在展开时定位首项/末项。Escape 取消编辑。IME 合成期间 Enter、Escape 和候选导航均不触发组件行为，文字编辑由原生输入处理。

默认显示清除按钮。清除请求将选中值设为 `null`、文本设为空，并关闭浮层，再触发 `onClear` 和恢复输入焦点。`clearable={false}` 隐藏按钮。`disabled` 和 `readOnly` 都阻止编辑、清除、选中和展开；只读输入仍可选择/复制已有文本。

## API

| 属性                               | 类型                              | 默认值 / 说明                           |
| ---------------------------------- | --------------------------------- | --------------------------------------- |
| `label`                            | `string`                          | 必填，非空辅助名称                      |
| `options`                          | `readonly ComboboxOption[]`       | 必填，本地候选                          |
| `value` / `defaultValue`           | `string \| null`                  | 初始 `null`                             |
| `onValueChange`                    | `(value: string \| null) => void` | 选中值变更请求                          |
| `inputValue` / `defaultInputValue` | `string`                          | 默认初始选中标签或 `''`                 |
| `onInputValueChange`               | `(text: string) => void`          | 输入文本变更请求                        |
| `open` / `defaultOpen`             | `boolean`                         | 初始 `false`                            |
| `onOpenChange`                     | `(open: boolean) => void`         | 展开变更请求                            |
| `filter`                           | `(option, input) => boolean`      | 标签子串匹配                            |
| `disabled` / `readOnly`            | `boolean`                         | `false`                                 |
| `clearable`                        | `boolean`                         | `true`                                  |
| `onClear`                          | `() => void`                      | 清除动作通知                            |
| `placeholder`                      | `string`                          | 输入占位文本                            |
| `emptyText`                        | `string`                          | `'No results'`                          |
| `size`                             | `'sm' \| 'md' \| 'lg'`            | `'md'`                                  |
| `popupWidth` / `popupHeight`       | `number`                          | `280` / `240`，CSS 像素，受可视空间约束 |
| `style`                            | `StyleValue<ViewStyles>`          | 根容器样式                              |
| `inputStyle`                       | `TextFieldProps['style']`         | 输入样式                                |
| `inputRef`                         | `(node: PInput) => void`          | 实际输入节点，可公开调用 `focus()`      |
| `ref`                              | View ref                          | 根布局节点                              |
| `onError`                          | `(error: unknown) => void`        | 浮层初始化/渲染失败                     |

`ComboboxOption` 包含 `value: string`、`label: string` 和可选 `disabled: boolean`。值必须非空且唯一，标签必须非空。候选身份使用稳定字符串值。

## 语义与限制

原生输入使用 `role="combobox"`、`aria-autocomplete="list"`、`aria-expanded`，浮层就绪后关联 `listbox`，高亮关联 `aria-activedescendant`。候选使用 `option`、`aria-selected`、`aria-disabled` 与集合位置信息，不增加候选项 Tab 停靠。Canvas 候选视觉与语义 DOM 同步，方向键会把高亮项滚入视区。

支持单选、本地同步候选；不提供多选、远程异步查询或大列表虚拟化。辅助技术关联有自动化语义验证，实际读屏器播报仍需在目标浏览器与读屏器组合中验收。

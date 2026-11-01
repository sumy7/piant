# TextField 与 Field

`TextField` 为 core 的原生 `Input` 提供主题外观、焦点及表单语义，`Field` 组合标签、说明与错误。两者均从 `@piant/ui` 根入口导入，并在 `UIProvider` 的延迟子树中创建；浏览器原生输入负责编辑、选区、剪贴板与输入法。

## TextField

<LiveExample example="uiTextField" title="TextField：受控密码、焦点、只读、禁用与主题切换" :height="660" />

独立 TextField 必须用 `aria-label` 或 `aria-labelledby` 提供非空语义名称。`placeholder` 仅作输入提示，不代替名称。

```tsx
import { createState } from '@piant/core';
import { TextField, UIProvider } from '@piant/ui';

function Content() {
  const [value, setValue] = createState('');
  return (
    <TextField
      aria-label="搜索项目"
      type="search"
      value={value()}
      onValueChange={setValue}
    />
  );
}

export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

`TextFieldProps` 提供以下属性：

| 属性                   | 类型与默认值                                                                               | 行为                                           |
| ---------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `size`                 | `TextFieldSize`：`'sm' \| 'md' \| 'lg'`，`'md'`                                            | 对应主题控件最小高度、内边距和字体             |
| `type`                 | `TextFieldType`：`'text' \| 'search' \| 'email' \| 'url' \| 'tel' \| 'password'`，`'text'` | 单行原生输入类型                               |
| `value`                | 可选 `string`                                                                              | 提供时为受控值，父级决定最终内容               |
| `defaultValue`         | 可选 `string`                                                                              | 非受控初始值；后续由原生输入持有内容           |
| `onValueChange`        | `(value: string, event: Event) => void`                                                    | 实际原生 input 事件到达时通知                  |
| `placeholder`          | 可选 `string`                                                                              | 空内容提示                                     |
| `disabled`、`readOnly` | `boolean`，`false`                                                                         | 禁用不参与 Tab；只读保留聚焦、选择和复制能力   |
| `invalid`              | `boolean`，`false`                                                                         | 错误外观及 `aria-invalid`；也受 Field 错误影响 |
| `style`                | core `InputStyles` 的 `StyleValue`                                                         | 在默认样式后覆盖布局、背景与原生输入字体       |
| `ref`                  | `(node: PInput) => void`                                                                   | 取得实际原生输入节点                           |

`ref` 返回公开 `PInput`：调用 `node.focus()`、`node.blur()` 控制焦点，通过 `node.element` 读取原生 `HTMLInputElement` 与选区。需要选择文本时使用浏览器支持的原生选区 API。TextField 不引入另一个输入 DOM 节点或额外编辑模型。

以下表单与语义属性转发到同一个原生输入：`id`、`name`、`autoComplete`、`inputMode`、`enterKeyHint`、`required`、`minLength`、`maxLength`、`pattern`、`aria-label`、`aria-labelledby`、`aria-describedby`、`aria-errormessage`。`name` 是表单字段名，语义名称通过 ARIA 或 Field 标签提供。该组件不提供 textarea、number、date 等输入类型。

`onInput`、`onChange` 保留 core 的 `(value, event)` 签名。还可转发 `onFocus`、`onBlur`、`onBeforeInput`、`onKeyDown`、`onKeyUp`、`onCompositionStart`、`onCompositionUpdate`、`onCompositionEnd`、`onCopy`、`onCut`、`onPaste`、`onSelect`。`onValueChange` 与 `onInput` 在同一个真实 input 事件中各调用一次；`onChange` 对应原生 change，不用于重复派发 input。

## Field

<LiveExample example="uiField" title="Field：标签聚焦、说明、必填与错误关联" :height="440" />

Field 使用延迟 `children` 安装字段上下文；工厂只执行一次，每个 Field 只包含一个 TextField。工厂内的 JSX 属性 getter 与控制流仍可响应式更新，标签、说明或错误变化不会重新创建原生输入。点击标签可聚焦其原生输入。嵌套 Field 使用各自上下文，不共享标签或错误关联。

```tsx
<Field label="邮箱" description="用于接收通知" required>
  {() => <TextField type="email" name="email" autoComplete="email" />}
</Field>
```

`FieldProps`：

| 属性                                           | 类型                | 行为                                   |
| ---------------------------------------------- | ------------------- | -------------------------------------- |
| `label`                                        | 必填 `string`       | Canvas 标签及真实 DOM label            |
| `description`                                  | 可选 `string`       | Canvas 与 DOM 说明                     |
| `error`                                        | 可选 `string`       | Canvas 与 DOM 错误；有内容时使字段无效 |
| `required`                                     | 可选 `boolean`      | 与 TextField 的 required 取逻辑或      |
| `children`                                     | `() => JSX.Element` | 延迟创建唯一 TextField                 |
| `style`、`ref`                                 | core `View` 属性    | 外层字段布局                           |
| `labelStyle`、`descriptionStyle`、`errorStyle` | core `Text` 样式    | 对应 Canvas 文本样式                   |

Field 创建唯一标签、说明和错误 ID，让 Canvas 文本对应真实 DOM 内容。TextField 的无效状态为显式 `invalid` 或当前 Field 错误的逻辑或。错误存在时同时通过 `aria-describedby` 和 `aria-errormessage` 引用；错误清除后移除相应引用。调用方附加的描述 ID 继续保留，应用须确保它们指向可读内容。

`required` 与长度/格式约束是原生表单约束，不自动生成业务错误。示例中的“修改 defaultValue”不会重置已经编辑的非受控内容；“校验名称”读取最新值并设置 `error`；应用可在提交或其他业务时机做自己的校验。

## 受控值、选区与合成输入

受控模式通过 `value` 和 `onValueChange` 配对。回调接收浏览器实际输入值，父级可提交或转换；省略 `value` 时，`defaultValue` 只初始化非受控内容。主题、密度与字号变化应保留同一个原生输入、焦点和当前内容。

Core 仅在支持选区的文本类输入中读取数字 `selectionStart` / `selectionEnd` 并在受控值同步后保留、限制到新长度；不支持该 API 的类型（如 email）不会强行调用选区方法。选择与光标的最终表现也受浏览器和输入类型约束。

合成输入期间保留浏览器正在编辑的内容，等待 compositionend 及最终 input 序列结束后同步最新受控值，不合成额外 input。合成期间 Enter/Escape 不进入业务键盘回调，避免把确认候选词当成提交或关闭。原生事件顺序、候选窗口和输入法平台行为需在目标浏览器与系统实际验证；合成事件测试不能代替真实输入法验收。

## 主题、焦点与验证边界

TextField 使用语义背景、边框、文字、圆角和间距，原生字体从同一主题 tokens 写入；占位文字使用 `colors.textMuted`，运行时更新仅作用于所属输入实例。焦点、无效、只读和禁用状态分别表达；自定义样式后需检查文字和焦点对比度，以及窄容器与放大字号下的尺寸。

Field 的 DOM 标签/说明/错误与 TextField 的真实输入共同表达语义，不创建透明的第二个输入代理。浏览器键盘与 DOM/可访问性树检查属于工程证据；VoiceOver 等辅助技术的朗读、导航和系统输入法候选行为须单独验收，不能由自动化测试或构建成功推断。焦点作用域规则见[焦点与语义桥接](/ui/focus)。

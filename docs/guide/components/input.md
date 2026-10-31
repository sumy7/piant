# Input

`Input` 将原生 HTML `<input>` 绑定到 Canvas 场景，用于单行输入。Yoga 负责布局，浏览器负责编辑、选区、剪贴板和 IME，需要 DOM 环境。

## 受控输入

将 `value` 绑定到状态，并在 `onInput` 中写回新值。示例通过公开样式设置文字外观，通过 `PInput.focus()` 聚焦，不需要访问内部字段。

<LiveExample example="input" title="受控输入、文字样式与焦点" :height="300" />

相同值不会重复写入原生 input。不同的外部值会同步到 DOM，并在支持选区的输入类型上保留选区数字位置，超出新字符串长度的部分会截断；这不等同于任意文本替换后的语义光标映射。非组合期的 input 回调结束后同步最新受控值；若需要接受本次编辑，应在 `onInput` 中更新状态，未写回时仍以受控值为准。

## 非受控输入

只传 `defaultValue` 时，后续编辑由原生输入框保管；事件仍可读取当前值。

<LiveExample example="inputDefault" title="非受控输入" :height="160" />

`defaultValue` 只在创建节点时读取。两者同时存在时，`value` 的初始同步覆盖 `defaultValue`。

## 文字样式与原生属性

`style` 接受 `StyleValue<InputStyles>`，包含 View/Yoga 样式及以下原生文字 CSS：

- `fontFamily`、`fontSize`、`fontWeight`、`fontStyle`。
- `lineHeight`：像素数字、`'normal'` 或如 `'1.5x'` 的倍数。
- `letterSpacing`、`color`、`caretColor`、`textAlign`。

数字字号、行高和字间距使用逻辑像素。移除文字样式后恢复对应的默认或继承行为。Yoga 计算后的 padding 与 border 宽度会成为原生 input 的文字内边距，使文字与 Canvas 边框对齐。背景、边框和布局仍由场景节点绘制。

```tsx
<Input
  aria-label="显示名称"
  readOnly={false}
  autoComplete="name"
  style={{
    width: 280,
    height: 44,
    padding: 8,
    borderWidth: 1,
    borderColor: '#64748b',
    fontFamily: 'system-ui',
    fontSize: 18,
    color: '#0f172a',
    caretColor: '#1d4ed8',
  }}
/>
```

`readOnly` 使用原生只读行为：仍可聚焦、选择和复制，不能通过普通编辑修改内容。`disabled` 使用原生禁用行为，不参与正常交互和焦点导航。Input 不统一拦截复制、剪切、粘贴或撤销快捷键。

## IME 与键盘业务动作

组合输入期间，外部 `value` 更新不会覆写浏览器正在编辑的草稿。`compositionend` 后等待当前事件轮次收尾，再以最新受控值进行同步；非受控输入保留浏览器最终值。`onInput` 只跟随实际 input 事件，不因 compositionend 额外伪造通知。

IME 使用 Enter 确认候选、Escape 取消候选时，Input 不调用对应业务 `onKeyDown` / `onKeyUp`，并停止这些按键继续冒泡，但不阻止浏览器的原生默认动作。组合状态、`KeyboardEvent.isComposing` 和兼容边界值 `keyCode === 229` 均参与判断。

目标节点不能撤销已经执行的祖先捕获监听。表单、全局快捷键和浮层若在 capture 阶段消费按键，必须主动检查：

`@piant/hooks` 的 `useKey` 默认执行此检查，同一元素上的监听也能识别组合结束按键。

```ts
import { isComposingInput } from '@piant/core';

function handleShortcut(event: KeyboardEvent) {
  if (isComposingInput(event)) return;
  if (event.key === 'Escape') closePanel();
}
```

组合回调用于观察原生会话；不要用它们自行重建浏览器编辑器或假定所有平台具有相同的完整事件顺序。

## Props

所有属性均可选；`InputProps`、`InputStyles` 和 `PInput` 可从 `@piant/core` 导入。

| 属性                                                                        | 类型 / 行为                                                           |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `style`                                                                     | `StyleValue<InputStyles>`                                             |
| `value` / `defaultValue`                                                    | `string`；受控同步 / 仅初始化                                         |
| `placeholder` / `type`                                                      | `string`；默认 `''` / `'text'`                                        |
| `disabled` / `readOnly` / `required`                                        | 原生布尔属性                                                          |
| `id` / `name` / `autoComplete` / `inputMode` / `enterKeyHint`               | 原生标识与输入提示                                                    |
| `minLength` / `maxLength` / `min` / `max` / `step` / `pattern`              | 原生输入限制，具体行为由 input 类型决定                               |
| `tabIndex`                                                                  | 原生焦点导航索引；与 UI 焦点注册组合时由注册表管理顺序                |
| `role`                                                                      | 显式角色；通常保留 input 类型的原生语义                               |
| `aria-label` / `aria-labelledby` / `aria-describedby` / `aria-errormessage` | 名称、描述及错误关联                                                  |
| `aria-invalid` / `aria-required` / `aria-expanded`                          | 语义状态                                                              |
| `aria-controls` / `aria-activedescendant` / `aria-autocomplete`             | 与外部控件的语义关联，不自动实现组合控件行为                          |
| `onInput` / `onChange`                                                      | `(value: string, event: Event) => void`                               |
| `onBeforeInput`                                                             | `(event: InputEvent) => void`；是否可取消取决于浏览器事件             |
| `onFocus` / `onBlur`                                                        | `(event: FocusEvent) => void`                                         |
| `onKeyDown` / `onKeyUp`                                                     | `(event: KeyboardEvent) => void`；IME Enter/Escape 不进入业务回调     |
| `onCompositionStart` / `onCompositionUpdate` / `onCompositionEnd`           | `(event: CompositionEvent) => void`                                   |
| `onCopy` / `onCut` / `onPaste`                                              | `(event: ClipboardEvent) => void`；保留原生默认行为，除非回调显式取消 |
| `onSelect`                                                                  | `(event: Event) => void`                                              |
| `ref`                                                                       | 接收稳定的 `PInput` 节点                                              |

这里只支持列出的原生属性，不透传任意 HTML 属性，也不包含 `children` 或 `PixiEventProps`。ARIA 引用的目标元素由应用提供，名称和关联不会自动生成。

## ref、几何与清理

- `ref` 在创建时同步调用，此时尚未完成挂载。聚焦可放到用户事件或 `onMount`；后者也不保证布局已完成。
- `node.element` 是实际 `HTMLInputElement`，可读取原生 value、选区和其他浏览器能力；`node.focus(options?)`、`node.blur()` 转发焦点操作，`node.isComposing` 提供当前组合状态。
- `node.domElement` 与 `node.element` 对应同一输入框，可交给 UI 的[焦点注册](/ui/focus#复用原生-input)。不要额外创建第二个代理；值、只读和禁用状态由 Input props 管理。
- DOM 绑定跟随 Canvas 的位置、缩放和滚动，并裁剪到渲染视口及 Piant `overflow: 'hidden'` 祖先；包括 ScrollView 仅更新变换的滚动。圆角使用凸多边形采样，误差上限为 0.25 节点局部像素，随后随变换缩放。任意自定义 Pixi mask、滤镜以及宿主网页的旋转、倾斜或透视变换不在此保证范围内。
- 组件的同步副作用、DOM 事件和裁剪监听随 owner 或节点销毁清理。调用方在 ref 中另加的监听仍需自行 `onCleanup`。

详见：[Input API](/reference/components#input)、[DOM 元素绑定](/reference/renderer#attachdomelement)、[生命周期](/guide/lifecycle)。

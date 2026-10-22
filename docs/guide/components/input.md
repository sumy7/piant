# Input

`Input` 通过 PixiJS 的 `DOMContainer` 将原生 HTML `<input>` 放入场景，用于单行文本输入。布局由 Yoga 计算，编辑、选区和输入事件由浏览器处理，需要浏览器 DOM 环境。

## 受控输入

将 `value` 绑定到状态，并在 `onInput` 中写回新值。输入时观察当前值，修改后移开焦点可观察 `change`；按钮会清空状态并通过 `ref` 聚焦输入框。

<LiveExample example="input" title="受控输入与事件" :height="300" />

`value` 的响应式变化会同步到原生输入框。组件不会在每次输入事件后自动回滚 DOM 值；需要持续同步时，应在 `onInput` 中更新状态。

## 非受控输入

只传 `defaultValue` 时，后续编辑由原生输入框保管；事件仍可用于读取当前值。

<LiveExample example="inputDefault" title="非受控输入" :height="160" />

`defaultValue` 只在创建节点时读取，之后修改它不会更新输入框。同时传入 `value` 和 `defaultValue` 时，`value` 的初始同步会覆盖 `defaultValue`，建议按用途选择其中一个。

## Props

所有属性均可选；`InputProps` 可从 `@piant/core` 导入。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `style` | `StyleValue<ViewStyles>` | — | 节点的布局与视觉样式；支持样式对象、数组和 StyleSheet 样式 |
| `value` | `string` | — | 同步到原生输入框的值，可响应式更新 |
| `defaultValue` | `string` | — | 仅初始化时使用的值 |
| `placeholder` | `string` | `''` | 原生占位文字 |
| `type` | `string` | `'text'` | 原生 input 类型，如 `'password'`；仍以字符串读写值 |
| `disabled` | `boolean` | `false` | 禁用原生输入框 |
| `onInput` | `(value: string, event: Event) => void` | — | 原生 `input` 事件；第一个参数是当前值 |
| `onChange` | `(value: string, event: Event) => void` | — | 原生 `change` 事件，触发时机由浏览器和 input 类型决定 |
| `onFocus` | `(event: FocusEvent) => void` | — | 原生 `focus` 事件 |
| `onBlur` | `(event: FocusEvent) => void` | — | 原生 `blur` 事件 |
| `ref` | `InputProps['ref']` | — | 创建时接收底层 `PInput` 节点；可通过 `node._inputElement` 访问 `HTMLInputElement` |

## ref 与限制

- `ref` 在节点创建时同步调用，此时尚未插入渲染容器，也未完成布局。聚焦等操作可在 `onMount` 或用户事件中执行；`onMount` 时也不保证布局已完成。
- `PInput` 没有从包入口直接导出；使用 `ref` 参数的自动推导，或通过 `InputProps['ref']` 引用回调类型。`_inputElement` 是当前底层字段，没有独立的公开 `focus()` 封装。
- `style` 接受 `ViewStyles`，不会把文本样式转换为 input 的 CSS。上面的示例通过 `ref` 设置原生输入框的字号、颜色和 `aria-label`。
- 当前 Props 不包含 `children`、`readOnly`、`maxLength`、`onKeyDown` 或任意 HTML 属性透传，也不包含 `PixiEventProps`。这里的回调接收原生 DOM 事件；`onInput` / `onChange` 的参数顺序与 Pixi 事件不同。
- 组件在响应式 owner 清理时移除自己注册的四个 DOM 监听器；`ref` 中额外添加的监听器应由调用方通过 `onCleanup` 清理。节点树与宿主资源的释放边界见 [render](/reference/renderer#render)。

底层 DOM 与场景的集成行为还受 [PixiJS DOMContainer](https://pixijs.download/release/docs/scene.DOMContainer.html) 约束；复杂裁剪、滤镜等效果应在实际浏览器中核验。将画布嵌入带定位的容器时，也需检查原生输入框是否对齐；本站的定位补偿见[示例宿主说明](https://github.com/sumy7/piant/blob/main/docs/.vitepress/README.md)。

详见：[Input API](/reference/components#input)、[生命周期](/guide/lifecycle)。

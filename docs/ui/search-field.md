# SearchField

`SearchField` 从 `@piant/ui` 导出，在 `UIProvider` 的延迟子树中创建。它复用 [TextField](./text-field) 的原生输入、Field 标签、编辑、选区及主题样式，增加显式搜索提交和清除按钮。

<LiveExample example="uiSearchField" title="SearchField：中文输入、提交、清除和只读" :height="260" />

```tsx
<SearchField
  aria-label="搜索图层"
  value={query()}
  onValueChange={setQuery}
  onSearch={(text) => runSearch(text)}
  clearLabel="清除搜索"
/>
```

| 属性                    | 类型 / 默认值                                   | 说明                                                   |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `value`                 | `string`，可选                                  | 提供时受控，由调用方决定最终文本                       |
| `defaultValue`          | `string`，`''`                                  | 非受控初始文本                                         |
| `onValueChange`         | `(value: string, event: Event) => void`         | 输入及组件清除时通知；清除使用合成的 `input` Event     |
| `onSearch`              | `(value: string, event: KeyboardEvent) => void` | Enter 同步提交当前文本，包括空文本；不防抖             |
| `onClear`               | `() => void`                                    | 非空且允许编辑时，按钮或 Escape 请求清除后通知         |
| `clearLabel`            | `string`，`'Clear search'`                      | 可见清除按钮文字及语义名称                             |
| `disabled` / `readOnly` | `boolean`，`false`                              | 禁用禁止搜索和编辑；只读允许搜索、选择和复制，禁止清除 |
| `ref`                   | `(node: PInput) => void`                        | 原生输入节点，可调用 `focus()` / `blur()`              |

其余属性见 `TextFieldProps`，`type` 固定为 `text`，语义为 `searchbox`，`enterKeyHint` 默认 `search`；`style` 应用于原生输入。独立使用须提供 `aria-label` 或 `aria-labelledby`，也可放入 Field。输入和清除按钮各有实际键盘焦点；按钮空值时禁用。清除后焦点返回原输入；受控调用方拒绝清除时文本保持不变。如果调用方在 `onKeyDown`、`onValueChange` 或 `onClear` 中同步卸载组件或销毁输入，本次操作会停止后续通知和焦点恢复。

使用原生文本输入而非浏览器 search 输入，避免浏览器在 IME 合成中执行 Escape 默认清除；清除行为由组件显式管理。Enter 触发搜索，Escape 仅在非空可编辑时清除。自定义 `onKeyDown` 先执行，可用 `preventDefault()` 接管快捷键。IME 合成及结束边界的 Enter/Escape 由 core 保护，不触发搜索或清除。`onInput` 只对应真实原生输入，组件清除不会伪造原生编辑或 change 事件。原生输入支持平台输入法和辅助技术；Canvas 图形不是额外的文本编辑器。

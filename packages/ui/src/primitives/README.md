# 共享交互原语

公共导出统一经 `@piant/ui` 根入口提供，不开放本目录的子路径。

- `createControllableState`：`value === undefined` 时使用内部状态；`defaultValue` 必填且只读取一次。受控 setter 只通知，父级提交最终值。适配 `value`、`checked`、`open` 时使用 getter 保留最新值与回调。
- `createPressable`：为已有 `PNode` 提供 `hovered`、`pressed`、`disabled` accessor 和幂等 `dispose`。仅处理指针按压，不包含视觉、键盘、焦点或语义。
- `createFocusable`：注册 Canvas 语义代理或已有原生 DOM 元素，提供焦点、focus-visible、键盘按压和激活行为。
- `createRovingFocusGroup`：组内保留单个 Tab 停靠项，使用箭头/Home/End 移动焦点。
- `useUIFocus`：读取所属 provider 的焦点作用域，观察当前焦点或聚焦首个可用项。

生命周期使用 core 公共能力；交互占用与本绑定监听成对释放，节点销毁和所属 owner 清理均可结束绑定。不得深度导入 core 内部模块。具体契约、取消策略与示例见[交互文档](../../../../docs/ui/interactions.md)。

焦点作用域由 `UIProvider` 管理，嵌套默认继承，`focusScope="isolate"` 独立。Canvas/原生 Input 接入、roving 规则与读屏验证边界见[焦点文档](../../../../docs/ui/focus.md)。

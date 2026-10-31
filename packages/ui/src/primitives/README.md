# 共享交互原语

公共导出统一经 `@piant/ui` 根入口提供，不开放本目录的子路径。

- `createControllableState`：`value === undefined` 时使用内部状态；`defaultValue` 必填且只读取一次。受控 setter 只通知，父级提交最终值。适配 `value`、`checked`、`open` 时使用 getter 保留最新值与回调。
- `createPressable`：为已有 `PNode` 提供 `hovered`、`pressed`、`disabled` accessor 和幂等 `dispose`。仅处理指针按压，不包含视觉、键盘、焦点或语义。

生命周期使用 core 公共能力；交互占用与本绑定监听成对释放，节点销毁和所属 owner 清理均可结束绑定。不得深度导入 core 内部模块。具体契约、取消策略与示例见[交互文档](../../../../docs/ui/interactions.md)。

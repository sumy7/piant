# 文档编辑

打开编辑弹窗，修改文档名称和可见性。保存后可以在通知中撤销，也可以进入归档确认。所有操作都作用于当前示例。

<LiveExample example="uiOverlayWorkflow" title="文档工作流：编辑、选择、嵌套操作、确认与通知" :height="820" hide-source />

## 试一试

1. 点“示例 编辑文档”，输入名称。在“示例 可见性”中用方向键浏览，按 Enter 提交。
2. 通过“示例 更多操作”复制文档，或打开“示例 编辑备注”。按 Escape 先关闭备注，返回编辑弹窗。
3. 点“示例 保存并关闭”，再用通知中的“示例 撤销保存”还原。要归档时，进入“示例 归档文档”并明确确认。

## 用到的组件

- [Dialog](/ui/dialog) 和 [TextField](/ui/text-field) 承载编辑表单。
- [Menu](/ui/menu)、[Select](/ui/select)、[Popover](/ui/popover) 和 [Tooltip](/ui/tooltip) 在表单中提供操作、选择、备注和说明。
- [AlertDialog](/ui/alert-dialog) 负责归档确认，[Toast](/ui/toast) 提供保存反馈和撤销。

[打开独立工作流](/examples/ui-gallery/workflow.html)可在两个 Canvas 中分别操作。同一组设置、编辑和表单组件也用于[设置面板](/ui/gallery)。

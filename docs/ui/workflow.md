# 浮层组合工作流

这个场景把原生输入、Dialog、Menu、Select、Popover、Tooltip、AlertDialog 和 Toast 组成一条本地文档编辑流程。在线示例与仓库 Gallery 的工作流入口复用 `OverlayWorkflow`，用于观察真实组合行为；保存、归档和撤销都只修改本地状态，不调用服务或持久化文档。

<LiveExample example="uiOverlayWorkflow" title="文档工作流：编辑、选择、嵌套操作、确认与通知" :height="820" />

## 操作路径

1. 在“示例 背景草稿”输入内容，再打开“示例 编辑文档”。焦点进入“示例 文档名称”，背景原生输入受当前实例的 Dialog 限制。
2. 在“示例 可见性”中用方向键预览，Enter / Space 提交。Escape 或 Tab 取消未提交候选；“已归档”可被发现但不能选择。外部关闭手势会被菜单/选择面板消费，避免同时触发背景动作。
3. 打开“示例 更多操作”，复制文档会修改当前草稿并增加菜单计数，标记审阅只增加本地计数；禁用的永久删除不会执行。通过“示例 编辑备注”进入带原生输入的 Popover，关闭返回父层；“示例 帮助”提供不抢焦点的文字 Tooltip。
4. “示例 取消编辑”、Escape 或允许的 Dialog 外部关闭会还原未保存的名称、可见性和备注。“示例 保存并关闭”提交当前名称等草稿，增加保存次数并显示根通知。
5. 明确激活通知中的“示例 撤销保存”恢复上一次保存值并增加撤销计数；保存次数保留为已发生的动作数。保存通知采用同一个 ID，后一次保存替换通知及撤销回调，不累积过期撤销操作。
6. 在编辑器里打开“示例 归档文档”，初始焦点进入“示例 取消归档”。取消或 Escape 不归档；明确确认后只增加一次归档计数，关闭确认和编辑器，并显示持久通知。

通知默认持续显示，根 Viewport 位于应用自己的树中。编辑器打开时，根通知仍遵守父模态范围，不能通过通知按钮绕过 Dialog。需要继续操作通知时先关闭编辑器。

## 外观、焦点与卸载

“切换组合场景外观”在浅色/舒适/100% 与深色/紧凑/200% 间切换，另有减少动画与卸载/重新挂载控制。背景控件在所属模态打开时按既有范围受到限制；仓库工作流页面还可从 Canvas 之外的宿主控件改变外观和容器尺寸。

打开期间的主题属性更新应保留同一个原生输入、焦点和选区；内容较长或字号较大时通过 Dialog 的滚动正文到达控件，操作区独立换行。关闭子层回到父层的安全位置，关闭父层恢复当前实例的触发器。卸载场景会清理所属输入、浮层、通知、监听和 owner；重新挂载创建新状态，不复用旧节点或旧动作回调。

`OverlayWorkflow` 自带隔离 UIProvider、OverlayHost 和 ToastProvider。调用方传入 `name`、`colorMode`、`density`、`fontScale`、`reducedMotion`，并可用 `onStateChange` 观察只读快照：`background`、`draftName`、`savedName`、`visibility`、`saves`、`archives`、`menuActions`、`undoCount`。快照回调不参与普通业务回调的依赖追踪；应用包装属性时应保留 getter。

## 组件契约

| 组合部件    | 对应指南                               | 场景中的职责                         |
| ----------- | -------------------------------------- | ------------------------------------ |
| TextField   | [文本字段](/ui/text-field)             | 背景、名称和备注的真实原生输入       |
| Dialog      | [Dialog](/ui/dialogs#dialog)           | 编辑器模态、正文滚动、初始焦点及恢复 |
| Menu        | [Menu](/ui/menu-select#menu)           | 明确动作、禁用项发现、父层内导航     |
| Select      | [Select](/ui/menu-select#select)       | 候选浏览与值提交分离                 |
| Popover     | [Popover](/ui/popovers#popover)        | 带输入的非模态备注面板               |
| Tooltip     | [Tooltip](/ui/popovers#tooltip)        | 悬停/聚焦文字说明，不承载操作        |
| AlertDialog | [AlertDialog](/ui/dialogs#alertdialog) | 取消优先、显式确认归档               |
| Toast       | [Toast](/ui/toast)                     | 持久反馈、显式撤销与所属实例清理     |

## 验证与边界

独立组件指南定义 API 与支持范围；这个场景用于组合验收，不代替每个组件的独立测试。两条 Gallery 路径分别覆盖[设置面板](/ui/gallery)和本页的浮层流程，仓库工作流提供独立实例、窄容器、外观及挂载控制；可以分别修改状态并检查一个实例的关闭、输入和清理不会影响另一个实例。

组件/文档测试验证状态、回调、语义关联和生命周期，生产浏览器检查实际 Canvas/DOM 层级、指针、键盘、缩放及卸载。构建通过不等于浏览器运行通过；本地 tarball 验证也不等于 registry 发布验证。工程入口和证据采集方法见[浏览器测试说明](https://github.com/sumy7/piant/blob/main/packages/ui/browser-tests/README.md)。

Dialog 的模态范围属于当前 Canvas 实例，其他页面应用仍可操作，因此使用 `aria-modal="false"`，不声称整个 Document 的 APG 模态行为。Toast 不逃离祖先裁剪或模态交互约束。操作系统中文候选窗口和 VoiceOver 的实际朗读、导航、消息顺序尚需分别验收；自动化 composition、DOM 或 AX 结果不表示这些项目已通过。具体边界仍以各组件指南为准。

内容溢出时，编辑区会提供位于键盘顺序末尾的独立滚动停靠项。可用方向键、Page Up / Page Down、Home / End 滚动，再用 Shift+Tab 回到可见控件。有固定底部操作区的 Dialog 会先经过“保存并关闭”和“取消编辑”，随后回到内容区；不需要依靠鼠标才能到达被裁剪的操作。

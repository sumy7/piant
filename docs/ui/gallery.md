# UI Gallery 设置面板

Gallery 提供设置面板与[浮层组合工作流](/ui/workflow)两条可操作路径。设置面板用于编辑文本、调整选择项、校验字段并查看保存反馈；工作流用于编辑文档、嵌套浮层、明确确认和持久通知。在线示例与仓库中的 `examples/ui-gallery` 分别复用相同的场景组件。

<LiveExample example="uiGallery" title="设置面板：编辑、校验、选择与保存反馈" :height="1700" />

上方外观按钮在浅色/舒适/100% 与深色/紧凑/200% 之间切换，另一个按钮切换减少动画；面板内的设置值保持独立。保存只演示本地状态与反馈，不连接账户、网络接口或真实设置服务。

## 组件索引

每个公开组件都有独立在线示例，便于分别操作并阅读源码。Gallery 用于观察组合行为，完整属性与边界以对应指南为准。

| 组件                          | API 与独立在线示例                            | 重点                           |
| ----------------------------- | --------------------------------------------- | ------------------------------ |
| Stack                         | [排列与换行](/ui/foundations#stack)           | 方向、间距、对齐               |
| Surface                       | [面板与主题](/ui/foundations#surface)         | 背景、圆角、内边距             |
| Separator                     | [横纵分隔线](/ui/foundations#separator)       | 方向、线宽与长度               |
| Spacer                        | [主轴留白](/ui/introduction#使用-spacer)      | 固定或填充剩余空间             |
| Icon                          | [图形与尺寸](/ui/foundations#icon)            | 资产/绘图、缩放与所有权        |
| Badge                         | [文字状态标签](/ui/foundations#badge)         | 真实文字测量、长标签           |
| ProgressBar                   | [进度与模式切换](/ui/foundations#progressbar) | 确定/不确定状态、边界          |
| Spinner                       | [加载反馈](/ui/foundations#spinner)           | 尺寸、暂停与减少动画           |
| Button                        | [文字操作](/ui/buttons#button)                | 指针/键盘、禁用与加载          |
| IconButton                    | [图标操作](/ui/buttons#iconbutton)            | 语义名称与尺寸保留             |
| TextField                     | [原生文本编辑](/ui/text-field#textfield)      | 受控、只读/禁用、合成输入      |
| Field                         | [标签、说明与错误](/ui/text-field#field)      | 标签聚焦、描述 ID 关联         |
| Checkbox                      | [独立选择与混合态](/ui/selection#checkbox)    | 受控/非受控、Space             |
| ToggleSwitch                  | [布尔开关](/ui/selection#toggleswitch)        | 稳定名称、禁用                 |
| RadioGroup                    | [组内单选](/ui/selection#radiogroup)          | 方向键、动态选项、单 Tab 停靠  |
| Slider                        | [范围滑块](/ui/slider)                        | 小数步长、拖动、键盘与受控值   |
| Tabs                          | [页面切换](/ui/containers#tabs)               | 候选导航、选择与保留策略       |
| Collapsible                   | [独立折叠](/ui/containers#collapsible)        | 展开/折叠、焦点与生命周期      |
| Accordion                     | [分组折叠](/ui/containers#accordion)          | 单开/多开、稳定 key 与导航     |
| Dialog                        | [表单与嵌套弹窗](/ui/dialogs#dialog)          | 原生输入、受控关闭、焦点恢复   |
| AlertDialog                   | [明确取消与确认](/ui/dialogs#alertdialog)     | 取消优先、遮罩阻止、业务动作   |
| Popover                       | [锚定交互面板](/ui/popovers#popover)          | 非模态、原生输入与离开导航     |
| Tooltip                       | [文字提示](/ui/popovers#tooltip)              | 悬停/聚焦、继续阅读与关闭      |
| Menu                          | [动作菜单](/ui/menu-select#menu)              | 动作、禁用项发现与字符导航     |
| Select                        | [单值选择](/ui/menu-select#select)            | 预览/提交、动态选项和受控值    |
| ToastProvider / ToastViewport | [通知队列与展示](/ui/toast)                   | 排队、更新、持久操作与计时暂停 |

## 运行仓库 Gallery

仓库要求 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。运行命令前请切换到兼容的 Node.js 版本。

```bash
pnpm --filter @piant/core build
pnpm --filter @piant/ui build
pnpm --filter @piant/examples-ui-gallery dev
```

打开终端显示的本地地址。仓库 Gallery 同时挂载 A/B 两个 Canvas，提供原生宿主按钮来分别切换主题、密度、200% 字号、窄容器及挂载状态。可移除 B、卸载或重新挂载 A，检查一个实例的编辑和资源清理不会影响另一个实例。

在线设置面板保留单个面板与主题控制，并提供资料编辑与重置确认弹窗；[浮层工作流](/ui/workflow)提供带原生输入的 Dialog、Menu/Select/Popover/Tooltip、AlertDialog 和根 Toast。仓库的 `/workflow.html` 入口用于双实例、宿主缩窄、卸载和重挂载检查。各部件的独立契约仍见上方组件指南。

## 验收操作

这些步骤用于在目标环境收集证据，不代表所有浏览器与辅助技术都已通过：

1. 在 A/B 分别编辑字段和选择项，校验错误、清除错误并触发保存反馈；确认另一实例的值不变。
2. 分别组合明暗主题、密度、200% 字号和窄容器；检查长标签、换行、图标、分隔线、进度、加载标识与原生输入的位置和尺寸。
3. 用 Tab/Shift+Tab 进出控件，Space 操作复选框/开关，Enter/Space 操作按钮，方向键与 Home/End 操作单选组；检查禁用与加载期间不提交，焦点反馈可见。
4. 聚焦文本后切换外观，检查同一个原生输入的值、焦点与数字选区；实际使用目标系统输入法编辑，区分候选确认与业务 Enter。
5. 操作标签聚焦，核对可访问性树中的名称、角色、状态、组归属和描述/错误关联；另行使用目标读屏软件验收朗读与导航。
6. 反复保存、减少动画、卸载和重挂载；检查没有残留 Canvas、输入 DOM、焦点代理、监听或动画，并确认仍挂载的实例继续工作。
7. 走完浮层工作流中的保存、撤销和归档路径；确认导航候选不提前提交、取消不执行业务动作，子层关闭回到父层，根通知不能绕过模态限制。

## 工程检查与证据边界

```bash
pnpm --filter @piant/examples-ui-gallery typecheck
pnpm --filter @piant/examples-ui-gallery build
pnpm --filter @piant/monorepo-docs typecheck
pnpm --filter @piant/monorepo-docs test
pnpm docs:build
pnpm --filter @piant/ui verify:package
```

类型检查、组件测试、在线示例编译/运行测试与生产构建检查工程链路。`verify:package` 使用版本预演后的本地 tarball 进行隔离消费验证，不等同于 registry 发布验证。浏览器截图、操作日志与 DOM/AX 检查提供相应场景的证据，不能由构建成功推断视觉通过。

Canvas/DOM 的组合仍需要目标平台验证。自动化的合成事件不代表真实系统输入法候选流程，DOM 或可访问性树正确也不代表 VoiceOver 等辅助技术的实际朗读与导航已验收。具体输入与焦点边界见[文本字段](/ui/text-field)和[焦点与语义桥接](/ui/focus)。

搜索图层、数字参数、可编辑候选与拖动分栏的组合参见[工具面板](/ui/tool-panel)。

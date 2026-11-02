# 工具面板

<LiveExample example="uiToolPanel" title="搜索图层、数值缩放、分栏与输出预设" :height="700" />

此面板复用 [SearchField](/ui/search-field)、[NumberField](/ui/number-field)、[SplitPane](/ui/split-pane) 与 [Combobox](/ui/combobox)：搜索改变图层列表，Enter 记录搜索提交；数字缩放在提交后更新参数；分栏控制列表与检查器空间；预设输入筛选本地候选，选择后更新值。重置参数不重置搜索或分栏。

`examples/ui-gallery/src/ToolPanel.ts` 是在线文档与独立浏览器 fixture 共用的实现。所有导入来自公开包入口。状态保留在当前组件生命周期，卸载后释放输入、浮层及拖动监听，重新挂载恢复初始值。

窄容器中两侧内容各自在自己的区域滚动，数字输入允许临时字符串。在候选打开时 Escape 取消编辑并恢复当前已选标签；搜索框 Escape 清除当前关键词。各操作只影响所属组件。主题切换同时验证暗色、紧凑密度与放大字号；实际视图可用空间决定可见内容。

浏览器工程验证使用真实 Canvas、原生编辑、CDP 合成输入和 Chrome 可访问性树。它们分别记录键盘与语义结果；操作系统中文候选窗口和 VoiceOver 朗读需要单独的人工设备验收。

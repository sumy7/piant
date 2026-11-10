# 设置面板

在一个页面中编辑显示名称、切换提醒并选择导出质量。尝试输入过短的名称并保存，观察字段提示。改用有效名称保存，再切换外观，看看当前设置如何保留。

<LiveExample example="uiGallery" title="设置面板：编辑、校验、选择与保存反馈" :height="1700" hide-source />

## 用到的组件

- [Stack](/ui/stack) 和 [Surface](/ui/surface) 组织面板。
- [Field](/ui/field) 和 [TextField](/ui/text-field) 提供名称输入及校验提示。
- [ToggleSwitch](/ui/toggle-switch) 和 [RadioGroup](/ui/radio-group) 修改偏好。
- [Button](/ui/button)、[Badge](/ui/badge) 和 [ProgressBar](/ui/progress-bar) 提交并显示保存状态。

## 在本地运行

在仓库根目录安装依赖后启动 Gallery：

```sh
pnpm install
pnpm --filter @piant/examples-ui-gallery dev
```

[打开独立 Gallery](/examples/ui-gallery/)可并排操作两个设置面板。保存只更新示例中的状态，重新挂载时恢复默认值。

另见[文档编辑](/ui/workflow)和[图层工具面板](/ui/tool-panel)。

# UI Gallery

使用 `@piant/ui` 公开组件构建的 Canvas 设置面板示例。`src/SettingsPanel.tsx` 同时用于仓库 Gallery 和文档在线示例，便于比较独立组件与组合后的布局、编辑和交互。

## 运行

在仓库根目录安装依赖，并切换到满足仓库 engines 的 Node.js 版本：

```bash
pnpm --filter @piant/core build
pnpm --filter @piant/ui build
pnpm --filter @piant/examples-ui-gallery dev
```

访问终端输出的本地地址。页面挂载独立的 A/B Canvas，宿主控制支持主题、密度、200% 字号、窄容器、移除 B、卸载和重挂载 A。面板的保存只演示本地设置状态与反馈，不接入网络服务。

## 检查

```bash
pnpm --filter @piant/examples-ui-gallery typecheck
pnpm --filter @piant/examples-ui-gallery build
```

在浏览器中验证编辑、标签聚焦、字段校验、复选框、开关、单选、按钮键盘操作、保存/加载反馈，以及两次挂载之间的状态和清理隔离。组合明暗主题、紧凑密度、200% 字号和窄宽度，保留截图与操作日志。

实际系统输入法和 VoiceOver 等辅助技术需要分别验收，不能由合成事件、DOM/AX 检查或构建通过推断。详细组件索引、在线面板和验收操作见 [Gallery 文档](../../docs/ui/gallery.md)；每个组件的独立示例见该文档索引。

# Piant UI 组合示例

| 场景                                                                     | 可以试试                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [设置面板](https://piant.sumygg.com/examples/ui-gallery/)                | 编辑显示名称、切换提醒与导出质量，再保存。试着分别调整 A/B 面板的值和外观。      |
| [文档工作流](https://piant.sumygg.com/examples/ui-gallery/workflow.html) | 打开文档编辑器，用菜单和下拉框调整选项。保存后从通知中撤销，或从编辑器请求归档。 |

设置面板和工作流分别复用 `src/SettingsPanel.tsx` 和 `src/OverlayWorkflow.tsx`。两个场景都使用当前会话中的本地数据。要查看单个控件的用法，参见 [UI 组件目录](../../docs/ui/introduction.md)。

## 本地运行

在仓库根目录用符合 engines 要求的 Node.js 安装依赖，再启动开发服务。

```sh
pnpm install
pnpm --filter @piant/examples-ui-gallery dev
```

打开终端显示的地址即可试用设置面板，从页面导航进入文档工作流。

## 工程检查

```sh
pnpm --filter @piant/examples-ui-gallery typecheck
pnpm --filter @piant/examples-ui-gallery build
```

浏览器验证步骤见 [UI 浏览器回归说明](../../packages/ui/browser-tests/README.md)。两个场景保留独立 Canvas 与挂载控制，技术状态可在页面底部展开。

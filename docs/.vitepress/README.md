# 文档在线示例

`LiveExample` 在默认主题中全局注册。它按需加载真实的 Piant 组件，在正文中提供运行、停止、重新运行和源码查看。源码在构建时编译，浏览器中无需下载编译器。示例当前不支持在线编辑。

## 添加示例

1. 在 `docs/examples/` 添加一个 `.tsx` 文件，默认导出无参数的组件函数。组件只返回 Piant JSX，宿主负责创建 Pixi Application、PRoot 和画布。每次运行所需的状态应在组件内初始化。
2. 在文档中插入组件，例如：

   ```vue
   <LiveExample example="counter" title="计数器" />
   ```

   `example` 对应 TSX 文件名，不含扩展名；`height` 可选，默认 `300`（像素）。预览宽度跟随正文，示例也应适应窄屏。画布背景固定为 `#f8fafc`。
3. 使用 `onCleanup` 清理定时器、动画和订阅；Router 使用 `mode: 'memory'`，避免修改文档 URL。不要向 `document.body` 挂载内容或覆写 `window.onresize`。

`piantExamples.ts` 只转换此目录内的 TSX，复用 `@piant/babel-preset-piant`，原始源码请求不参与转换。Vite 继续移除 TypeScript 类型；Vue 的编译流程保持独立。运行时仅在点击运行后导入，因此静态生成阶段不会初始化 Pixi 或访问 DOM。

宿主通过 `ResizeObserver` 同步画布和布局尺寸。停止、重跑和页面卸载时释放响应式 owner、PRoot 的布局 ticker、当前树的 Yoga 节点、Pixi Application 和观察器；初始化未完成时停止，会在初始化返回后立即释放资源。由于当前核心的 `PNode.destroy()` 尚未释放 Yoga 节点，宿主在销毁时显式释放布局树；核心将来统一实现释放时，需要同步移除此补偿。此前已从树中移除的节点仍受核心原有清理限制影响。

Yoga 使用顶层 `await` 初始化 WASM，因此文档构建和开发模式依赖预构建的目标均为 ES2022，运行示例需要支持这些能力和 WebGL 的现代浏览器。加载或初始化失败会在示例内显示错误并允许重试。

## 本地验证

从仓库根目录执行：

```bash
pnpm install
pnpm --filter @piant/monorepo-docs test
pnpm --filter @piant/monorepo-docs typecheck
pnpm lint
pnpm docs:build
pnpm docs:dev
```

正常安装的 postinstall 会构建 workspace 包；若使用 `--ignore-scripts` 安装，需要先运行 `pnpm -r --filter './packages/*' --if-present run build`。`typecheck` 检查 TS 宿主、构建插件和 TSX 示例；Vue 模板由文档构建验证。

文档构建仍由 VitePress 1.x 自带的 Vite 5 执行。`docs/package.json` 中直接声明的 Vite 8 用于已有 Vitest 4 测试工具链，不参与文档构建插件的实现。

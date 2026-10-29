# @piant/devtools

Piant 的可选浏览器调试工具，提供元素检查与画布选择器、显式状态和 Store 历史检查、布局性能统计及动画观测。

## 安装

```bash
pnpm add -D @piant/devtools
```

Peer 依赖为 `@piant/core ^0.2.0` 和 `pixi.js ^8.22.0`。本包仅提供 ESM 入口。

也可以用脚手架创建带调试工具的项目：

```bash
pnpm create piant my-app --template basic --devtools
```

## 接入

在开发环境内动态导入 `attachDevtools`，传入 `mount` 返回的 `root`、`app`，并显式设置 `enabled: true`。将会话的 `detach()` 绑定到根组件的 `onCleanup`；异步导入完成后检查应用实例的 `isDestroyed`，避免在卸载后接入。

Rsbuild 使用 `process.env.NODE_ENV === 'development'`，Vite 使用 `import.meta.env.DEV`，让构建工具移除生产环境中的调试分支。仅设置 `enabled: false` 无法代替生产剔除。SSR 应用应在客户端初始化后导入。

- [快速开始与完整接入示例](https://piant.sumygg.com/devtools/quick-start)
- [API 与调试边界](https://piant.sumygg.com/guide/devtools)
- [Store 历史与恢复](https://piant.sumygg.com/devtools/store-history)
- [源代码与问题反馈](https://github.com/sumy7/piant)

## License

MIT

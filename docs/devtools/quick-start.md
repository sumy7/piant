# 快速开始

本节在已有 Piant 应用中接入调试面板。先完成 [Piant 安装与配置](/guide/installation)，初始化 PixiJS `Application`，并创建、渲染 `PRoot`。

## 1. 单独安装调试包

```bash
pnpm add -D @piant/devtools
```

调试包不会随 `@piant/core` 或 `@piant/store` 自动安装，也不会因为导入而自动接入。

## 2. 在开发环境显式接入

下面的函数接收应用已有的 `root` 与 `app`，返回调试会话的清理函数：

```ts
import type { PRoot } from '@piant/core';
import type { Application } from 'pixi.js';

export async function connectDevtools(root: PRoot, app: Application) {
  if (process.env.NODE_ENV !== 'development') return () => {};

  const { attachDevtools } = await import('@piant/devtools');
  const tools = attachDevtools({
    enabled: true,
    defaultOpen: true,
    root,
    app,
    getState: () => ({ screen: 'main' }),
  });

  return () => tools?.detach();
}
```

这是 Rsbuild 的开发条件写法；Vite 应将条件改为 `if (!import.meta.env.DEV)`。构建工具必须静态替换条件并移除不可达分支，动态导入必须留在该分支内。默认入口包含真实实现，不是生产空实现。

在初始化流程中等待 `connectDevtools` 完成，保存返回的清理函数；应用销毁时先调用它，再清理渲染、根节点和 PixiJS 应用。若应用可能在导入完成前销毁，需在导入后检查应用是否仍然存活；仓库示例演示了完整处理。

`enabled` 未设置或不为 `true` 时，`attachDevtools` 返回 `null`，不创建面板、订阅或采样。`getState` 是可选的只读状态源，不应触发请求或写入业务状态；[Store 历史](./store-history) 通过单独的 `stores` 选项注册。

## 3. 使用面板

点击品牌旁的选择器按钮，在画布上悬停预览、点击确认，左侧元素树与右侧属性同步定位。按 Escape 取消。选择模式会拦截确认点击，避免同时触发业务按钮。

收起面板会暂停自动采样并清除高亮，保留功能页、搜索与折叠状态；重新打开会刷新数据。Disconnect 会卸载会话。应用拥有的 Store 历史记录器有独立生命周期，收起或断开面板不会停止记录，需由应用显式 `dispose()`。

## 运行仓库示例

在仓库根目录运行：

```bash
pnpm install
pnpm --filter @piant/examples-devtools-demo dev
```

`examples/devtools-demo` 展示选择器、状态、Store 历史和动画。生产构建应没有调试面板与调试动态 chunk：

```bash
pnpm --filter @piant/examples-devtools-demo build
```

完整选项和使用限制见 [API 与调试边界](/guide/devtools)。

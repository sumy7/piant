# 快速开始

本节在使用 `mount` 的 Piant 应用中接入调试面板。先完成 [Piant 安装与配置](/guide/installation)。

## 使用脚手架

```bash
pnpm create piant my-app --template basic --devtools
cd my-app
pnpm install
pnpm dev
```

也可使用 `--template router --devtools`。两种模板的 DevTools 默认关闭；选择后初始显示右下角「Open Piant Devtools」入口。生成入口在开发条件内动态导入，使用根 owner 清理会话，并通过 `mount` 的 `AbortSignal` 处理热更新期间尚未完成的初始化。`pnpm build` 生成的生产应用没有调试入口或实现。

模板提供元素检查，不自动注册 Store 历史；需要历史预览与恢复时，按 [Store 历史](/devtools/store-history)显式注册。

## 1. 单独安装调试包

在已有应用中安装：

```bash
pnpm add -D @piant/devtools
```

调试包不会随 `@piant/core` 或 `@piant/store` 自动安装，也不会因为导入而自动接入。

## 2. 在开发环境显式接入

`mount` 返回的实例包含所需的 `root` 和 `app`。在根组件的 owner 内同步注册 `onCleanup`，让调试会话随应用实例释放：

```ts
// src/index.ts
import { mount, onCleanup } from '@piant/core';
import type { DevtoolsSession } from '@piant/devtools';
import { App } from './App';

async function start() {
  let tools: DevtoolsSession | null = null;
  function Root() {
    onCleanup(() => tools?.detach());
    return App();
  }

  const instance = await mount(Root, document.getElementById('app')!);

  if (process.env.NODE_ENV === 'development') {
    const { attachDevtools } = await import('@piant/devtools');
    // 动态导入期间应用可能已卸载。
    if (!instance.isDestroyed) {
      tools = attachDevtools({
        enabled: true,
        defaultOpen: false,
        root: instance.root,
        app: instance.app,
      });
    }
  }

  return instance;
}

const instance = await start();
// 页面卸载时调用 instance.destroy()，同步清理业务与调试资源。
```

这是 Rsbuild 的开发条件写法；Vite 应使用 `import.meta.env.DEV`。构建工具必须静态替换条件并移除不可达分支，动态导入必须留在该分支内。默认入口包含真实实现，只有 `enabled: false` 无法保证生产剔除。发布前检查实际产物。

支持热更新或异步取消的宿主，还应把 `AbortSignal` 传入 `mount`，在卸载时调用对应 controller 的 `abort()`；它会取消尚未完成的初始化，或销毁已经完成的实例。完整入口可参考脚手架模板；取消和所有权见 [渲染 API](/reference/renderer#mount)。

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

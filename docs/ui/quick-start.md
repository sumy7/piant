# 快速接入

在已有的 Piant 应用里添加 UI 组件，先用 `UIProvider` 包住界面，再从 `@piant/ui` 导入所需的组件。首次使用 Piant 时，先按[应用快速开始](/guide/quick-start)准备项目和 Canvas 容器。

## 安装

`@piant/ui` 的公开 npm 发布仍待完成。现在可以直接运行本页预览，或从仓库运行 [UI Gallery](/ui/gallery#在本地运行)。

公开发布后，应用安装 UI、兼容版本的 Core 和 PixiJS：

```sh
pnpm add @piant/ui @piant/core "pixi.js@^8.22.0"
```

Core 版本需满足所选 UI 版本的 peer 依赖。应用自己的 TSX 使用 Piant 的 JSX 预设，配置见[安装与配置](/guide/installation)。

## 第一个界面

点击“保存设置”更新按钮文案，再点击“重置”还原。示例把状态放在组件内，每个挂载实例有各自的状态。

<LiveExample example="uiQuickStart" title="保存与重置" :height="170" hide-source />

<<< ../examples/uiQuickStart.tsx

将示例保存为 `App.tsx`，在应用入口调用 `mount`，并给目标容器设置宽高：

```ts
import { mount } from '@piant/core';
import App from './App';

await mount(App, document.getElementById('app')!);
```

## 配置主题和浮层

- 用 [UIProvider](/ui/theme) 设置主题、密度和字号。用函数形式的子内容 `{() => <Content />}`，让控件使用当前主题。
- 使用 [Dialog](/ui/dialog)、[Select](/ui/select) 或 [Popover](/ui/popover) 等浮层组件时，在应用的 `UIProvider` 内加一层 `OverlayHost`，并把触发器和弹出内容放在同一个宿主中。

```tsx
import { OverlayHost, UIProvider } from '@piant/ui';

<UIProvider>
  {() => <OverlayHost>{() => <Settings />}</OverlayHost>}
</UIProvider>;
```

## 选择状态写法

用 `defaultValue`、`defaultChecked` 或 `defaultOpen` 设置初值，由组件管理后续状态。需要让多个控件共享数据时，传入 `value`、`checked` 或 `open`，并在对应的变更回调中更新应用状态。

接下来可以从[组件目录](/ui/introduction)挑选控件，或在[设置面板](/ui/gallery)查看它们如何组合使用。

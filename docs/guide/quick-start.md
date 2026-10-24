# 快速开始

本节将带你在几分钟内创建并运行第一个 Piant 应用。

## 前置条件

- Node.js ^20.19.0 或 >=22.12.0
- pnpm（推荐）或 npm / yarn

克隆本仓库进行开发、测试或构建文档时，请使用 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。

## 创建新项目

### 使用 create-piant（推荐）

Piant 提供官方脚手架工具 `create-piant`，可一键生成项目模板：

```bash
# 使用 pnpm（推荐）
pnpm create piant

# 使用 npm
npm create piant@latest

# 使用 yarn
yarn create piant
```

运行后，脚手架会询问项目名称、模板与是否启用 DevTools。默认使用 `basic` 模板且不启用 DevTools；非交互运行默认创建 `piant-app`。也可直接指定：

```bash
pnpm create piant my-app --template router --devtools
# npm 需要用 -- 转发选项
npm create piant@latest my-app -- --template router --devtools
```

`router` 模板提供首页与 `/users/:id` 用户页，演示动态参数和前进、后退。`--devtools` 可与 `basic` 或 `router` 组合，仅在开发态接入调试面板。完整选项和部署要求见[安装与配置](/guide/installation)。创建完成后执行：

```bash
cd <project-name>
pnpm install
pnpm typecheck
pnpm dev

# 生产构建与本地预览
pnpm build
pnpm preview
```

> 详细说明请参阅 [安装与配置](/guide/installation)。

### 手动创建

也可以参考 `examples/todos` 示例手动搭建，或克隆示例后修改。

```bash
# 克隆仓库
git clone https://github.com/sumy7/piant.git
cd piant

# 安装依赖
pnpm install

# 运行 Todos 示例
cd examples/todos
pnpm dev
```

`@piant/core` 仅提供 ESM 入口，以下示例使用 `import`。脚手架和仓库示例已声明 PixiJS 依赖；手动接入项目时，按[安装与配置](/guide/installation)安装所需依赖。

## 项目结构示例

先在页面中准备一个有明确尺寸的容器：

```html
<div id="app" style="width: 100%; height: 400px"></div>
```

应用入口只需调用 `mount`。它负责 PixiJS 异步初始化、创建根节点、渲染、尺寸同步和实例清理：

```ts
// src/index.ts
import { mount } from '@piant/core';
import { App } from './App';

const instance = await mount(App, document.getElementById('app')!);

// 页面或路由卸载时调用。
// instance.destroy();
```

`await mount(...)` 完成后，实例已可使用。容器尺寸变化时，Canvas 和 Piant 根布局会一起更新，无需注册 `window.onresize`。若使用全屏布局，可给 `html`、`body` 和宿主容器设置 `height: 100%`，并清除 `body` 默认外边距。

同一页面可多次挂载 `App`，每次获得独立 Canvas、根节点和清理方法。将 `createState` 写在组件函数内即可让各实例拥有独立状态。已有 Canvas、并排实例和尺寸配置见 [Canvas 布局](/guide/canvas-layout#嵌入页面与多个实例)；完整参数和取消初始化见 [渲染 API](/reference/renderer#mount)。

## 编写第一个组件

```tsx
// src/App.tsx
import { createState, StyleSheet, View, Text } from '@piant/core';

export function App() {
  const [count, setCount] = createState(0);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      width: 120,
      height: 44,
      backgroundColor: '#171717',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: 'white',
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.button} onClick={() => setCount(count() + 1)}>
        <Text style={styles.text}>点击了 {count()} 次</Text>
      </View>
    </View>
  );
}
```

<LiveExample example="counter" title="运行第一个计数器" />

## 配置 Babel

在使用 JSX 语法前，需要配置 Babel 预设。以 Rsbuild 为例：

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';

export default defineConfig({
  plugins: [
    pluginBabel({
      babelLoaderOptions(opts) {
        opts.presets ??= [];
        opts.presets.push(['@piant/babel-preset-piant']);
      },
    }),
  ],
});
```

## 下一步

- [安装与配置](/guide/installation) — 了解更多配置选项
- [核心概念：Canvas 布局](/guide/canvas-layout) — 理解 Piant 的布局模型
- [内置组件：View](/guide/components/view) — 学习如何使用容器组件

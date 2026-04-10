# 快速开始

本节将带你在几分钟内创建并运行第一个 Piant 应用。

## 前置条件

- Node.js >= 18.12.0
- pnpm（推荐）或 npm / yarn

## 创建新项目

目前 Piant 没有官方脚手架工具，你可以参考 `examples/todos` 示例手动搭建，或克隆示例后修改。

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

## 项目结构示例

一个典型的 Piant 应用入口文件如下：

```ts
// src/index.ts
import { PRoot, render } from '@piant/core';
import { Application } from 'pixi.js';
import { App } from './App';

(async () => {
  // 1. 初始化 PixiJS Application
  const app = new Application();
  await app.init({ background: '#1099bb', resizeTo: window });
  document.body.appendChild(app.canvas);

  // 2. 创建根节点
  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });

  // 3. 渲染应用
  render(App, root);

  // 4. 响应窗口大小变化
  window.onresize = () => {
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  };
})();
```

## 编写第一个组件

```tsx
// src/App.tsx
import { createState, StyleSheet, View, TextView } from '@piant/core';

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
        <TextView style={styles.text}>点击了 {count()} 次</TextView>
      </View>
    </View>
  );
}
```

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

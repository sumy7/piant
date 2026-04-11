<div align="center">
  <h1>Piant</h1>
  <p>基于 PixiJS 的画布布局引擎 · A Canvas Layout Engine Powered by PixiJS</p>

  [![npm version](https://img.shields.io/npm/v/@piant/core.svg)](https://www.npmjs.com/package/@piant/core)
  [![npm downloads](https://img.shields.io/npm/dm/@piant/core.svg)](https://www.npmjs.com/package/@piant/core)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/@piant/core)](https://nodejs.org/)
</div>

---

Piant 是一个基于 [PixiJS](https://pixijs.com/) 的高性能画布（Canvas）布局引擎，提供类 React 的声明式 JSX 编程模型与细粒度响应式状态管理，让开发者能够以熟悉的组件化方式在 WebGL/Canvas 上构建 2D 用户界面。

## 特性

- 🚀 **高性能渲染** — 基于 PixiJS 的 WebGL/Canvas 渲染，极高帧率
- 📐 **Flexbox 布局** — 基于 Yoga Layout 引擎，支持 Flexbox 语义
- ⚛️ **声明式 JSX** — 类 React/Solid 的 JSX 语法，降低学习成本
- 🔄 **细粒度响应式** — 基于 MobX，数据变化时只更新必要节点

## 文档

完整文档请访问 [piant.sumygg.com](https://piant.sumygg.com)。

## 安装

```bash
npm install @piant/core pixi.js
# 或
pnpm add @piant/core pixi.js
```

## 使用方式

### 1. 配置 Babel 预设

安装 Babel 预设以支持 JSX 语法转换：

```bash
npm install @piant/babel-preset-piant
```

以 Rsbuild 为例配置：

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

### 2. 初始化渲染器

```ts
// src/index.ts
import { PRoot, render } from '@piant/core';
import { Application } from 'pixi.js';
import { App } from './App';

(async () => {
  const app = new Application();
  await app.init({ background: '#1099bb', resizeTo: window });
  document.body.appendChild(app.canvas);

  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });

  render(App, root);

  window.onresize = () => {
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  };
})();
```

### 3. 编写组件

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
    text: { color: 'white', fontSize: 16 },
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

## 开发

```bash
# 安装依赖
pnpm install

# 开发核心包
cd packages/core
pnpm dev

# 运行文档（开发模式）
pnpm docs:dev

# 构建文档
pnpm docs:build
```

## 示例

```bash
cd examples/todos
pnpm dev
```

## 发布

```bash
# 进入/退出 alpha 状态
pnpm changeset pre enter alpha
pnpm changeset pre exit

# 更新版本
pnpm changeset version

# 发布
pnpm changeset publish
```

## 贡献指南

欢迎任何形式的贡献！请阅读以下步骤：

1. **Fork** 本仓库
2. 基于 `main` 分支创建功能分支：`git checkout -b feat/your-feature`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送分支：`git push origin feat/your-feature`
5. 发起 **Pull Request**

### 开发规范

- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 代码风格使用 Biome 检查：`pnpm lint`
- 新功能请附带对应测试用例
- 使用 [Changesets](https://github.com/changesets/changesets) 记录变更：`pnpm changeset`

## 许可证

[MIT](./LICENSE) © [sumy7](https://github.com/sumy7)

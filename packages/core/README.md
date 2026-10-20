# @piant/core

Piant 是一个基于 [PixiJS](https://pixijs.com/) 的声明式 Canvas UI 框架。使用 JSX 编写组件，通过 Yoga 实现 Flexbox 布局，并以细粒度响应式状态驱动界面更新。

- 内置 `View`、`Text`、`Image`、`Input` 和 `ScrollView` 等组件。
- 提供 `For`、`Show`、`Switch` 等控制流组件。
- 支持响应式状态、生命周期、类型化事件和 `StyleSheet` 样式表。
- 可搭配独立的动画、路由、键盘交互和状态管理包。

## 创建项目

```bash
pnpm create piant my-app
cd my-app
pnpm install
pnpm dev
```

也可以使用 `npm create piant@latest`。脚手架会生成包含 JSX 转换配置的 Rsbuild 项目。

## 在已有项目中安装

```bash
pnpm add @piant/core "pixi.js@^8.22.0"
pnpm add -D @piant/babel-preset-piant @babel/core
```

PixiJS 是 peer 依赖，兼容范围为 `^8.22.0`，需要由应用显式安装。本包仅提供 ESM 入口，使用 `import` 导入。

JSX 需要通过 `@piant/babel-preset-piant` 转换。例如，在 Babel 配置中添加：

```json
{
  "presets": ["@piant/babel-preset-piant"]
}
```

TypeScript 项目使用以下 JSX 配置：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@piant/core"
  }
}
```

Rsbuild、Vite 的完整配置见[安装与配置](https://piant.sumygg.com/guide/installation)。

## 示例

```tsx
// src/App.tsx
import { createState, StyleSheet, Text, View } from '@piant/core';

export function App() {
  const [count, setCount] = createState(0);
  const label = () => `点击了 ${count()} 次`;
  const styles = StyleSheet.create({
    page: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      padding: 16,
      backgroundColor: '#171717',
      borderRadius: 8,
    },
    label: { color: 'white', fontSize: 20 },
  });

  return (
    <View style={styles.page}>
      <View style={styles.button} onClick={() => setCount(count() + 1)}>
        <Text style={styles.label}>{label()}</Text>
      </View>
    </View>
  );
}
```

```ts
// src/index.ts
import { PRoot, render } from '@piant/core';
import { Application } from 'pixi.js';
import { App } from './App';

async function main() {
  const app = new Application();
  await app.init({ background: '#1099bb', resizeTo: window });
  document.body.appendChild(app.canvas);

  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });
  render(App, root);

  window.addEventListener('resize', () => {
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  });
}

void main();
```

## 文档与相关包

- [快速开始](https://piant.sumygg.com/guide/quick-start) · [API 总览](https://piant.sumygg.com/reference/overview)
- [@piant/animation](https://www.npmjs.com/package/@piant/animation)：关键帧动画与播放控制。
- [@piant/router](https://www.npmjs.com/package/@piant/router)：路由与导航。
- [@piant/hooks](https://www.npmjs.com/package/@piant/hooks)：键盘交互 hooks。
- [@piant/store](https://www.npmjs.com/package/@piant/store)：状态管理与持久化。
- [源码](https://github.com/sumy7/piant/tree/main/packages/core) · [示例](https://github.com/sumy7/piant/tree/main/examples) · [问题反馈](https://github.com/sumy7/piant/issues)

## 许可证

[MIT](https://github.com/sumy7/piant/blob/main/LICENSE) © [sumy7](https://github.com/sumy7)

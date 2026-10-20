# @piant/babel-preset-piant

Piant 的 Babel JSX 转换预设，基于 `babel-plugin-jsx-dom-expressions`，将 JSX 转换为 `@piant/core` 的渲染与响应式调用。

## 安装

```bash
pnpm add @piant/core "pixi.js@^8.22.0"
pnpm add -D @piant/babel-preset-piant @babel/core
```

Peer 依赖为 `@babel/core ^7.0.0`。生成的应用代码依赖 `@piant/core`。

## 配置

在 `babel.config.cjs` 中启用预设：

```js
module.exports = {
  presets: ['@piant/babel-preset-piant'],
};
```

TypeScript 项目保留 JSX 供 Babel 处理，并指定 Piant 的 JSX 类型：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@piant/core"
  }
}
```

将 Babel 接入构建工具后即可编写组件：

```tsx
import { Text, View } from '@piant/core';

export function App() {
  return (
    <View style={{ padding: 16 }}>
      <Text>Hello Piant</Text>
    </View>
  );
}
```

本预设负责 JSX 转换；TypeScript 语法处理及打包由项目构建工具配置。Rsbuild 和 Vite 接入方式见 [安装与配置](https://piant.sumygg.com/guide/installation)。

## 更多信息

- [文档](https://piant.sumygg.com/guide/introduction)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

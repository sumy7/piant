# 安装与配置

## 使用 create-piant 创建新项目（推荐）

最快捷的方式是使用官方脚手架工具 `create-piant` 创建一个开箱即用的项目：

```bash
# 使用 pnpm（推荐）
pnpm create piant

# 使用 npm
npm create piant@latest

# 使用 yarn
yarn create piant
```

也可以直接指定项目名称：

```bash
pnpm create piant my-app
```

创建完成后进入项目目录，安装依赖并启动开发服务器：

```bash
cd my-app
pnpm install
pnpm dev
```

> **可用模板**
>
> | 模板 | 说明 |
> |------|------|
> | `basic` | 基础应用模板（rsbuild + @piant/core） |

---

## 在已有项目中安装依赖

在已有项目中安装 Piant：```bash
# 使用 pnpm
pnpm add @piant/core

# 使用 npm
npm install @piant/core

# 使用 yarn
yarn add @piant/core
```

pixi.js 是 `@piant/core` 的直接依赖，会随 `@piant/core` 一起自动安装。但由于应用代码会直接从 `pixi.js` 导入（如 `Application`、`Graphics`、`Sprite` 等），建议也在项目中显式安装：

```bash
pnpm add pixi.js
```

## 配置 JSX 转换

Piant 使用自定义 JSX 转换，需要安装 Babel 预设：

```bash
pnpm add -D @piant/babel-preset-piant @babel/core
```

### 与 Rsbuild 配合

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

### 与 Vite 配合

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        presets: ['@piant/babel-preset-piant'],
      },
    }),
  ],
});
```

### 手动配置 babel.config.js

```js
// babel.config.js
module.exports = {
  presets: ['@piant/babel-preset-piant'],
};
```

## TypeScript 配置

在 `tsconfig.json` 中配置 JSX 编译选项：

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@piant/core"
  }
}
```

## 版本要求

| 依赖 | 最低版本 |
|------|---------|
| Node.js | >= 18.12.0 |
| pixi.js | >= 8.0.0 |
| TypeScript | >= 5.0（可选）|

## Monorepo 中的使用

如果在 monorepo（如 pnpm workspace）中使用，可以在 `pnpm-workspace.yaml` 中添加本地路径引用：

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

然后在子包中：

```json
{
  "dependencies": {
    "@piant/core": "workspace:*"
  }
}
```

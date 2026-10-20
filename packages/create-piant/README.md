# create-piant

使用 CLI 快速创建 Piant 项目，生成配置好 JSX 转换和 TypeScript 的 Rsbuild 应用。CLI 需要 Node.js >=18.12.0；生成项目的应用工具链需要 Node.js ^20.19.0 或 >=22.12.0。

## 使用方式

```bash
# 使用 pnpm
pnpm create piant

# 使用 npm
npm create piant@latest

# 使用 yarn
yarn create piant
```

或者指定项目名称：

```bash
pnpm create piant my-app
```

## 可用模板

| 模板    | 说明                                  |
| ------- | ------------------------------------- |
| `basic` | 基础应用模板（rsbuild + @piant/core） |

## 创建后

```bash
cd my-app
pnpm install
pnpm dev
```

## 更多信息

- [安装与配置](https://piant.sumygg.com/guide/installation)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

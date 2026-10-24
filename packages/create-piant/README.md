# create-piant

使用 CLI 快速创建 Piant 项目，生成配置好 JSX 转换和 TypeScript 的 Rsbuild 应用。CLI 需要 Node.js >=18.12.0；生成项目的应用工具链需要 Node.js ^20.19.0 或 >=22.12.0。

## 使用方式

```bash
# 交互式创建
pnpm create piant

# 基础模板
pnpm create piant my-app --template basic

# Router 模板，并接入开发调试面板
pnpm create piant my-app --template router --devtools

# npm 的选项放在 -- 后
npm create piant@latest my-app -- --template router --devtools

# yarn
yarn create piant my-app --template router --devtools
```

交互终端会询问未指定的项目名称、模板与是否启用 DevTools。默认项目名为 `piant-app`、模板为 `basic`，DevTools 默认关闭。非交互运行直接使用这些默认值；可通过参数完整指定选择。

| 选项                             | 说明                               |
| -------------------------------- | ---------------------------------- |
| `--template <name>`、`-t <name>` | 选择 `basic` 或 `router`           |
| `--devtools`                     | 添加 DevTools 开发依赖与开发态入口 |
| `--no-devtools`                  | 不添加 DevTools，并跳过对应询问    |
| `--help`、`-h`                   | 查看用法                           |

CLI 拒绝无效选项与非空目标目录，不会覆盖已有项目。路径包含空格时使用引号，例如 `pnpm create piant "my app" -t router --no-devtools`。取消交互会结束创建。

## 可用模板

| 模板     | 说明                                                          | 可选 DevTools |
| -------- | ------------------------------------------------------------- | ------------- |
| `basic`  | 基础计数器应用（Rsbuild + `@piant/core`）                     | 支持          |
| `router` | 首页与 `/users/:id` 用户页，演示用户 42 / 99 的导航和动态参数 | 支持          |

两种模板共用基础工程配置，使用公开的 `mount` API 管理独立 Canvas、容器尺寸同步和实例清理。Router 模板使用浏览器 history，支持前进、后退；部署时需将页面路径（例如 `/users/42`）回退到 `index.html`，才能直接访问或刷新深链接。

DevTools 是独立选项，未选择时不会安装调试包。选择后，入口仅在开发条件内动态导入并显式接入，初始显示「Open Piant Devtools」入口。收起或 Disconnect 不卸载业务应用；应用销毁时通过根 owner 的 `onCleanup` 释放调试会话。入口使用 `AbortSignal` 处理热更新期间尚未完成的挂载。生产构建静态移除调试分支及实现。模板不自动接入 Store 历史，详见 [DevTools 接入](https://piant.sumygg.com/devtools/quick-start)。

## 创建后

```bash
cd my-app
pnpm install
pnpm typecheck
pnpm dev
```

生成生产产物并在本地预览：

```bash
pnpm build
pnpm preview
```

`typecheck` 单独检查 TypeScript，`build` 输出生产产物到 `dist`。部署 Router 应用时配置上述 history 回退。

模板声明 `@piant/core ^0.2.0`、`pixi.js ^8.22.0` 与 `@piant/babel-preset-piant ^0.1.0`；Router 选项增加 `@piant/router ^0.2.0`，DevTools 选项增加 `@piant/devtools ^0.1.0`。安装需要 registry 中存在满足这些范围的包。发布前验证使用隔离目录和本地 pack tarball 安装对应包，不代表 registry 已提供这些版本；具体发布依赖与验证结果见变更对应的 PR。

## 更多信息

- [安装与配置](https://piant.sumygg.com/guide/installation)
- [Router 快速开始](https://piant.sumygg.com/router/quick-start)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

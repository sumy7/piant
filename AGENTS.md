# Project Guidelines

## Code Style

- 使用 TypeScript 开发，优先保持现有代码风格与命名习惯，不做无关重构。
- Lint 使用 Biome：`pnpm lint`（`biome check`）。
- Biome formatter 在本仓库默认关闭；需要统一格式时使用 `pnpm format`（Prettier）。
- 文件命名遵循 Biome 规则：`camelCase`、`PascalCase` 或 `export` 风格。

## Architecture

- 本仓库是 pnpm monorepo。
- `packages/core`：运行时核心（组件、渲染器、响应式、样式系统、底层元素）。
- `packages/babel-preset-piant`：JSX 转换预设。
- `docs`：VitePress 文档站。
- `examples/*`：可运行示例（建议作为 API 用法参考）。

`packages/core/src` 目录边界：

- `components/`：公开组件（`View`、`Text`、`For`、`Show`、`Switch` 等）。
- `elements/`：底层渲染节点与 Pixi/Yoga 对接实现。
- `reactivity/`：响应式原语与上下文能力。
- `renderer/`：渲染入口与更新流程。
- `styleSheet/`：样式表与样式解析。

## Build and Test

- 仓库开发环境要求 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`；各发布包的消费者要求以各自 `engines` 为准。
- 安装依赖：`pnpm install`
- 根目录构建（Nx）：`pnpm build`
- 根目录 Lint：`pnpm lint`
- 文档开发：`pnpm docs:dev`
- 文档构建：`pnpm docs:build`

核心包常用命令：

- 构建 core：`pnpm --filter @piant/core build`
- 开发监听：`pnpm --filter @piant/core dev`
- 测试（watch）：`pnpm --filter @piant/core test`
- 测试（单次）：`pnpm --filter @piant/core exec vitest run`
- 覆盖率：`pnpm --filter @piant/core test:coverage`

示例项目：

- 运行示例：`pnpm --filter @piant/examples-tic-tac-toe dev`（或其他 `@piant/examples-*`）

## Conventions

- 文档与 README 默认描述最新版本的能力、用法与限制，不嵌入历史版本差异、升级过程或未来版本猜测；安装要求与依赖兼容范围按当前配置说明，发布历史由 Changesets/Git 记录维护。
- 涉及 PixiJS API 时，优先参考官方 LLM 文档：<https://pixijs.com/llms.txt>。
- JSX 使用前提是配置 `@piant/babel-preset-piant`（参考示例与 README 中 rsbuild 配置）。
- 修改 `Text` 相关逻辑时，避免在 JSX 内部写复杂内联条件/插值表达式；优先先计算再传值，以减少不必要的响应式副作用。
- 变更 API 或行为时，优先补充/更新 `packages/core/tests` 下对应 Vitest 用例。

## Git and Merge Requests

- 分支名统一使用 `feature-YYYYMMDD-short-description`，不使用默认的 `codex/` 前缀。日期按 `Asia/Shanghai` 时区生成，简短描述使用小写英文单词并以连字符连接，例如 `feature-20261021-fix-color-interpolation`。
- MR（包括 GitHub PR）标题按 Conventional Commits 格式编写：`<type>: <message>`，例如 `fix: interpolate background colors`；类型根据变更内容选择 `feat`、`fix`、`chore`、`docs` 等。
- 引用的 Linear 问题编号写在 MR 说明中，例如 `关联问题：COD-145`，不要把 `COD-ID` 放在 MR 标题中。

## Docs Map (Link, Don’t Embed)

- 项目与定位：`docs/guide/introduction.md`
- 快速上手：`docs/guide/quick-start.md`
- 安装与配置：`docs/guide/installation.md`
- 响应式：`docs/guide/reactivity.md`
- 生命周期：`docs/guide/lifecycle.md`
- 组件指南：`docs/guide/components/*.md`
- 控制流组件：`docs/guide/control-flow/*.md`
- API 总览：`docs/reference/overview.md`
- 组件 API：`docs/reference/components.md`
- 渲染 API：`docs/reference/renderer.md`
- 样式 API：`docs/reference/stylesheet.md`

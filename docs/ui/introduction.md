# UI 简介

`@piant/ui` 提供与 Piant 核心运行时组合的 Canvas UI 组件。当前公共 API 为 `Spacer` 和 `SpacerProps`。

## 安装

```bash
pnpm add @piant/ui "@piant/core@^0.2.0" "pixi.js@^8.22.0"
```

UI 以 `@piant/core ^0.2.0` 为 peer dependency，复用应用提供的 core；core 需要 `pixi.js ^8.22.0`。应用从 `@piant/ui` 根入口导入组件，不使用内部路径。

## 使用 Spacer

`Spacer` 沿父容器的 Flex 主轴留白。`size` 指定逻辑像素间距，省略时填充剩余空间。它不接收子节点、样式或 ref。

```tsx
import { View } from '@piant/core';
import { Spacer } from '@piant/ui';

export function App() {
  return (
    <View style={{ width: 320, height: 80, flexDirection: 'row' }}>
      <View style={{ width: 40, height: 40, backgroundColor: '#34d399' }} />
      <Spacer size={20} />
      <View style={{ width: 40, height: 40, backgroundColor: '#60a5fa' }} />
    </View>
  );
}
```

应用自身的 JSX 按 [安装与配置](/guide/installation) 配置 `@piant/babel-preset-piant`。UI 内部 TSX 已在包构建时通过该预设转换，发布 ESM JavaScript 与声明文件，消费者无需编译依赖源码。普通 TypeScript 可以直接调用 `Spacer(props)`，不需要 Babel。

## 运行最小示例

仓库中的 `examples/ui-smoke` 使用普通 TypeScript 导入 workspace 包，展示两个色块之间的响应式间距。运行：

```bash
pnpm --filter @piant/ui build
pnpm --filter @piant/examples-ui-smoke dev
```

在浏览器点击「Increase gap」观察间距变化；点击「Unmount」检查画布移除、节点销毁和响应式订阅清理。示例源码位于 [GitHub](https://github.com/sumy7/piant/tree/main/examples/ui-smoke)。

## 包与核心的职责

Core 负责渲染节点、响应式、生命周期、基础组件和样式。UI 从 core 公共入口组合布局与控件策略，保持单份响应式运行时。UI 源码按 `theme`、`primitives`、`components` 分层，由 `src/index.ts` 明确公共出口；组件使用 PascalCase，属性类型使用 `Props` 后缀。

UI 当前没有模块初始化副作用，支持构建器剔除未使用的 UI 代码；core 及其依赖的必要初始化仍按各自包的规则执行。

## 工程验证

在满足仓库 Node.js 要求的环境中执行：

```bash
pnpm --filter @piant/ui build
pnpm --filter @piant/ui typecheck
pnpm --filter @piant/ui test:run
pnpm --filter @piant/ui verify:package
pnpm --filter @piant/examples-ui-smoke typecheck
pnpm --filter @piant/examples-ui-smoke build
```

包验证覆盖发布产物的隔离消费链路。使用本地 core tarball 时，这是本地产物验证，不是 registry 发布验证；浏览器实际运行需单独检查。

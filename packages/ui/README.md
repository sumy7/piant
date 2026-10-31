# @piant/ui

Piant 的 Canvas UI 组件包，提供可与 `@piant/core` 组合的 `Spacer` 布局组件。

## 安装与入口

```bash
pnpm add @piant/ui "@piant/core@^0.2.0" "pixi.js@^8.22.0"
```

本包版本为 `0.1.0`，仅提供 ESM。公共入口为 `@piant/ui`，导出 `Spacer` 和类型 `SpacerProps`；内部目录不提供子路径导出。

`@piant/core ^0.2.0` 是 peer dependency，由应用提供。Core 的 peer dependency 为 `pixi.js ^8.22.0`。UI 构建保留对 core 的外部引用，不打包另一份 core 或响应式运行时。

## Spacer

`Spacer` 在父容器的 Flex 主轴上留出空间。`size?: number` 指定逻辑像素间距；省略时填充剩余空间。父容器的 `flexDirection` 决定间距方向。组件不接收 `children`、`style` 或 `ref`。

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

应用自己的 JSX 需要配置 `@piant/babel-preset-piant`，参见 [安装与配置](https://piant.sumygg.com/guide/installation)。UI 包内部的 TSX 已在构建时通过该预设转换，发布文件为 JavaScript ESM 和 `.d.ts`，消费者无需转换依赖源码。直接调用 `Spacer(props)` 的普通 TypeScript 消费端无需 Babel；[ui-smoke 示例](../../examples/ui-smoke/src/index.ts) 演示了这种方式及响应式更新、卸载检查。

## 工程边界

Core 提供渲染节点、响应式原语、生命周期、基础组件与样式能力；UI 通过 core 公共入口组合布局与控件策略，不深度导入 core 源码。

源码按职责组织：

- `src/theme/`：主题相关代码。
- `src/primitives/`：共享行为与内部工具。
- `src/components/`：组件实现；组件使用 PascalCase，属性类型使用 `Props` 后缀。
- `src/index.ts`：显式列出公共出口。
- `tests/`：组件与构建产物测试。

UI 当前无模块初始化副作用，使用 `sideEffects: false` 允许构建器剔除未使用代码。此声明仅属于 UI 包；core 与其依赖保留自身的初始化语义。有模块初始化的文件必须在 `sideEffects` 中显式保留，不能继续由全包无副作用声明覆盖。

## 验证

仓库开发环境要求 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。在仓库根目录执行：

```bash
pnpm --filter @piant/ui build
pnpm --filter @piant/ui typecheck
pnpm --filter @piant/ui test:run
pnpm --filter @piant/ui verify:package
pnpm --filter @piant/examples-ui-smoke typecheck
pnpm --filter @piant/examples-ui-smoke build
pnpm --filter @piant/examples-ui-smoke dev
```

`verify:package` 用于 pack 与仓库外隔离消费验证。使用真实本地 core tarball 的验证不能等同于 registry 发布验证。浏览器中打开 smoke 示例，检查初始间距、点击「Increase gap」后的间距变化，以及「Unmount」后的资源清理；生产构建成功本身不代表浏览器运行通过。

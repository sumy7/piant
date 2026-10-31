# UI 简介

`@piant/ui` 提供与 Piant 核心运行时组合的 Canvas UI 主题与组件。使用 `createTheme` 创建语义 tokens，使用 `UIProvider` 和 `useUITheme` 在组件树中响应式消费主题；`Spacer` 提供 Flex 主轴留白。

## 安装

```bash
pnpm add @piant/ui @piant/core "pixi.js@^8.22.0"
```

UI 以 `@piant/core` 为 peer dependency，范围以已安装 UI 包的 `peerDependencies` 为准，复用应用提供的 core；core 需要 `pixi.js ^8.22.0`。应用从 `@piant/ui` 根入口导入组件，不使用内部路径。

## 主题与样式

主题提供颜色、间距、控件最小高度、字体、圆角与动画六组 tokens，支持浅色/深色、舒适/紧凑密度、文字缩放、嵌套覆盖和系统减少动画偏好。Canvas 组件通过 `useUITheme()` 返回的 accessor 显式读取样式；provider 不会自动改写所有控件样式。

`createTheme()` 返回深度冻结的独立主题，`defaultTheme` 为默认值。需要响应式上下文、原生输入 DOM 字体继承或查看在线示例时，参见[主题与 UIProvider](/ui/theme)。

## 共享交互

`createControllableState` 统一受控与非受控值，可适配 `value`、`checked`、`open` 三组控件属性。`createPressable` 绑定已有 Piant 节点，提供 hover、按压和禁用状态，处理控件内释放、移出返回、取消及销毁。

这两个原语不包含视觉 Button、键盘、焦点或辅助技术语义。参数与回调的响应式转发、手势规则及在线示例见[受控状态与按压行为](/ui/interactions)。

## 焦点与语义

`UIProvider` 为注册项提供焦点作用域；`createFocusable` 协调 Canvas 语义代理与原生 Input，提供 Tab 导航、focus-visible 和键盘激活。`createRovingFocusGroup` 让组内控件共用一个 Tab 停靠项，并用箭头/Home/End 移动焦点。Canvas 焦点环仍由组件显式绘制。接入方式、作用域隔离与验证边界见[焦点与语义桥接](/ui/focus)。

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

在浏览器点击「Increase gap」观察间距变化；点击「Unmount」检查画布移除、节点销毁和响应式订阅清理。访问 `/theme.html` 查看主题消费场景，访问 `/pressable.html` 查看交互原语消费场景。示例源码位于 [GitHub](https://github.com/sumy7/piant/tree/main/examples/ui-smoke)。

## 包与核心的职责

Core 负责渲染节点、响应式、生命周期、基础组件和样式。UI 从 core 公共入口组合布局与控件策略，保持单份响应式运行时。UI 源码按 `theme`、`primitives`、`components` 分层，由 `src/index.ts` 明确公共出口；组件使用 PascalCase，属性类型使用 `Props` 后缀。

UI 不在模块加载时注册全局监听或修改 DOM，支持构建器剔除未使用的 UI 代码；core 及其依赖的必要初始化仍按各自包的规则执行。Provider 的监听与可选 DOM 样式随所属实例清理。

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

# UI 简介

`@piant/ui` 提供与 Piant 核心运行时组合的 Canvas UI 主题与组件。使用 `createTheme` 创建语义 tokens，使用 `UIProvider` 和 `useUITheme` 在组件树中响应式消费主题；`Stack`、`Surface`、`Separator`、`Spacer` 提供布局基础，`Icon`、`Badge`、`ProgressBar`、`Spinner` 提供图标和状态展示。

## Gallery 设置面板

[UI Gallery](/ui/gallery)将布局、图标、状态展示、按钮、文本字段和选择控件组合成可操作设置面板，并提供全部公开组件的独立在线示例索引。仓库 `examples/ui-gallery` 还提供两个独立 Canvas、窄容器与卸载/重挂载控制，用于组合验证。

## 安装

```bash
pnpm add @piant/ui @piant/core "pixi.js@^8.22.0"
```

UI 以 `@piant/core` 为 peer dependency，范围以已安装 UI 包的 `peerDependencies` 为准，复用应用提供的 core；core 需要 `pixi.js ^8.22.0`。应用从 `@piant/ui` 根入口导入组件，不使用内部路径。

## 主题与样式

主题提供颜色、间距、控件最小高度、字体、圆角与动画六组 tokens，支持浅色/深色、舒适/紧凑密度、文字缩放、嵌套覆盖和系统减少动画偏好。Canvas 组件通过 `useUITheme()` 返回的 accessor 显式读取样式；provider 不会自动改写所有控件样式。

`createTheme()` 返回深度冻结的独立主题，`defaultTheme` 为默认值。需要响应式上下文、原生输入 DOM 字体继承或查看在线示例时，参见[主题与 UIProvider](/ui/theme)。

## 布局与状态

[布局与状态组件](/ui/foundations)提供七个独立在线示例与属性说明，涵盖内容布局、面板、分隔线、调用方图标资产与绘图、文字徽标、确定/不确定进度和加载标识。组件消费语义 tokens，支持运行中的主题、密度与文字缩放；动画跟随减少动画偏好并随实例清理。

## 按钮

`Button` 与 `IconButton` 组合主题、按压和焦点能力，提供统一指针/键盘操作、语义名称、禁用和加载状态。[按钮指南](/ui/buttons)包含两个独立在线示例与属性说明；使用时需在 `UIProvider` 的延迟子树中创建。

## 文本字段

`TextField` 在真实原生输入上提供主题、焦点和表单属性；`Field` 用延迟子树组合标签、说明与错误。独立字段需要 ARIA 名称，Field 内则使用字段标签。受控/非受控、合成输入、只读/禁用和独立在线示例见[文本字段指南](/ui/text-field)。

## 选择控件

`Checkbox` 支持二态和混合态，`ToggleSwitch` 表达布尔开关，`RadioGroup` 提供单选、组内焦点和动态选项。受控/非受控、Space/方向键、禁用与主题缩放示例见[选择控件指南](/ui/selection)。

## 滑块

`Slider` 提供单值范围选择，支持小数步长、受控/非受控值、横向/纵向、横向 RTL、指针拖动和键盘调整。[Slider 指南](/ui/slider)包含可操作示例、数值刻度、事件与语义说明。

## 标签与折叠容器

`Tabs` 组织同一位置的不同页面，`Collapsible` 控制独立面板展开，`Accordion` 提供单开或多开分组。它们组合主题、键盘焦点及标题/面板语义，并显式选择隐藏内容的生命周期。[Tabs 与折叠容器](/ui/containers)分别提供在线示例。

## 共享交互

`createControllableState` 统一受控与非受控值，可适配 `value`、`checked`、`open` 三组控件属性。`createPressable` 绑定已有 Piant 节点，提供 hover、按压和禁用状态，处理控件内释放、移出返回、取消及销毁。

这两个原语不包含视觉 Button、键盘、焦点或辅助技术语义。参数与回调的响应式转发、手势规则及在线示例见[受控状态与按压行为](/ui/interactions)。

## 焦点与语义

`UIProvider` 为注册项提供焦点作用域；`createFocusable` 协调 Canvas 语义代理与原生 Input，提供 Tab 导航、focus-visible 和键盘激活。`createRovingFocusGroup` 让组内控件共用一个 Tab 停靠项，并用箭头/Home/End 移动焦点。Canvas 焦点环仍由组件显式绘制。接入方式、作用域隔离与验证边界见[焦点与语义桥接](/ui/focus)。

## 浮层底座

`OverlayHost` 为每个挂载实例建立独立浮层栈；`createOverlay` 管理打开状态、视觉面、关闭策略和模态焦点，`createOverlayAnchor` 将 Canvas 节点接入 viewport 定位。锚定、嵌套、带输入的模态宿主与双 Canvas 示例见[浮层底座与实例隔离](/ui/overlays)。这是组合浮层组件的底座，调用方仍负责内容和业务语义。

## 使用 Spacer

<LiveExample example="uiSpacer" title="Spacer：响应式固定间距与填充留白" :height="320" />

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

在浏览器点击「Increase gap」观察间距变化；点击「Unmount」检查画布移除、节点销毁和响应式订阅清理。访问 `/theme.html` 查看主题消费场景，访问 `/pressable.html` 查看交互原语消费场景，访问 `/foundations.html` 查看七个基础组件的组合预览并操作主题、进度、窄容器、缩放和卸载；`/buttons.html` 提供 Button/IconButton 的键盘、事件替换、禁用与反复加载验证；`/selection.html` 提供选择控件组合验证；`/textFields.html` 提供 TextField/Field 的编辑、标签、错误、主题、选区与卸载检查。示例源码位于 [GitHub](https://github.com/sumy7/piant/tree/main/examples/ui-smoke)。

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

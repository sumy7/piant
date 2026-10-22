# API 参考总览

本节按用途导航 `@piant/core` 主入口的公共导出。以下清单覆盖主入口的运行时导出与显式导出的类型名；各 API 的详细说明见对应参考页或指南。`@piant/hooks`、`@piant/animation`、`@piant/router`、`@piant/store` 是独立包，不属于 core 导出。

## 组件

| 导出 | 文档 |
|------|------|
| `View`、`Image`、`Text`、`Span`、`Img`、`ScrollView`、`CustomView` | [组件 API](/reference/components) |
| `Input` | [Input API](/reference/components#input)、[指南与在线示例](/guide/components/input) |
| `Show`、`For`、`Index`、`Switch`、`Match`、`Dynamic`、`ErrorBoundary` | [控制流组件 API](/reference/components#show) |
| `Transition`、`TransitionGroup` | [过渡组件 API](/reference/components#transition-与-transitiongroup)、[完整指南](/guide/control-flow/transition) |

组件类型：`InputProps`、`TextProps`、`TransitionProps`、`TransitionEvents`、`TransitionGroupProps`。

## 响应式与生命周期

| 导出 | 用途 |
|------|------|
| `createState`、`createEffect`、`createMemo`、`createSelector` | [响应式原语](/reference/reactivity) |
| `createContext`、`useContext` | [上下文](/reference/reactivity#createcontext) |
| `onMount`、`onCleanup`、`onError` | [生命周期钩子](/guide/lifecycle) |
| `onTick` | [逐帧回调](/guide/lifecycle#ontick) |
| `root`、`memo` | 底层响应式作用域与 memo；常规组件使用 `render` 和 `createMemo` |
| `lookup` | 底层上下文查找；常规组件使用 `useContext` |

响应式类型：`Context`、`Fn`、`RootFn`、`EffectFn`、`UpdateFn`、`Getter`、`Setter`、`EffectOptions`、`MemoOptions`。

## 渲染与节点

| 导出 | 用途 |
|------|------|
| `mount` | [应用挂载与销毁](/reference/renderer#mount)，第二个参数传入容器或已有 Canvas，支持响应式 CSS 和多个实例 |
| `render`、`PRoot` | [底层渲染与清理边界](/reference/renderer#render)；`render` 返回 disposer |
| `PNode` | 底层节点基类，也是 `render` 的挂载参数类型 |
| `PScrollView` | [滚动节点与方法](/guide/components/scrollview) |
| `createComponent`、`dynamicProperty`、`mergeProps` | JSX 编译辅助函数，通常由 Babel 预设生成调用 |

挂载类型：`MountOptions`、`MountedApp`。

滚动类型：`ScrollAlignment`、`ScrollIntoViewOptions`。

`PInput`、`PView`、`PText` 等节点类没有从主入口直接导出。组件的 `ref` 参数可自动推导对应节点类型，无需深层导入。

## 样式与事件类型

| 导出 | 文档 |
|------|------|
| `StyleSheet` | [样式 API](/reference/stylesheet) |
| `LayoutStyles`、`VisualStyles`、`ViewStyles`、`ImageStyles`、`TextStyles`、`TextViewStyles` | [样式指南](/guide/styling/stylesheet) |
| `StyleValue`、`StyleObject`、`StyleEntry`、`StyleReference`、`StyleSheetDefinition`、`ResolvedStyleSheet` | [样式类型](/reference/stylesheet) |
| `PixiEventHandler`、`PixiEventProp`、`PixiEventProps` | [事件 Props](/reference/components#事件-props-pixieventprops) |

类型使用 `import type { ... } from '@piant/core'` 导入。`@piant/core/jsx-runtime` 提供 JSX 类型入口，JSX 转换仍需配置 [Babel 预设](/guide/installation)。

## 其他包

- [Animation](/animation/introduction) — `@piant/animation`
- [Router](/router/introduction) — `@piant/router`
- [Store](/store/introduction) — `@piant/store`
- [Hooks](/hooks/introduction) — `@piant/hooks` 键盘交互

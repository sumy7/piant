# @piant/animation 简介

`@piant/animation` 是 Piant 生态中的动画包，参考 [Web Animation API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) 设计，底层由 [popmotion](https://popmotion.io/) 驱动，帧循环依托 Pixi.js 的 `Ticker`。

## 核心特点

- **Web Animation API 风格**：`play`、`pause`、`cancel`、`finish`、`reverse`、`playState`、`currentTime`，以及 `finished` Promise——熟悉的接口，极低学习成本。
- **Keyframe 动画**：支持数组式关键帧与属性索引式关键帧（`PropertyIndexedKeyframes`），可精确控制每段的缓动曲线。
- **丰富的缓动支持**：内置 `linear`、`ease`、`ease-in`、`ease-out`、`ease-in-out`、`cubic-bezier(…)` 及 popmotion 专属缓动（`backIn`、`anticipate` 等）。
- **与布局无缝集成**：位移（`x`/`y`）不修改 Yoga Flexbox 布局值，仅叠加偏移；`opacity`/`width` 等样式属性通过 `setStyle()` 正确触发布局更新。
- **Pixi.js Ticker 驱动**：与渲染帧完全同步，无需 `requestAnimationFrame` 手动管理。
- **状态与预设**：`bindAnimation` 自动补间响应式目标，`fade` / `slide` / `scale` 直接接入 `Transition`。
- **编排与交互**：`sequence` / `stagger` 惰性启动任务；`hover` / `press` / `drag` 按实例管理事件与清理。
- **路由切场**：`RouteView` 可选择启用同一套过渡 hooks，支持加载、错误和快速导航状态。

## 在线体验

点击方块或「重播动画」，观察透明度从 0 逐渐变为 1。想体验内容进入、离开和列表增删，继续查看 [Transition 与 TransitionGroup](/guide/control-flow/transition) 的在线示例。

<LiveExample example="animation" title="点击播放淡入动画" />

## 可动画属性

| 类别     | 属性                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 位移     | `x`、`y`                                                                                                                              |
| 缩放     | `scale`、`scaleX`、`scaleY`                                                                                                           |
| 旋转     | `rotation`（弧度）                                                                                                                    |
| 透明度   | `alpha`、`opacity`                                                                                                                    |
| 视觉样式 | `backgroundColor`、`borderRadius`、`borderTopLeftRadius`、`borderTopRightRadius`、`borderBottomRightRadius`、`borderBottomLeftRadius` |
| 尺寸     | `width`、`height`                                                                                                                     |

> **`alpha` vs `opacity`**：`alpha` 设置 Pixi 透明度覆盖值，`opacity` 通过 `setStyle` 触发布局更新。低层动画是否在结束后恢复由 `fill` 决定；状态绑定保持目标值。两者均可动画，建议优先使用 `alpha`。

## 安装

```bash
pnpm add @piant/animation @piant/core "pixi.js@^8.22.0"
```

> Peer 依赖为 `@piant/core ^0.1.0` 和 `pixi.js ^8.22.0`。本包仅提供 ESM 入口，使用 `import` 导入。

## 引入方式

### 挂载原型方法（推荐）

```ts
// 在入口文件中导入一次，整个应用均可使用 node.animate()
import '@piant/animation';
```

之后任意 `PNode`（`View`、`Image`、`Text` 等的底层节点）都会拥有 `.animate()` 方法。

### 独立函数

```ts
import { animate } from '@piant/animation';

const anim = animate(node, keyframes, options);
```

## 下一步

- [快速开始](./quick-start) — 常见动画场景示例
- [API 参考](./api) — 完整 API 文档
- [路由切场](/router/transitions) — 路由、加载与错误界面过渡

# TODO / Roadmap

> 目标：围绕 Piant 的核心能力（Canvas 渲染、响应式、组件生态）继续完善产品化能力。
>
> 状态核对：2026-10-22（[COD-148](https://linear.app/codepuppies/issue/COD-148)）。下方带日期的进展与测试数量保留历史语境；源码/测试/示例已存在与人工、浏览器、性能验收分别记录。

## P0 - 核心体验持续增强

### 1. 文本布局增强（优先）

参考：[文本布局实现说明](packages/core/src/elements/text/README.md)

- [ ] 补齐 README 中已列出的文本能力
  - [x] letter spacing
  - [x] 基础自动断行与 `keep-all`（`normal` / 兼容值 `break-word` 使用默认断行，不代表独立 CSS `break-all` / `break-word` 模式）
  - [x] ellipsis
  - [ ] decoration (underline / strikethrough)，见 [COD-132](https://linear.app/codepuppies/issue/COD-132)
- [x] 为 Text 增加对应 style/API（仅在必要时新增）
- [x] 增加回归测试（覆盖中英文、换行、极窄容器、长文本）
- [x] 提供示例页面（建议新增 `examples/text-layout` 对应演示场景）
- [x] 更新文档
  - [x] `docs/guide/components/text.md`
  - [x] `docs/reference/components.md`

验收标准：

- [x] `pnpm --filter @piant/core exec vitest run` 通过
- [ ] 新增能力在示例中可视化验证通过
- [ ] 文档与 API 行为一致

进展备注（2026-04-12）：

- 已支持 `textOverflow` + `lineClamp`（含 `ellipsis` 截断逻辑）
- 已补充 `Typesetter` 相关回归测试并通过 core 全量测试
- 已更新 `examples/text-layout` 增加独立 Text overflow 演示
- 已支持 `letterSpacing` 与 `wordBreak`（基于 pretext 布局能力）
- 已补充 Text 指南与组件 API 文档中的 `letterSpacing` / `lineClamp` / `textOverflow` 说明

核对备注（2026-10-22）：

- [Typesetter](packages/core/src/elements/text/index.ts) 将段落级 `wordBreak: 'keep-all'` 交给 pretext，其余字符串回退到 `normal`；`whiteSpace` 支持 `normal` / `pre-wrap`。[断行测试](packages/core/tests/typesetter.test.ts) 与 [绘制测试](packages/core/tests/typesetter.renderTo.test.ts) 覆盖跨样式片段、空白、字距与截断，不能替代示例视觉验收。
- [Text 指南](docs/guide/components/text.md) 已说明上述边界；下划线、删除线仍未实现，完整文本能力与视觉验收保持未勾选。

---

## P1 - 新包能力建设

### 2. 新包：@piant/router（路由库）

MVP 范围：

- [x] 创建包目录：`packages/router`
- [x] 路由状态模型（path / params / query）
- [x] 核心 API：`createRouter`、`RouterProvider`、`useRoute`、`useNavigate`、`RouteView`
- [x] 基础匹配能力（静态路径 + 动态参数）
- [x] 最小示例（已新增 `examples/router-basic`）

增强项（第二阶段）：

- [x] 嵌套路由与 layout route
- [x] 路由守卫与重定向
- [x] 懒加载页面组件
- [x] 错误边界联动

验收标准：

- [x] 新包可独立构建与类型导出
- [x] 至少 1 个完整示例可运行
- [x] 路由匹配/跳转/参数解析有测试覆盖

进展备注（2026-04-12）：

- 已新增 `packages/router`（含 `rslib` 构建配置、`vitest` 配置、类型导出）
- 已实现 `createRouter`、`RouterProvider`、`useRoute`、`useRouter`、`useNavigate`、`RouteView`、`RouterErrorBoundary`
- 已完成路由匹配与导航相关单测（`tests/router.matching.test.ts`、`tests/router.navigation.test.ts`）并通过
- 已实现二期增强能力：嵌套/布局路由、守卫重定向、懒加载组件、Router 错误边界联动
- 新增二期回归测试：`tests/router.features.test.ts`（覆盖匹配链、重定向、lazy 缓存、lazy 错误态）

### 3. 新包：@piant/devtools（调试插件）

MVP 范围：

- [x] 创建包目录：`packages/devtools`
- [x] 提供运行时调试开关（开发环境）
- [x] 树结构面板：查看组件/元素层级
- [x] 选中节点高亮 + 基础样式信息
- [x] 状态快照（只读）

增强项（第二阶段）：

- [x] 基础布局更新时间线、CPU 布局耗时、Ticker 帧间隔与布局次数（[会话实现](packages/devtools/src/index.ts)、[回归测试](packages/devtools/tests/devtools.test.ts)）
- [ ] 完整渲染更新追踪与性能分析（包括实际渲染耗时，见 [COD-133](https://linear.app/codepuppies/issue/COD-133)）
- [ ] 与浏览器扩展或独立面板对接（[COD-133](https://linear.app/codepuppies/issue/COD-133)）

验收标准：

- [x] 在示例项目中可接入并展示核心调试信息
- [x] 不影响生产构建体积（可按环境剔除）
- [x] 文档包含接入方式与限制说明

进展备注（2026-10-21，COD-133）：

- 已实现元素树（不含函数组件所有权追踪）、选中高亮、样式/布局、显式只读状态源，并基于 `@tanstack/devtools-ui` 提供一期页面内嵌的单层 Piant 底部面板，保留 Elements、State、Performance、Animations 四个功能页。
- Piant 自管入口、停靠、拖动高度与主题，不再挂载 TanStack 工作台；收起后保留面板浏览状态、暂停自动采样并清除高亮，Disconnect 或应用销毁时清理会话。仅保存高度与主题，每次接入遵循 `defaultOpen`。独立窗口、浏览器扩展或远程协议仍属后续范围，上方对应增强项保留未勾选。
- 已提供有界布局更新时间线、CPU 布局耗时、Ticker 帧间隔与布局次数；基础观测已勾选，完整渲染追踪/性能分析仍未勾选，不将这些值等同于 GPU 渲染耗时。
- 已提供显式注册动画的 `playState` / `currentTime`、running 观测帧数与帧间隔总和；不自动捕获所有动画或测量动画引擎执行耗时。动画调试增强项仍保留后续范围。
- 接入与限制见 [DevTools 指南](docs/guide/devtools.md)，真实示例见 `examples/devtools-demo`。Store 历史与恢复（COD-134）已实现，见 [Piant Devtools](docs/devtools/introduction.md)；模板集成（COD-140）仍独立跟踪。

### 4. 新包：@piant/state（状态管理）

MVP 范围：

- [x] 创建包目录：`packages/store`（以 `@piant/store` 发布）
- [x] 核心 API：`createStore`（含 `getState`、`setState`、`subscribe`）
- [x] 与 `@piant/core` MobX 响应式无缝集成（observable state + 自动 action）
- [x] 最小示例（`examples/todos` 已迁移为使用 store）

增强项（第二阶段）：

- [x] middleware 机制（`combine`、`persist`）
- [x] devtools 集成（显式启用的状态历史、预览与恢复，见 [Store 历史指南](docs/devtools/store-history.md)）
- [x] async action 与错误恢复模式（[指南与在线示例](docs/store/async-actions.md)，含重试恢复、最新请求优先与取消回归验证）

验收标准：

- [x] 新包可独立构建与类型导出
- [x] 至少 1 个完整示例可运行（`examples/todos`）
- [x] 状态更新、订阅释放、派生状态有测试覆盖（见 `packages/store/tests`；下方数量为历史记录）

进展备注（2026-04-12）：

- 已新增 `packages/store`（含 rslib 构建配置、vitest 配置、完整类型导出）
- 已实现 `createStore`：MobX observable state，zustand 风格 `set`/`get` API
- 已实现 `combine` middleware：将纯数据状态与 actions creator 合并为单一 store
- 已实现 `persist` middleware：基于 `api.setState` 拦截机制，所有状态更新（含外部调用）均同步至 storage；支持 `partialize`、自定义 `serialize`/`deserialize`、`skipHydration`、`onRehydrateStorage` 回调
- 已完成 42 个测试（`createStore`、`combine`、`persist` 及组合场景）并全部通过
- `examples/todos` 已迁移为使用 `@piant/store` 管理 todo 列表

进展备注（2026-10-22，COD-134）：

- 新增 `createStoreHistory`，显式启用后记录有界数据快照，支持预览、恢复、分支与清理；保留 Store actions 和 observable 根身份，并兼容 `combine` / `persist`。
- `@piant/devtools` 作为独立可选包安装并显式接入，在 State 页操作手动注册的历史。面板与记录器分开清理，不改变普通 Store 的默认行为。
- 当前测试还包括 [历史与恢复](packages/store/tests/history.test.ts) 及 [异步 action](packages/store/tests/asyncActions.test.ts)，后者验证 [COD-135](https://linear.app/codepuppies/issue/COD-135) 的在线示例模型；2026-04-12 的 42 个测试并非当前总数。

### 4.1 新包：@piant/animation（popmotion + WAAPI 风格接口）

目标：提供与 `@piant/core` 协同的动画库，继续沉淀可复用效果与声明式 API。基础实现采用 popmotion 工具与 Pixi Ticker，无需因早期 motion 计划命名而更换引擎。

MVP 范围：

- [x] 创建包目录：`packages/animation`
- [x] 基础动画：位移 / 透明度 / 缩放，以及通过 `Transition` / `TransitionGroup` hooks 实现进入 / 离开
- [x] 基础核心 API：`animate`、`PNode.animate()`、`PNodeAnimation`（关键帧、播放控制与 `finished`）
- [ ] 状态变化自动驱动补间的声明式接入（早期 `createMotion` / `MotionView` / `useMotion` 计划的未完成部分，见 [COD-136](https://linear.app/codepuppies/issue/COD-136)）
- [ ] 可复用的基础预设效果集（`fade`、`slide`、`scale`，见 [COD-136](https://linear.app/codepuppies/issue/COD-136)）
- [x] 最小示例（已新增 `examples/animation-demo`）

增强项（第二阶段）：

- [ ] 可复用的动画编排接口（sequence / stagger，手写 `await finished` 不等于编排 API，见 [COD-137](https://linear.app/codepuppies/issue/COD-137)）
- [ ] 手势与交互动画封装（hover / press / drag，见 [COD-138](https://linear.app/codepuppies/issue/COD-138)）
- [ ] 路由切场动画（与 `@piant/router` 协同，见 [COD-139](https://linear.app/codepuppies/issue/COD-139)）
- [x] 显式注册动画的播放状态、当前时间与 running 观测帧统计（[DevTools 指南](docs/guide/devtools.md)、[测试](packages/devtools/tests/devtools.test.ts)）
- [ ] 动画引擎执行耗时与自动捕获等调试增强（[COD-133](https://linear.app/codepuppies/issue/COD-133)；现有帧间隔不等同于执行耗时）

验收标准：

- [x] `@piant/animation` 可独立构建与类型导出
- [x] 已提供 enter/exit 与 `createState` 切换子节点的完整示例源码（`examples/animation-demo`）
- [ ] 示例浏览器运行与视觉验收（含状态自动驱动补间，后者仍待 [COD-136](https://linear.app/codepuppies/issue/COD-136)）
- [x] 核心动画行为有测试覆盖（触发时机、结束回调、清理逻辑）
- [ ] 在不启用动画时无额外行为回归（对现有组件渲染零影响）
- [x] 文档包含现有 API、手写关键帧效果与 `@piant/core` / `Transition` 集成
- [ ] 文档包含可复用预设与 `@piant/router` 集成（[COD-136](https://linear.app/codepuppies/issue/COD-136)、[COD-139](https://linear.app/codepuppies/issue/COD-139)）

核对依据（2026-10-22）：

- [公开 API](packages/animation/src/index.ts)、[动画实现](packages/animation/src/PNodeAnimation.ts) 与 [动画指南](docs/animation/introduction.md) 已对应当前方案；原计划中的基础节点动画已实现，声明式状态绑定与预设仍缺失。
- [动画测试](packages/animation/tests/animation.test.ts)、[集成测试](packages/animation/tests/integration.test.ts) 以及 [Transition](packages/core/tests/components.Transition.test.ts) / [TransitionGroup 测试](packages/core/tests/components.TransitionGroup.test.ts) 已覆盖基础生命周期；不据此勾选未启用动画时的完整渲染回归。
- [Transition 示例](examples/animation-demo/src/TransitionDemo.tsx) / [列表示例](examples/animation-demo/src/TransitionGroupDemo.tsx) 通过 `createState` 改变子节点，并在 hooks 中手写关键帧；这与自动监听状态并补间任意属性的高级 API 有不同范围。现有 [快速开始](docs/animation/quick-start.md) 展示的串联与 fade / slide / scale 同样是手写方式。

---

## P2 - 生态与上手效率

### 5. startup 项目模板

目标：降低新项目接入门槛，统一工程配置。

- [x] 创建脚手架入口（`packages/create-piant`，以 `create-piant` 发布）
- [x] 模板内容
  - [x] 基础应用模板（单页，`template-basic`）
  - [ ] 路由模板（依赖 `@piant/router`，见 [COD-140](https://linear.app/codepuppies/issue/COD-140)）
  - [ ] 含调试模板（可选 `@piant/devtools`，见 [COD-140](https://linear.app/codepuppies/issue/COD-140)）
- [x] 默认集成 JSX preset（`@piant/babel-preset-piant`）
- [x] 默认 rsbuild 配置与 TypeScript 配置
- [x] 初始化后可一键运行（`pnpm install` + `pnpm dev`）

验收标准：

- [ ] 从零创建项目后 3 分钟内完成首屏渲染
- [x] 模板项目通过 lint 与构建
- [x] 文档提供完整"创建-运行-发布"流程

进展备注（2026-04-21）：

- 已新增 `packages/create-piant`（CLI 入口 `index.js`，支持 `pnpm create piant`）
- 已创建 `template-basic` 基础应用模板（rsbuild + @piant/core + TypeScript）
- CLI 交互式询问项目名、复制模板、替换包名、输出操作提示
- 已更新 `docs/guide/quick-start.md` 与 `docs/guide/installation.md` 说明创建流程

---

## 跨任务通用要求

- [ ] 代码变更遵循仓库约定（TypeScript + Biome + 现有命名）
- [ ] Core 行为变更必须附带 Vitest 用例
- [ ] 对外 API/行为变化需同步 docs（避免文档与实现漂移）
- [ ] 按 Changesets 维护版本变更记录

## 建议执行顺序

1. 文本布局增强（补齐核心能力，提升现有体验）
2. @piant/router MVP（打通多页面/状态切换场景）
3. @piant/animation MVP（补齐 motion 动效能力，提升交互表现）
4. @piant/state MVP（沉淀可复用状态模型，支撑中大型应用）
5. @piant/devtools MVP（提升开发调试效率）
6. startup 模板（沉淀最佳实践，降低入门成本）

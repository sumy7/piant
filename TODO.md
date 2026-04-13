# TODO / Roadmap

> 目标：围绕 Piant 的核心能力（Canvas 渲染、响应式、组件生态）继续完善产品化能力。

## P0 - 核心体验持续增强

### 1. 文本布局增强（优先）

参考：`packages/core/src/elements/text/README.md`

- [ ] 补齐 README 中已列出的文本能力
  - [ ] letter spacing
  - [ ] break words
  - [x] ellipsis
  - [ ] decoration (underline / strikethrough)
- [ ] 为 Text 增加对应 style/API（仅在必要时新增）
- [x] 增加回归测试（覆盖中英文、换行、极窄容器、长文本）
- [x] 提供示例页面（建议新增 `examples/text-layout` 对应演示场景）
- [ ] 更新文档
  - [ ] `docs/guide/components/text.md`
  - [ ] `docs/reference/components.md`

验收标准：

- [ ] `pnpm --filter @piant/core exec vitest run` 通过
- [ ] 新增能力在示例中可视化验证通过
- [ ] 文档与 API 行为一致

进展备注（2026-04-12）：

- 已支持 `textOverflow` + `lineClamp`（含 `ellipsis` 截断逻辑）
- 已补充 `Typesetter` 相关回归测试并通过 core 全量测试
- 已更新 `examples/text-layout` 增加独立 Text overflow 演示

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

- [ ] 新包可独立构建与类型导出
- [ ] 至少 1 个完整示例可运行
- [ ] 路由匹配/跳转/参数解析有测试覆盖

进展备注（2026-04-12）：

- 已新增 `packages/router`（含 `rslib` 构建配置、`vitest` 配置、类型导出）
- 已实现 `createRouter`、`RouterProvider`、`useRoute`、`useRouter`、`useNavigate`、`RouteView`、`RouterErrorBoundary`
- 已完成路由匹配与导航相关单测（`tests/router.matching.test.ts`、`tests/router.navigation.test.ts`）并通过
- 已实现二期增强能力：嵌套/布局路由、守卫重定向、懒加载组件、Router 错误边界联动
- 新增二期回归测试：`tests/router.features.test.ts`（覆盖匹配链、重定向、lazy 缓存、lazy 错误态）

### 3. 新包：@piant/devtools（调试插件）

MVP 范围：

- [ ] 创建包目录：`packages/devtools`
- [ ] 提供运行时调试开关（开发环境）
- [ ] 树结构面板：查看组件/元素层级
- [ ] 选中节点高亮 + 基础样式信息
- [ ] 状态快照（只读）

增强项（第二阶段）：

- [ ] 时间线（渲染更新事件）
- [ ] 性能统计（帧耗时、更新次数）
- [ ] 与浏览器扩展或独立面板对接

验收标准：

- [ ] 在示例项目中可接入并展示核心调试信息
- [ ] 不影响生产构建体积（可按环境剔除）
- [ ] 文档包含接入方式与限制说明

### 4. 新包：@piant/state（状态管理）

MVP 范围：

- [x] 创建包目录：`packages/store`（以 `@piant/store` 发布）
- [x] 核心 API：`createStore`（含 `getState`、`setState`、`subscribe`）
- [x] 与 `@piant/core` MobX 响应式无缝集成（observable state + 自动 action）
- [x] 最小示例（`examples/todos` 已迁移为使用 store）

增强项（第二阶段）：

- [x] middleware 机制（`combine`、`persist`）
- [ ] devtools 集成（状态快照与时间旅行基础能力）
- [ ] async action 与错误恢复模式

验收标准：

- [x] 新包可独立构建与类型导出
- [x] 至少 1 个完整示例可运行（`examples/todos`）
- [x] 状态更新、订阅释放、派生状态有测试覆盖（42 个用例）

进展备注（2026-04-12）：

- 已新增 `packages/store`（含 rslib 构建配置、vitest 配置、完整类型导出）
- 已实现 `createStore`：MobX observable state，zustand 风格 `set`/`get` API
- 已实现 `combine` middleware：将纯数据状态与 actions creator 合并为单一 store
- 已实现 `persist` middleware：基于 `api.setState` 拦截机制，所有状态更新（含外部调用）均同步至 storage；支持 `partialize`、自定义 `serialize`/`deserialize`、`skipHydration`、`onRehydrateStorage` 回调
- 已完成 42 个测试（`createStore`、`combine`、`persist` 及组合场景）并全部通过
- `examples/todos` 已迁移为使用 `@piant/store` 管理 todo 列表

### 4.1 新包：@piant/animation（基于 motion 的动画能力）

目标：提供与 `@piant/core` 无缝协同的动画库，沉淀一套可复用的 motion 动画效果与声明式 API。

MVP 范围：

- [ ] 创建包目录：`packages/animation`
- [ ] 集成 motion 核心能力（进入/离开/位移/透明度/缩放）
- [ ] 核心 API：`createMotion`、`MotionView`、`useMotion`（命名可微调）
- [ ] 支持与 `createState` 联动驱动动画（状态变化触发补间）
- [ ] 提供基础预设效果集（`fade`、`slide`、`scale`）
- [ ] 最小示例（建议新增 `examples/animation-basic`）

增强项（第二阶段）：

- [ ] 动画编排能力（sequence / stagger）
- [ ] 手势与交互动画（hover / press / drag）
- [ ] 路由切场动画（与 `@piant/router` 协同）
- [ ] 动画调试信息（播放状态、耗时、帧统计）

验收标准：

- [ ] `@piant/animation` 可独立构建与类型导出
- [ ] 至少 1 个完整示例可运行，覆盖 enter/exit + 状态驱动动画
- [ ] 核心动画行为有测试覆盖（触发时机、结束回调、清理逻辑）
- [ ] 在不启用动画时无额外行为回归（对现有组件渲染零影响）
- [ ] 文档包含 API、预设效果、与 `@piant/core`/`@piant/router` 的集成方式

---

## P2 - 生态与上手效率

### 5. startup 项目模板

目标：降低新项目接入门槛，统一工程配置。

- [ ] 创建脚手架入口（建议：`scripts/create-piant-app` 或独立包）
- [ ] 模板内容
  - [ ] 基础应用模板（单页）
  - [ ] 路由模板（依赖 `@piant/router`）
  - [ ] 含调试模板（可选 `@piant/devtools`）
- [ ] 默认集成 JSX preset（`@piant/babel-preset-piant`）
- [ ] 默认 rsbuild 配置与 TypeScript 配置
- [ ] 初始化后可一键运行（`pnpm install` + `pnpm dev`）

验收标准：

- [ ] 从零创建项目后 3 分钟内完成首屏渲染
- [ ] 模板项目通过 lint 与构建
- [ ] 文档提供完整“创建-运行-发布”流程

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

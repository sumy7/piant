# TODO / Roadmap

> 目标：围绕 Piant 的核心能力（Canvas 渲染、响应式、组件生态）继续完善产品化能力。

## P0 - 核心体验持续增强

### 1. 文本布局增强（优先）

参考：`packages/core/src/elements/text/README.md`

- [ ] 补齐 README 中已列出的文本能力
  - [ ] letter spacing
  - [ ] break words
  - [ ] ellipsis
  - [ ] decoration (underline / strikethrough)
- [ ] 为 Text 增加对应 style/API（仅在必要时新增）
- [ ] 增加回归测试（覆盖中英文、换行、极窄容器、长文本）
- [ ] 提供示例页面（建议新增 `examples/text-layout` 对应演示场景）
- [ ] 更新文档
  - [ ] `docs/guide/components/textview.md`
  - [ ] `docs/reference/components.md`

验收标准：

- [ ] `pnpm --filter @piant/core exec vitest run` 通过
- [ ] 新增能力在示例中可视化验证通过
- [ ] 文档与 API 行为一致

---

## P1 - 新包能力建设

### 2. 新包：@piant/router（路由库）

MVP 范围：

- [ ] 创建包目录：`packages/router`
- [ ] 路由状态模型（path / params / query）
- [ ] 核心 API：`createRouter`、`RouterProvider`、`useRoute`、`Link`
- [ ] 基础匹配能力（静态路径 + 动态参数）
- [ ] 最小示例（建议新增 `examples/router-basic`）

增强项（第二阶段）：

- [ ] 嵌套路由与 layout route
- [ ] 路由守卫与重定向
- [ ] 懒加载页面组件
- [ ] 错误边界联动

验收标准：

- [ ] 新包可独立构建与类型导出
- [ ] 至少 1 个完整示例可运行
- [ ] 路由匹配/跳转/参数解析有测试覆盖

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

- [ ] 创建包目录：`packages/state`
- [ ] 核心 API：`createStore`、`useStore`、`Provider`
- [ ] 支持细粒度订阅与派生状态（避免整树无效更新）
- [ ] 与 `@piant/core` 组件生命周期对齐（挂载/卸载清理）
- [ ] 最小示例（建议新增 `examples/state-basic`）

增强项（第二阶段）：

- [ ] middleware / plugin 机制（日志、持久化、调试）
- [ ] devtools 集成（状态快照与时间旅行基础能力）
- [ ] async action 与错误恢复模式

验收标准：

- [ ] 新包可独立构建与类型导出
- [ ] 至少 1 个完整示例可运行
- [ ] 状态更新、订阅释放、派生状态有测试覆盖

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
3. @piant/state MVP（沉淀可复用状态模型，支撑中大型应用）
4. @piant/devtools MVP（提升开发调试效率）
5. startup 模板（沉淀最佳实践，降低入门成本）

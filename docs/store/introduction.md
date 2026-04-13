# @piant/store 简介

`@piant/store` 是 Piant 生态中的状态管理包，基于 [MobX](https://mobx.js.org/) 实现，提供类 [Zustand](https://github.com/pmndrs/zustand) 风格的 API。

## 核心特点

- **零样板**：用一个 `createStore` 调用同时定义数据与动作，无需手写 actions/reducers/mutations。
- **天然响应式**：store 状态是 MobX observable，在 Piant 组件中直接访问即可获得自动响应式更新。
- **Zustand 风格**：熟悉的 `set` / `get` API，易于迁移或上手。
- **TypeScript 友好**：完整泛型类型推导，无需额外配置。

## 适用场景

| 场景 | 推荐方案 |
|------|----------|
| 单组件局部状态 | `createState`（`@piant/core`） |
| 跨组件 / 跨页面共享状态 | `@piant/store` |
| 复杂异步数据流 | `@piant/store` + 自定义异步 action |

## 与 `createState` 的区别

`createState` 是 `@piant/core` 提供的轻量状态原语，适合单个值的局部状态管理。`@piant/store` 专为**多字段、有业务逻辑、需要在多处共享**的状态而设计，将数据和操作内聚在同一个 store 对象中。

## 安装

```bash
pnpm add @piant/store
```

> `@piant/store` 以 `mobx` 作为 peerDependency，使用前请确保已安装 `mobx@>=6`。
> 如果你的项目已经使用了 `@piant/core`，mobx 已经作为其依赖被安装。

## 下一步

- [快速开始](./quick-start) — 5 分钟上手第一个 store
- [API 参考](./api) — 完整 API 文档

# @piant/store 简介

`@piant/store` 是 Piant 生态中的状态管理包，基于 [MobX](https://mobx.js.org/) 实现，提供类 [Zustand](https://github.com/pmndrs/zustand) 风格的 API。

## 核心特点

- **零样板**：用一个 `createStore` 调用同时定义数据与动作，无需手写 actions/reducers/mutations。
- **天然响应式**：store 状态是 MobX observable，在 Piant 组件中直接访问即可获得自动响应式更新。
- **Zustand 风格**：熟悉的 `set` / `get` API，易于迁移或上手。
- **TypeScript 友好**：完整泛型类型推导，无需额外配置。
- **可选历史记录**：显式启用 `createStoreHistory` 后记录状态，按需接入独立的 [Piant Devtools](/devtools/store-history) 预览与恢复；普通 Store 不自动记录。

## 在线体验

先点击加减按钮，观察两个组件如何同步读取同一份状态。异步加载与失败重试可继续体验[异步 action 示例](./async-actions)，恢复旧状态可体验[Store 历史示例](/devtools/store-history#在线体验状态恢复)。

<LiveExample example="store" title="两个组件，共享一份状态" />

## 适用场景

| 场景                    | 推荐方案                           |
| ----------------------- | ---------------------------------- |
| 单组件局部状态          | `createState`（`@piant/core`）     |
| 跨组件 / 跨页面共享状态 | `@piant/store`                     |
| 复杂异步数据流          | `@piant/store` + 自定义异步 action |

## 与 `createState` 的区别

`createState` 是 `@piant/core` 提供的轻量状态原语，适合单个值的局部状态管理。`@piant/store` 专为**多字段、有业务逻辑、需要在多处共享**的状态而设计，将数据和操作内聚在同一个 store 对象中。

## 安装

```bash
pnpm add @piant/store "mobx@^6.16.1"
```

> `@piant/store` 的 MobX peer 兼容范围为 `^6.16.1`，请在应用中显式安装。

## 下一步

- [快速开始](./quick-start) — 5 分钟上手第一个 store
- [异步 action 与错误恢复](./async-actions) — 加载、失败重试与并发请求一致性
- [API 参考](./api) — 完整 API 文档

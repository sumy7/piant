# Router 简介

`@piant/router` 为 Piant 提供轻量路由能力，适合在 Canvas 应用中管理页面切换、参数解析与导航状态。

## 你可以得到什么

- 路由上下文接入：`RouterProvider`
- 编程式导航：`router.push` / `router.replace`
- 路径匹配：静态路径与动态参数（如 `/users/:id`）
- 查询参数解析：自动将 query 转为对象
- 嵌套与布局路由：`children` + `RouteView` 渲染链
- 守卫与重定向：`beforeEnter` / `redirect`
- 懒加载页面：`loader` + 组件缓存
- 错误边界联动：`RouterErrorBoundary`

## 适用场景

- 单 Canvas 内多页面切换
- 列表页/详情页参数透传
- URL 与状态同步，便于分享链接

## 当前能力范围

当前版本已覆盖：

- 静态路由、动态参数、query 解析
- 嵌套路由与 layout route
- 路由守卫与重定向
- 懒加载页面组件
- 路由错误边界联动

## 示例

可直接运行 [router-basic 示例](/guide/examples)：

- 展示 Home / User / Search / Not Found 切换
- 展示 params 与 query 实时读取

## 下一步

- 阅读 [快速开始](/router/quick-start)
- 查阅 [API 参考](/router/api)

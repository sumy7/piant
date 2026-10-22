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
- 切场动画：`RouteView.transition` 配合 `fade` / `slide` / `scale` 预设

## 在线体验

点击「首页」「关于」观察淡入淡出，尝试异步页面、加载错误与快速切换。示例使用内存路由，操作不会修改文档的地址或浏览记录。

<LiveExample example="router" title="点击导航，切换画布中的页面" />

## 适用场景

- 单 Canvas 内多页面切换
- 列表页/详情页参数透传
- URL 与状态同步，便于分享链接

## 当前能力范围

支持以下能力：

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

- 阅读 [切场动画](/router/transitions)
- 阅读 [快速开始](/router/quick-start)
- 查阅 [API 参考](/router/api)

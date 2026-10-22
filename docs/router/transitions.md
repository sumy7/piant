# 路由切场动画

`RouteView.transition` 将路由页面、加载中和错误状态交给 core 的 `Transition` 管理。省略该属性时，RouteView 使用默认渲染流程。

```tsx
import { fade } from '@piant/animation';
import { RouteView } from '@piant/router';

<RouteView
  transition={{ ...fade({ duration: 240 }), mode: 'out-in', appear: true }}
  fallback={() => <NotFoundPage />}
  loadingFallback={() => <LoadingPage />}
  errorFallback={(error) => <ErrorPage error={error} />}
/>;
```

使用工厂函数生成 fallback，每次重新进入加载中、错误或未匹配状态时都创建新节点。已离场节点会被渲染器销毁，不能缓存后再次挂载。页面和 fallback 应返回单个 `View` 或 `Text` 根节点，使预设能直接控制节点。

## 切换顺序

`out-in` 等待当前页面退场再展示最新目标；快速导航会取消旧阶段，跳过尚未展示的中间页面。`parallel` 同时进出场，`in-out` 等待新页面入场后再移除旧页面。并行模式中的页面会参与正常布局；需要叠放时，请给页面根节点设置绝对定位，并在外层容器固定切场区域尺寸。

加载中、成功页面和加载错误都使用相同切场规则。守卫取消导航不会切换当前页面；已离开路由的 lazy 结果不会覆盖新页面。页面的响应式资源保留到退场结束，取消阶段返回的清理函数会在替换或卸载时执行。`onEnter`、`onExit` 自定义钩子必须调用 `done()` 完成阶段，可返回取消函数；已取消的 `done()` 会被忽略。

路由组件收到的 `props.route` 是本次页面的快照。需要让离场页保留原参数时使用该快照；`useRoute()` 始终读取最新全局路由。

本页在线示例使用内存路由，支持快速切换、异步加载和错误恢复；`router-basic` 使用浏览器路由，可点击 Back / Forward 或浏览器前进后退按钮检查切场。相同 `fullPath`、匹配链和加载/错误状态不会重复创建页面。动画不改变导航 Promise 的含义：`navigate()` 等待导航决策，不等待切场动画或 lazy 页面加载。

## 在线体验

依次点击首页、关于、异步页面和加载错误，也可以在加载中点击首页，或反复点击快速切换。中间目标被替换后不会再次出现。

<LiveExample example="router" title="淡入淡出、快速导航、lazy 与错误恢复" />

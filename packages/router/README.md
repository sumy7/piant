# @piant/router

Piant 的路由扩展，支持嵌套路由、动态参数、异步组件、导航守卫及 browser / memory 两种历史模式。

## 安装

```bash
pnpm add @piant/router @piant/core "pixi.js@^8.22.0"
```

Peer 依赖为 `@piant/core ^0.2.0`。

本包仅提供 ESM 入口，使用 `import` 导入。

## 使用

在已配置 Piant JSX 的项目中创建路由，并在 `RouterProvider` 中渲染 `RouteView`：

```tsx
import { Text, View } from '@piant/core';
import {
  createRouter,
  RouteView,
  RouterProvider,
  useNavigate,
} from '@piant/router';

function HomePage() {
  const navigate = useNavigate();
  return (
    <View onClick={() => navigate('/about')}>
      <Text>打开关于页面</Text>
    </View>
  );
}

function AboutPage() {
  return <Text>关于 Piant</Text>;
}

const router = createRouter({
  mode: 'memory',
  initialPath: '/',
  routes: [
    { path: '/', component: HomePage },
    { path: '/about', component: AboutPage },
  ],
});

export function App() {
  return (
    <View>
      <RouterProvider router={router}>
        {() => <RouteView fallback={<Text>页面不存在</Text>} />}
      </RouterProvider>
    </View>
  );
}
```

`RouterProvider` 的子树通过函数延迟创建，确保路由 hooks 在上下文中执行。使用 `mode: 'browser'` 可同步浏览器地址栏；部署时需要为应用路由配置服务端回退。

更多用法见 [快速开始](https://piant.sumygg.com/router/quick-start) 和 [API 参考](https://piant.sumygg.com/router/api)。

## 更多信息

- [文档](https://piant.sumygg.com/router/introduction)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

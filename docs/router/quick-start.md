# Router 快速开始

本页演示如何在 Piant 应用中接入 `@piant/router`。

## 使用 Router 模板

从脚手架创建包含首页与动态用户页的应用：

```bash
pnpm create piant my-app --template router --no-devtools
cd my-app
pnpm install
pnpm typecheck
pnpm dev
```

需要调试面板时，将 `--no-devtools` 换成 `--devtools`。使用 npm 时，创建命令为 `npm create piant@latest my-app -- --template router --devtools`。

模板的首页提供用户 42 / 99 的导航，`/users/:id` 页面读取当前参数，并可返回首页；使用浏览器前进、后退可恢复路径。模板采用浏览器 history。开发服务器支持页面回退；部署生产产物时，需配置静态服务器将 `/users/42` 等页面路径回退到 `index.html`，以支持直接访问与刷新。不要把不存在的静态资源请求重写为应用页面。

```bash
pnpm build
pnpm preview
```

下面介绍在已有应用中手动接入。

## 1. 安装

```bash
pnpm add @piant/router
```

先按 [Piant 安装与配置](/guide/installation)安装 Core、PixiJS 并配置 JSX。入口使用 `mount(App, container)` 挂载应用；无需额外创建 PixiJS Application 或全局 resize 处理。

## 2. 创建 Router

```ts
import { createRouter } from '@piant/router';

export const router = createRouter({
  routes: [
    {
      path: '/app',
      component: AppLayout,
      children: [
        { path: '', component: HomePage },
        { path: 'users/:id', loader: () => import('./pages/UserPage') },
      ],
    },
    { path: '/login', component: LoginPage },
  ],
});
```

## 3. 在根组件提供路由上下文

```tsx
import { RouteView, RouterProvider, RouterErrorBoundary } from '@piant/router';
import { View } from '@piant/core';
import { router } from './router';

export function App() {
  return (
    <View>
      <RouterProvider router={router}>
        {() => (
          <RouterErrorBoundary
            fallback={(error) => <ErrorPage error={error} />}
          >
            <RouteView
              fallback={<NotFoundPage />}
              loadingFallback={() => <LoadingPage />}
            />
          </RouterErrorBoundary>
        )}
      </RouterProvider>
    </View>
  );
}
```

`RouterProvider` 的子树使用函数延迟创建，确保 `RouteView`、`useNavigate` 和 `useRoute` 在路由上下文中执行。

## 4. 使用 useNavigate 导航

```tsx
import { Text, View } from '@piant/core';
import { useNavigate } from '@piant/router';

function UserNav() {
  const navigate = useNavigate();

  return (
    <View onClick={() => navigate('/app/users/42')}>
      <Text>Go User 42</Text>
    </View>
  );
}
```

## 5. 读取当前路由状态

```tsx
import { useRoute } from '@piant/router';
import { Text } from '@piant/core';

function RouteInfo() {
  const route = useRoute();
  return (
    <Text>{`path=${route().path}, matches=${route().matches.length}`}</Text>
  );
}
```

<LiveExample example="router" title="在示例内切换路由" />

## 6. 添加守卫与重定向

```ts
const router = createRouter({
  routes: [
    {
      path: '/private',
      beforeEnter: ({ from }) => {
        const authed = checkAuth();
        return authed
          ? true
          : {
              to: '/login?from=' + encodeURIComponent(from.path),
              replace: true,
            };
      },
      component: PrivatePage,
    },
    {
      path: '/legacy',
      redirect: '/app',
    },
  ],
});
```

## 7. 编程式导航（直接操作 Router）

```ts
import { useRouter } from '@piant/router';

function goProfile() {
  const router = useRouter();
  router.push('/users/7');
}
```

## 运行示例

```bash
pnpm --filter @piant/examples-router-basic dev
```

## 路由切场动画

安装 `@piant/animation`，把预设传给 `RouteView.transition`：

```tsx
import { fade } from '@piant/animation';
import { RouteView } from '@piant/router';

<RouteView
  transition={{ ...fade({ duration: 240 }), mode: 'out-in', appear: true }}
  loadingFallback={() => <LoadingPage />}
  errorFallback={(error) => <ErrorPage error={error} />}
/>;
```

参见[路由切场动画](/router/transitions)，了解快速导航、lazy 页面、取消与资源所有权。

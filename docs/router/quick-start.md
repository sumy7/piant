# Router 快速开始

本页演示如何在 Piant 应用中接入 `@piant/router`。

## 1. 安装

在 monorepo 内使用 workspace 依赖：

```json
{
  "dependencies": {
    "@piant/core": "workspace:*",
    "@piant/router": "workspace:*"
  }
}
```

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
        <RouterErrorBoundary fallback={(error) => <ErrorPage error={error} />}>
          <RouteView
            fallback={<NotFoundPage />}
            loadingFallback={<LoadingPage />}
          />
        </RouterErrorBoundary>
      </RouterProvider>
    </View>
  );
}
```

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

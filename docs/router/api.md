# Router API

## createRouter

创建路由实例。

```ts
createRouter(options);
```

参数 `CreateRouterOptions`：

- `routes: RouteRecord[]`
- `mode?: 'browser' | 'memory'`
- `initialPath?: string`

`RouteRecord` 关键字段：

- `path: string`
- `children?: RouteRecord[]`：嵌套路由
- `component?: RouteComponent`：同步页面组件
- `loader?: RouteLoader`：懒加载页面组件
- `redirect?: string | (params, query) => string`：静态/动态重定向
- `beforeEnter?: ({ to, from }) => GuardResult | Promise<GuardResult>`：路由守卫

## Router

`Router` 实例方法：

- `getState(): RouteState`
- `getMatch(path: string): RouteMatch[]`
- `push(path: string): RouteState`
- `replace(path: string): RouteState`
- `navigate(path: string, options?: { replace?: boolean }): Promise<RouteState>`
- `subscribe(listener): () => void`
- `destroy(): void`

## RouteState

```ts
interface RouteState {
  path: string;
  fullPath: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  match: RouteMatch | null;
  matches: RouteMatch[];
  redirectedFrom: string | null;
  loading: boolean;
  error: Error | null;
  components: Record<string, RouteComponent>;
}
```

说明：

- `match`：最后一个匹配（通常是叶子路由）
- `matches`：完整匹配链（用于 layout route 渲染）
- `components`：已就绪组件（含 lazy 缓存结果）

## RouterProvider

将路由状态注入上下文。

```tsx
<RouterProvider router={router}>{children}</RouterProvider>
```

## RouteView

按 `matches` 链渲染路由组件（支持 layout 嵌套）。

```tsx
<RouteView
  fallback={<NotFoundPage />}
  loadingFallback={<LoadingPage />}
  errorFallback={(error) => <ErrorPage error={error} />}
/>
```

Props：

- `fallback?`: 未匹配时内容
- `loadingFallback?`: lazy 加载中内容
- `errorFallback?`: lazy/路由错误时内容
- `transition?: Omit<TransitionProps, 'children'>`：启用切场；支持 `mode`、`appear` 和 `TransitionEvents`。可直接展开 `fade()`、`slide()`、`scale()` 的结果。省略时保持默认渲染行为。

每个启用切场的页面拥有独立资源作用域，离场完成或被替换后清理。进入钩子在节点挂载后的微任务中执行，退出钩子立即执行；`onEnter` / `onExit` 可返回取消函数，取消后的完成回调无效。预设需要单个可动画根节点。详见[切场与取消规则](/router/transitions)。

## useRoute

读取当前路由状态 getter。

```ts
const route = useRoute();
const current = route().fullPath;
```

## useRouter

获取 `Router` 实例，直接调用实例方法。

```ts
const router = useRouter();
await router.navigate('/app/users/42');
```

## useNavigate

轻量导航函数（组件内最常用）。

```ts
const navigate = useNavigate();
navigate('/app/users/42');
navigate('/login', { replace: true });
```

## RouterErrorBoundary

与路由联动的错误边界组件，可在错误时自动跳转。

```tsx
<RouterErrorBoundary
  redirectTo="/error"
  fallback={(error, reset) => <ErrorPage error={error} onRetry={reset} />}
>
  <RouteView fallback={<NotFoundPage />} />
</RouterErrorBoundary>
```

Props：

- `children`: 子树
- `fallback`: 错误兜底内容
- `redirectTo?`: 错误发生后跳转目标
- `replace?`: 是否 replace 跳转（默认 true）
- `onError?`: 错误回调

## 守卫返回值 GuardResult

- `true` / `undefined`：放行
- `false`：阻断并回退到来源路径
- `string`：重定向到该路径
- `{ to, replace? }`：带 replace 选项的重定向

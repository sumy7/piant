# 生命周期钩子

Piant 提供了一组生命周期钩子，用于在组件的不同阶段执行代码。

## onMount

`onMount` 在组件首次挂载（渲染完成）后执行一次，用于执行初始化逻辑。

```tsx
import { onMount, View } from '@piant/core';

function MyComponent() {
  onMount(() => {
    console.log('组件已挂载');
    // 在这里执行初始化，如加载数据、设置计时器等
  });

  return <View />;
}
```

> **注意**：`onMount` 内部使用 `untrack`，不会追踪响应式依赖，仅执行一次。

## onCleanup

`onCleanup` 注册一个清理函数，在以下情况下调用：
- 当前 `effect` 重新执行之前（清理上一次的副作用）
- 组件卸载时

```tsx
import { createEffect, createState, onCleanup } from '@piant/core';

function TimerComponent() {
  const [count, setCount] = createState(0);

  createEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    // 当 effect 重新执行或组件卸载时，清理计时器
    onCleanup(() => clearInterval(timer));
  });

  return <TextView>{count()}</TextView>;
}
```

## onError

`onError` 注册一个错误处理函数，捕获当前 owner 作用域内的错误。通常用于在组件内部处理局部错误，比使用 `ErrorBoundary` 更灵活。

```tsx
import { onError, View } from '@piant/core';

function MyComponent() {
  onError((err) => {
    console.error('组件内捕获到错误:', err);
    // 可以在这里设置状态、发送错误报告等
  });

  return <View />;
}
```

## onTick

`onTick` 注册一个 PixiJS Ticker 回调，在每帧渲染时执行，适合动画、游戏逻辑等需要逐帧更新的场景。

```tsx
import { onTick, createState, View } from '@piant/core';

function AnimatedView() {
  const [rotation, setRotation] = createState(0);

  onTick((ticker) => {
    setRotation((r) => r + ticker.deltaTime * 0.02);
  });

  // ...
}
```

组件卸载时，`onTick` 会通过 `onCleanup` 自动从 Ticker 中移除，无需手动清理。

### 参数

`onTick(callback: TickerCallback<T>)` 接受一个 PixiJS `TickerCallback`，回调参数为 PixiJS `Ticker` 实例：

- `ticker.deltaTime`：距上一帧的时间（以 60fps 为基准的归一化值）
- `ticker.deltaMS`：距上一帧的毫秒数
- `ticker.elapsedMS`：自 ticker 启动以来的总毫秒数

## 生命周期顺序

```
组件函数执行（同步）
    ↓
effect / createEffect 注册（立即执行一次）
    ↓
onMount 执行（一次）
    ↓
状态更新 → effect 重新执行 → onCleanup 清理旧副作用
    ↓
组件卸载 → onCleanup 执行 → 所有 effect 清理
```

## 在 effect 中使用

`onCleanup` 可以在 `createEffect` 内部使用，为每次 effect 执行注册清理：

```tsx
import { createEffect, createState, onCleanup } from '@piant/core';

const [url, setUrl] = createState('/api/data');

createEffect(() => {
  const controller = new AbortController();

  fetch(url(), { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setData(data));

  // 当 url 变化时，取消上一次的请求
  onCleanup(() => controller.abort());
});
```

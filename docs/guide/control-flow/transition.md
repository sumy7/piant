# Transition 与 TransitionGroup

Piant 提供了两个过渡动画组件：`Transition` 和 `TransitionGroup`，用于在 Canvas 元素切换时触发进入/离开生命周期钩子，实现原生画布动画工作流，不依赖任何 DOM/CSS。

两个组件遵循**关注点分离**的设计原则：

- **只负责生命周期管理**（何时触发 enter/exit 钩子）；
- **不自行渲染子元素**——渲染由 `Show`（单元素）和 `For`（列表）负责；
- 生命周期钩子接收的是**已渲染的 JSX 元素**（如 Pixi 容器），可直接用于动画。

---

## Transition

`Transition` 管理单个元素的切换过渡，配合 `Show` 使用。

将 `Show` 的输出传入 `children`，`Transition` 会检测内容切换，并在元素进入/离开时触发钩子。

### 基本用法

```tsx
import { Transition, Show, createState } from '@piant/core';

function Scene() {
  const [isLoggedIn, setIsLoggedIn] = createState(false);

  // 预先创建好 Pixi 元素（稳定引用是正确切换检测的基础）
  const dashboard = Dashboard({});
  const loginScreen = LoginScreen({});

  return Transition({
    mode: 'out-in',
    onBeforeEnter: (el) => { el.alpha = 0; },
    onEnter: (el, done) => animate(el, { alpha: 1 }, { onComplete: done }),
    onExit:  (el, done) => animate(el, { alpha: 0 }, { onComplete: done }),
    // children 是 Show 的输出（响应式 memo），Transition 直接感知切换
    children: Show({
      get when() { return isLoggedIn(); },
      children: dashboard,
      fallback: loginScreen,
    }),
  });
}
```

> **注意**：将 Pixi 元素（`Dashboard({})`、`LoginScreen({})`）在外部**预先创建**，保证每次 Show 求值时返回相同的引用，Transition 才能准确检测元素切换。

### 切换模式（mode）

| 模式 | 说明 |
|------|------|
| `"parallel"`（默认）| 进入与离开动画同时进行 |
| `"out-in"` | 先等旧元素离开完成，再开始新元素进入 |
| `"in-out"` | 先等新元素进入完成，再开始旧元素离开 |

### appear

设置 `appear={true}` 时，初始挂载的元素也会触发进入钩子：

```tsx
Transition({
  appear: true,
  onBeforeEnter: (el) => { el.alpha = 0; },
  onEnter: (el, done) => animate(el, { alpha: 1 }, { onComplete: done }),
  children: Show({ get when() { return visible(); }, children: myView }),
});
```

### 生命周期钩子

```
onBeforeEnter(el)   ← 同步，进入前（el 是将要显示的 Pixi 元素）
onEnter(el, done)   ← 通过 queueMicrotask 调用，调用 done() 标志完成
onAfterEnter(el)    ← done() 调用后触发

onBeforeExit(el)    ← 同步，离开前（el 是将要隐藏的 Pixi 元素）
onExit(el, done)    ← 同步调用，调用 done() 标志完成
onAfterExit(el)     ← done() 调用后触发
```

> **注意**：`done` 回调是幂等的——多次调用只执行一次。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `JSX.Element` | — | 通常为 `Show` 的输出；0-arg 函数（memo）在 effect 内被自动调用并追踪依赖 |
| `mode` | `"parallel" \| "out-in" \| "in-out"` | `"parallel"` | 进入/离开的时序模式 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el) => void` | — | 进入前同步回调，`el` 为渲染元素 |
| `onEnter` | `(el, done) => void` | — | 进入动画回调，调用 `done()` 完成 |
| `onAfterEnter` | `(el) => void` | — | 进入完成后回调 |
| `onBeforeExit` | `(el) => void` | — | 离开前同步回调 |
| `onExit` | `(el, done) => void` | — | 离开动画回调，调用 `done()` 完成 |
| `onAfterExit` | `(el) => void` | — | 离开完成后回调 |

### 返回值

`JSX.Element`（响应式数组）——渲染器直接处理，过渡期间最多同时包含两个元素（进入中 + 离开中）。

### 与 GSAP 集成示例

```tsx
import { gsap } from 'gsap';

const pageA = PageA({});
const pageB = PageB({});
const [showA, setShowA] = createState(true);

return Transition({
  mode: 'out-in',
  onBeforeEnter: (el) => {
    el.alpha = 0;
    el.scale.set(0.9);
  },
  onEnter: (el, done) =>
    gsap.to(el, { alpha: 1, scaleX: 1, scaleY: 1, duration: 0.3, onComplete: done }),
  onExit: (el, done) =>
    gsap.to(el, { alpha: 0, scaleX: 0.9, scaleY: 0.9, duration: 0.3, onComplete: done }),
  children: Show({
    get when() { return showA(); },
    children: pageA,
    fallback: pageB,
  }),
});
```

---

## TransitionGroup

`TransitionGroup` 管理**列表**中元素的增删过渡，配合 `For` 或 `Index` 使用。

将 `For`（或 `Index`）的输出传入 `children`，`TransitionGroup` 检测元素的出现与消失：
- 新出现的元素触发进入钩子；
- 消失的元素保留在输出中，触发离开钩子，直到 `done()` 调用后才从渲染树中移除。

生命周期钩子接收 `For`/`Index` 渲染出的**实际 JSX 元素**（即 `children` 函数的返回值），可直接动画。

### 基本用法

```tsx
import { TransitionGroup, For, createState } from '@piant/core';

function CardList() {
  const [cards, setCards] = createState([
    { id: 1, label: '卡片 A' },
    { id: 2, label: '卡片 B' },
  ]);

  // For 负责列表渲染，TransitionGroup 负责动画生命周期
  return TransitionGroup({
    onBeforeEnter: (el) => { el.alpha = 0; },
    onEnter: (el, done) => animate(el, { alpha: 1 }, { onComplete: done }),
    onExit:  (el, done) => animate(el, { alpha: 0 }, { onComplete: done }),
    children: For({
      get each() { return cards(); },
      children: (card) => CardView({ card }),
    }),
  });
}
```

### 工作原理

`TransitionGroup` 追踪 `For`/`Index` 产生的元素数组变化：

- **新增元素**（出现在 `For` 输出中）：触发进入钩子；
- **移除元素**（从 `For` 输出中消失）：保留在 `TransitionGroup` 输出中，触发离开钩子，`done()` 调用后移除；
- 多个元素可同时处于离开状态（并发动画）；
- 已移除元素若在 `done()` 调用前被重新添加回 `For`，不会重复显示。

### appear

设置 `appear={true}` 时，初始挂载的所有元素都会触发进入钩子：

```tsx
TransitionGroup({
  appear: true,
  onBeforeEnter: (el) => { el.alpha = 0; },
  onEnter: (el, done) => animate(el, { alpha: 1 }, { onComplete: done }),
  children: For({
    get each() { return items(); },
    children: (item) => ItemView({ item }),
  }),
});
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `JSX.Element` | — | `For` 或 `Index` 的输出（响应式 memo/数组）；`TransitionGroup` 追踪其变化 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el) => void` | — | `el` 为 `For`/`Index` 渲染出的 JSX 元素 |
| `onEnter` | `(el, done) => void` | — | 进入动画回调，调用 `done()` 完成 |
| `onAfterEnter` | `(el) => void` | — | 进入完成后回调 |
| `onBeforeExit` | `(el) => void` | — | 离开前同步回调 |
| `onExit` | `(el, done) => void` | — | 离开动画回调，调用 `done()` 完成 |
| `onAfterExit` | `(el) => void` | — | 离开完成后回调 |

### 返回值

`JSX.Element`（响应式数组）——包含当前 `For`/`Index` 活跃元素以及正在执行离开动画的元素。

---

## Transition vs TransitionGroup 对比

| | `Transition` | `TransitionGroup` |
|-|--------------|-------------------|
| 适用场景 | 单个元素切换 | 列表增删 |
| 配合组件 | `Show` | `For` / `Index` |
| `children` 含义 | `Show` 的输出（响应式 memo） | `For`/`Index` 的输出（响应式数组 memo） |
| mode 支持 | `out-in` / `in-out` / `parallel` | 无（进入/离开并发执行） |
| 钩子中 `el` 的类型 | `Show` 返回的 JSX 元素 | `For`/`Index` 的 `children` 函数返回的 JSX 元素 |
| 返回值 | `JSX.Element`（0–2 个元素） | `JSX.Element`（活跃 + 正在离开的元素） |


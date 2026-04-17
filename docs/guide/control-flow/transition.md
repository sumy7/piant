# Transition 与 TransitionGroup

Piant 提供了两个过渡动画组件：`Transition` 和 `TransitionGroup`，用于在 Canvas 元素切换时触发进入/离开生命周期钩子，实现原生画布动画工作流，不依赖任何 DOM/CSS。

这两个组件采用**关注点分离**的设计：
- 它们只负责**生命周期管理**（何时触发 enter/exit）和**维护响应式显示列表**（当前应渲染哪些元素）；
- **实际渲染**交由 `Show`（单元素）和 `For`（列表）负责。

---

## Transition

`Transition` 管理单个元素的切换过渡。接收一个响应式 getter（`each`），当返回值发生变化时触发进入/离开钩子，并返回一个响应式 `T[]`，其中包含当前显示的元素（最多 2 个：进入中 + 离开中）。

### 基本用法

配合 `For` 渲染：

```tsx
import { Transition, For, createState } from '@piant/core';

function Scene() {
  const [page, setPage] = createState<'home' | 'detail'>('home');

  // 只管理生命周期和显示列表，不渲染 children
  const transItems = Transition({
    each: page,               // 直接传入响应式 getter
    mode: 'out-in',
    onBeforeEnter: (p) => { /* 设置初始状态，如 alpha = 0 */ },
    onEnter: (p, done) => animate(p, { alpha: 1 }, { onComplete: done }),
    onExit: (p, done) => animate(p, { alpha: 0 }, { onComplete: done }),
  });

  // 用 For 渲染 transItems() 返回的显示列表
  return For({
    each: transItems(),
    children: (p) => p === 'home' ? HomeView({}) : DetailView({}),
  });
}
```

也可以配合 `Show` 渲染单个元素：

```tsx
const [visible, setVisible] = createState(true);

const transItems = Transition({
  each: () => visible() ? 'content' : null,
  mode: 'out-in',
  onEnter: (_el, done) => { /* 动画 */ done(); },
  onExit: (_el, done) => { /* 动画 */ done(); },
});

return Show({
  when: transItems()[0],
  children: (item) => ContentView({}),
});
```

### 切换模式（mode）

| 模式 | 说明 |
|------|------|
| `"parallel"`（默认）| 进入与离开动画同时进行 |
| `"out-in"` | 先等旧元素离开完成，再开始新元素进入 |
| `"in-out"` | 先等新元素进入完成，再开始旧元素离开 |

### appear

设置 `appear={true}` 时，初始挂载的元素也会触发进入钩子：

```tsx
const transItems = Transition({
  each: page,
  appear: true,
  onBeforeEnter: (p) => { /* ... */ },
  onEnter: (p, done) => { /* ... */ done(); },
});
```

### 生命周期钩子

```
onBeforeEnter(el)          ← 同步，进入前
onEnter(el, done)          ← 通过 queueMicrotask 调用，调用 done() 标志完成
onAfterEnter(el)           ← done() 调用后触发

onBeforeExit(el)           ← 同步，离开前
onExit(el, done)           ← 同步调用，调用 done() 标志完成
onAfterExit(el)            ← done() 调用后触发
```

> **注意**：`done` 回调是幂等的——多次调用只执行一次。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `each` | `() => T \| null` | — | 响应式 getter，返回当前元素（或 null） |
| `mode` | `"parallel" \| "out-in" \| "in-out"` | `"parallel"` | 进入/离开的时序模式 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el: T) => void` | — | 进入前同步回调 |
| `onEnter` | `(el: T, done) => void` | — | 进入动画回调，调用 `done()` 完成 |
| `onAfterEnter` | `(el: T) => void` | — | 进入完成后回调 |
| `onBeforeExit` | `(el: T) => void` | — | 离开前同步回调 |
| `onExit` | `(el: T, done) => void` | — | 离开动画回调，调用 `done()` 完成 |
| `onAfterExit` | `(el: T) => void` | — | 离开完成后回调 |

### 返回值

`Getter<T[]>` — 调用后返回当前显示列表（0–2 个元素），配合 `Show`/`For` 渲染。

### 与 GSAP 集成示例

```tsx
import { gsap } from 'gsap';

const transItems = Transition({
  each: currentPage,
  mode: 'out-in',
  onBeforeEnter: (page) => {
    const container = pageContainers[page];
    container.alpha = 0;
    container.scale.set(0.9);
  },
  onEnter: (page, done) =>
    gsap.to(pageContainers[page], {
      alpha: 1, scaleX: 1, scaleY: 1, duration: 0.3, onComplete: done,
    }),
  onExit: (page, done) =>
    gsap.to(pageContainers[page], {
      alpha: 0, scaleX: 0.9, scaleY: 0.9, duration: 0.3, onComplete: done,
    }),
});

return For({
  each: transItems(),
  children: (page) => PageComponent({ page }),
});
```

---

## TransitionGroup

`TransitionGroup` 管理**列表**中元素的增删过渡。接收一个响应式 getter（`each`），跟踪新增和移除的元素，对新增元素触发进入钩子，对移除元素触发离开钩子，并在离开动画完成前将其保留在显示列表中。返回 `Getter<T[]>`，配合 `For` 渲染。

### 基本用法

```tsx
import { TransitionGroup, For, createState } from '@piant/core';

function CardList() {
  const [cards, setCards] = createState([
    { id: 1, label: '卡片 A' },
    { id: 2, label: '卡片 B' },
  ]);

  // 只管理生命周期和显示列表
  const displayItems = TransitionGroup({
    each: cards,             // 直接传入响应式 getter
    onBeforeEnter: (card) => { /* 设置初始状态 */ },
    onEnter: (card, done) => animate(cardRefs[card.id], { alpha: 1 }, { onComplete: done }),
    onExit: (card, done) => animate(cardRefs[card.id], { alpha: 0 }, { onComplete: done }),
  });

  // 用 For 渲染显示列表（包含正在离开的元素）
  return For({
    each: displayItems(),
    children: (card) => CardView({ card }),
  });
}
```

### 工作原理

- `each` getter 中新增的元素：自动触发进入钩子
- `each` getter 中移除的元素：保留在返回的显示列表中，触发离开钩子，`done()` 调用后才从列表中移除
- 多个元素可同时处于离开状态（并发动画）
- 元素以**引用相等**为 key，同一引用不会重复处理

### appear

与 `Transition` 相同，设置 `appear={true}` 时，初始挂载的所有元素都会触发进入钩子：

```tsx
const displayItems = TransitionGroup({
  each: items,
  appear: true,
  onBeforeEnter: (item) => { /* ... */ },
  onEnter: (item, done) => { /* ... */ done(); },
});
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `each` | `() => T[]` | — | 响应式 getter，返回当前列表 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el: T) => void` | — | 同 `Transition` |
| `onEnter` | `(el: T, done) => void` | — | 同 `Transition` |
| `onAfterEnter` | `(el: T) => void` | — | 同 `Transition` |
| `onBeforeExit` | `(el: T) => void` | — | 同 `Transition` |
| `onExit` | `(el: T, done) => void` | — | 同 `Transition` |
| `onAfterExit` | `(el: T) => void` | — | 同 `Transition` |

### 返回值

`Getter<T[]>` — 调用后返回当前显示列表（活跃元素 + 正在离开的元素），配合 `For` 渲染。

---

## Transition vs TransitionGroup 对比

| | `Transition` | `TransitionGroup` |
|-|--------------|-------------------|
| 适用场景 | 单个元素切换 | 列表增删 |
| `each` 类型 | `() => T \| null` | `() => T[]` |
| 推荐渲染方式 | `Show` 或 `For` | `For` |
| mode 支持 | `out-in` / `in-out` / `parallel` | 无（进入/离开并发执行） |
| 返回值 | `Getter<T[]>`（0–2 个元素） | `Getter<T[]>`（活跃 + 正在离开） |

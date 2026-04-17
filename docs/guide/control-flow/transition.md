# Transition 与 TransitionGroup

Piant 提供了两个过渡动画组件：`Transition` 和 `TransitionGroup`，用于在 Canvas 元素切换时触发进入/离开生命周期钩子，实现原生画布动画工作流，不依赖任何 DOM/CSS。

---

## Transition

`Transition` 是一个无渲染组件，用于单个子元素的切换过渡。当 `children` 发生变化时，`Transition` 会为旧元素触发离开钩子，为新元素触发进入钩子，并根据 `mode` 控制两者的时序。

### 基本用法

```tsx
import { Transition, createState } from '@piant/core';

function Scene() {
  const [view, setView] = createState<'home' | 'detail'>('home');

  return (
    <Transition
      mode="out-in"
      onBeforeEnter={(el) => { el.alpha = 0; }}
      onEnter={(el, done) => animate(el, { alpha: 1 }, { onComplete: done })}
      onExit={(el, done) => animate(el, { alpha: 0 }, { onComplete: done })}
    >
      {view() === 'home' ? <HomeView /> : <DetailView />}
    </Transition>
  );
}
```

### 切换模式（mode）

| 模式 | 说明 |
|------|------|
| `"parallel"`（默认）| 进入与离开动画同时进行 |
| `"out-in"` | 先等旧元素离开完成，再开始新元素进入 |
| `"in-out"` | 先等新元素进入完成，再开始旧元素离开 |

### appear

设置 `appear={true}` 时，初始挂载的子元素也会触发进入钩子：

```tsx
<Transition appear onBeforeEnter={(el) => { el.alpha = 0; }} onEnter={...}>
  <MyView />
</Transition>
```

### 生命周期钩子

```
onBeforeEnter(el)          ← 同步，进入前
onEnter(el, done)          ← 异步（queueMicrotask），用户调用 done() 标志完成
onAfterEnter(el)           ← done() 调用后触发

onBeforeExit(el)           ← 同步，离开前
onExit(el, done)           ← 同步调用，用户调用 done() 标志完成
onAfterExit(el)            ← done() 调用后触发
```

> **注意**：`done` 回调是幂等的——多次调用只执行一次。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `JSX.Element` | — | 要过渡的子元素（支持响应式 getter） |
| `mode` | `"parallel" \| "out-in" \| "in-out"` | `"parallel"` | 进入/离开的时序模式 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el) => void` | — | 进入前同步回调 |
| `onEnter` | `(el, done) => void` | — | 进入动画回调，调用 `done()` 完成 |
| `onAfterEnter` | `(el) => void` | — | 进入完成后回调 |
| `onBeforeExit` | `(el) => void` | — | 离开前同步回调 |
| `onExit` | `(el, done) => void` | — | 离开动画回调，调用 `done()` 完成 |
| `onAfterExit` | `(el) => void` | — | 离开完成后回调 |

### 与 GSAP 集成示例

```tsx
import { gsap } from 'gsap';

<Transition
  mode="out-in"
  onBeforeEnter={(el) => { el.alpha = 0; el.scale.set(0.8); }}
  onEnter={(el, done) =>
    gsap.to(el, { alpha: 1, scaleX: 1, scaleY: 1, duration: 0.3, onComplete: done })
  }
  onExit={(el, done) =>
    gsap.to(el, { alpha: 0, scaleX: 0.8, scaleY: 0.8, duration: 0.3, onComplete: done })
  }
>
  {currentView()}
</Transition>
```

---

## TransitionGroup

`TransitionGroup` 用于**列表**中元素的增删过渡。它管理多个元素同时进入/离开，每个元素在离开动画完成前保持可见。

### 基本用法

```tsx
import { TransitionGroup, createState } from '@piant/core';

function CardList() {
  const [cards, setCards] = createState([
    { id: 1, label: '卡片 A' },
    { id: 2, label: '卡片 B' },
  ]);

  return (
    <TransitionGroup
      each={cards()}
      onBeforeEnter={(el) => { el.alpha = 0; }}
      onEnter={(el, done) => animate(el, { alpha: 1 }, { onComplete: done })}
      onExit={(el, done) => animate(el, { alpha: 0 }, { onComplete: done })}
    >
      {(card) => <CardView key={card.id} label={card.label} />}
    </TransitionGroup>
  );
}
```

### 工作原理

- `each` 数组中新增的元素：自动触发进入钩子
- `each` 数组中移除的元素：保留在渲染输出中，触发离开钩子，`done()` 调用后才真正从 DOM 中移除
- 多个元素可同时处于离开状态（并发动画）
- 元素以**引用相等**为 key，同一引用不会重复创建

### appear

与 `Transition` 相同，设置 `appear={true}` 时，初始挂载的所有元素都会触发进入钩子：

```tsx
<TransitionGroup each={items()} appear onBeforeEnter={...} onEnter={...}>
  {(item) => <ItemView item={item} />}
</TransitionGroup>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `each` | `T[]` | — | 要渲染的数组（支持响应式 getter） |
| `children` | `(item: T) => JSX.Element` | — | 每个元素的渲染函数，每个 item 只调用一次 |
| `appear` | `boolean` | `false` | 初始挂载时是否触发进入钩子 |
| `onBeforeEnter` | `(el) => void` | — | 同 `Transition` |
| `onEnter` | `(el, done) => void` | — | 同 `Transition` |
| `onAfterEnter` | `(el) => void` | — | 同 `Transition` |
| `onBeforeExit` | `(el) => void` | — | 同 `Transition` |
| `onExit` | `(el, done) => void` | — | 同 `Transition` |
| `onAfterExit` | `(el) => void` | — | 同 `Transition` |

### Transition vs TransitionGroup 对比

| | `Transition` | `TransitionGroup` |
|-|--------------|-------------------|
| 适用场景 | 单个子元素切换 | 列表增删 |
| children | `JSX.Element`（单个元素） | `(item: T) => JSX.Element`（渲染函数） |
| mode | 支持 `out-in` / `in-out` / `parallel` | 无（所有进入/离开并发执行） |
| 元素稳定性 | 同一引用不重新创建 | 同一引用（item）不重新创建 |

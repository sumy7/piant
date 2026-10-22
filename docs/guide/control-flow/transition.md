# Transition 与 TransitionGroup

Piant 提供了两个过渡动画组件：`Transition` 和 `TransitionGroup`，用于在 Canvas 元素切换时触发进入/离开生命周期钩子，实现原生画布动画工作流，不依赖任何 DOM/CSS。

两个组件遵循**关注点分离**的设计原则：

- **只负责生命周期管理**（何时触发 enter/exit 钩子）；
- **不自行渲染子元素**——渲染由 `Show`（单元素）和 `For`（列表）负责；
- 生命周期钩子接收子组件返回的**Piant 节点**（如 `PView`），可传给 `@piant/animation` 的 `animate()`。

---

## Transition

`Transition` 管理单个元素的切换过渡，配合 `Show` 使用。

将 `Show` 的输出传入 `children`，`Transition` 会检测内容切换，并在元素进入/离开时触发钩子。

### 在线示例

点击「隐藏卡片 / 显示卡片」，观察卡片淡出并移走，再以新节点淡入。过渡期间按钮暂不响应，避免连续切换打断当前动画。

<LiveExample example="transition" title="单个元素进入与离开" />

### 基本用法

常见效果可直接使用可复用预设：

```tsx
import { fade } from '@piant/animation';

Transition({ ...fade({ duration: 300 }), appear: true, children: content });
```

`slide({ x, y })` 和 `scale({ from })` 使用相同写法，参见[状态绑定与预设在线示例](/animation/quick-start)。路由使用 [`RouteView.transition`](/router/transitions)。

自定义 `onEnter` / `onExit` 可以返回清理函数。Transition 在快速切换或卸载时调用它取消旧动画，并忽略旧阶段迟到的 `done()`；已完成阶段的资源应由 hook 自行释放。回调务必只调用一次 `done()`，或在取消时清理并停止回调。

```ts
onExit: (node, done) => {
  const animation = animate(node, [{ alpha: 1 }, { alpha: 0 }], { duration: 300 });
  void animation.finished.then(done, () => {});
  return () => animation.cancel({ preserve: true });
}
```

`@piant/animation` 的 `animate(node, keyframes, options)` 返回动画控制器。将 `finished` 的成功回调连接到 `done()`，离开动画完成后才移除节点。时长单位为毫秒。

下面片段的 import 声明放在模块顶部，其余初始化与清理逻辑写在组件函数体内；`visible` 是该组件的响应式 getter，`Card` 每次调用创建新节点。完整组件见上方「展示代码」。

```tsx
import { animate, type PNodeAnimation } from '@piant/animation';
import { onCleanup, type PNode, Show, Transition } from '@piant/core';

// visible 是响应式 getter，Card 是每次调用都会创建新节点的组件。
const animations = new Set<PNodeAnimation>();
let disposed = false;
onCleanup(() => {
  disposed = true;
  for (const animation of animations) animation.cancel();
  animations.clear();
});

function fade(node: PNode, entering: boolean, done: () => void) {
  if (disposed) return;
  const animation = animate(
    node,
    entering ? [{ alpha: 0 }, { alpha: 1 }] : [{ alpha: 1 }, { alpha: 0 }],
    { duration: 450, fill: 'forwards' },
  );
  animations.add(animation);
  animation.finished.then(
    () => {
      animations.delete(animation);
      if (!disposed) done();
    },
    () => {
      // cancel() 会拒绝 finished；卸载时不再调用 done()。
      animations.delete(animation);
    },
  );
}

const content = Transition({
  onEnter: (node, done) => fade(node, true, done),
  onExit: (node, done) => fade(node, false, done),
  children: Show({
    get when() {
      return visible();
    },
    children: (_value) => <Card />,
  }),
});
```

`Show` 的带参子函数在条件变为真时创建节点；内容保持显示时引用稳定，离开后再次显示则创建新节点，避免复用已销毁的节点。将 `Transition` 的返回值放入父容器即可；完整的类型、按钮状态和资源清理见在线示例源码。

### 切换模式（mode）

| 模式                 | 说明                                 |
| -------------------- | ------------------------------------ |
| `"parallel"`（默认） | 进入与离开动画同时进行               |
| `"out-in"`           | 先等旧元素离开完成，再开始新元素进入 |
| `"in-out"`           | 先等新元素进入完成，再开始旧元素离开 |

### appear

设置 `appear={true}` 时，初始挂载的元素也会触发进入钩子：

```tsx
Transition({
  appear: true,
  onEnter: (node, done) => fade(node, true, done),
  onExit: (node, done) => fade(node, false, done),
  children: Show({
    get when() {
      return visible();
    },
    children: (_value) => <Card />,
  }),
});
```

### 生命周期钩子

```
onBeforeEnter(el)   ← 同步，进入前（el 是将要显示的 Piant 节点）
onEnter(el, done)   ← 通过 queueMicrotask 调用，调用 done() 标志完成
onAfterEnter(el)    ← done() 调用后触发

onBeforeExit(el)    ← 同步，离开前（el 是将要隐藏的 Piant 节点）
onExit(el, done)    ← 同步调用，调用 done() 标志完成
onAfterExit(el)     ← done() 调用后触发
```

> **注意**：`done` 回调是幂等的——多次调用只执行一次。

### Props

| 属性            | 类型                                 | 默认值       | 说明                                                                     |
| --------------- | ------------------------------------ | ------------ | ------------------------------------------------------------------------ |
| `children`      | `JSX.Element`                        | —            | 通常为 `Show` 的输出；0-arg 函数（memo）在 effect 内被自动调用并追踪依赖 |
| `mode`          | `"parallel" \| "out-in" \| "in-out"` | `"parallel"` | 进入/离开的时序模式                                                      |
| `appear`        | `boolean`                            | `false`      | 初始挂载时是否触发进入钩子                                               |
| `onBeforeEnter` | `(el) => void`                       | —            | 进入前同步回调，`el` 为渲染元素                                          |
| `onEnter`       | `(el, done) => void`                 | —            | 进入动画回调，调用 `done()` 完成                                         |
| `onAfterEnter`  | `(el) => void`                       | —            | 进入完成后回调                                                           |
| `onBeforeExit`  | `(el) => void`                       | —            | 离开前同步回调                                                           |
| `onExit`        | `(el, done) => void`                 | —            | 离开动画回调，调用 `done()` 完成                                         |
| `onAfterExit`   | `(el) => void`                       | —            | 离开完成后回调                                                           |

### 返回值

`JSX.Element`（响应式数组）——渲染器直接处理，过渡期间最多同时包含两个元素（进入中 + 离开中）。

---

## TransitionGroup

`TransitionGroup` 管理**列表**中元素的增删过渡，配合 `For` 或 `Index` 使用。

将 `For`（或 `Index`）的输出传入 `children`，`TransitionGroup` 检测元素的出现与消失：

- 新出现的元素触发进入钩子；
- 消失的元素保留在输出中，触发离开钩子，直到 `done()` 调用后才从渲染树中移除。

生命周期钩子接收 `For`/`Index` 渲染出的**实际 JSX 元素**（即 `children` 函数的返回值），可直接动画。

### 在线示例

点击「添加」观察新卡片淡入，点击「移除末项」观察卡片完成淡出后再离开列表。列表最多四项，移除后会创建全新的卡片。

<LiveExample example="transitionGroup" title="列表增删过渡" :height="360" />

### 基本用法

在组件函数体内复用上方 `fade` 函数与动画清理逻辑，通过 `For` 为每个数组项创建节点（import 声明仍放在模块顶部）：

```tsx
import { For, TransitionGroup } from '@piant/core';

const content = TransitionGroup({
  onEnter: (node, done) => fade(node, true, done),
  onExit: (node, done) => fade(node, false, done),
  children: For({
    get each() {
      return cards();
    },
    children: (card) => <CardView card={card} />,
  }),
});
```

不要在下一次添加时复用已移除的渲染节点；让 `For` 为新增的数据项创建节点。在线示例为每张卡片分配递增编号，并在卸载时取消剩余动画。

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
  onEnter: (node, done) => fade(node, true, done),
  onExit: (node, done) => fade(node, false, done),
  children: For({
    get each() {
      return items();
    },
    children: (item) => <ItemView item={item} />,
  }),
});
```

### Props

| 属性            | 类型                 | 默认值  | 说明                                                                      |
| --------------- | -------------------- | ------- | ------------------------------------------------------------------------- |
| `children`      | `JSX.Element`        | —       | `For` 或 `Index` 的输出（响应式 memo/数组）；`TransitionGroup` 追踪其变化 |
| `appear`        | `boolean`            | `false` | 初始挂载时是否触发进入钩子                                                |
| `onBeforeEnter` | `(el) => void`       | —       | `el` 为 `For`/`Index` 渲染出的 JSX 元素                                   |
| `onEnter`       | `(el, done) => void` | —       | 进入动画回调，调用 `done()` 完成                                          |
| `onAfterEnter`  | `(el) => void`       | —       | 进入完成后回调                                                            |
| `onBeforeExit`  | `(el) => void`       | —       | 离开前同步回调                                                            |
| `onExit`        | `(el, done) => void` | —       | 离开动画回调，调用 `done()` 完成                                          |
| `onAfterExit`   | `(el) => void`       | —       | 离开完成后回调                                                            |

### 返回值

`JSX.Element`（响应式数组）——包含当前 `For`/`Index` 活跃元素以及正在执行离开动画的元素。

---

## Transition vs TransitionGroup 对比

|                    | `Transition`                     | `TransitionGroup`                               |
| ------------------ | -------------------------------- | ----------------------------------------------- |
| 适用场景           | 单个元素切换                     | 列表增删                                        |
| 配合组件           | `Show`                           | `For` / `Index`                                 |
| `children` 含义    | `Show` 的输出（响应式 memo）     | `For`/`Index` 的输出（响应式数组 memo）         |
| mode 支持          | `out-in` / `in-out` / `parallel` | 无（进入/离开并发执行）                         |
| 钩子中 `el` 的类型 | `Show` 返回的 JSX 元素           | `For`/`Index` 的 `children` 函数返回的 JSX 元素 |
| 返回值             | `JSX.Element`（0–2 个元素）      | `JSX.Element`（活跃 + 正在离开的元素）          |

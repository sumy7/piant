# 渲染 API

## mount

`mount` 是应用的推荐入口。它初始化 PixiJS Application，创建 `PRoot`，在独立响应式 owner 中渲染组件，并管理尺寸同步和实例销毁。

```ts
import { mount } from '@piant/core';
import { App } from './App';

const instance = await mount(App, document.getElementById('app')!);

// 页面或路由卸载时：
instance.destroy();
```

```ts
function mount(
  component: () => unknown,
  element: HTMLElement,
  options?: MountOptions,
): Promise<MountedApp>;
```

### 参数与尺寸

第二个参数 `element` 是普通 `HTMLElement` 容器或已有 `HTMLCanvasElement`。可选的第三个参数配置尺寸与生命周期：

| `MountOptions` 字段 | 说明 |
| ------------------- | ---- |
| `width`、`height` | 可选，正有限数的 CSS 像素尺寸；指定的轴固定，并覆盖该轴的 Canvas CSS 尺寸 |
| `resolution` | 渲染分辨率，默认采用当前的 `window.devicePixelRatio`，调整尺寸时同步读取；只影响像素缓冲区 |
| `signal` | 可选 `AbortSignal`，用于取消初始化或销毁已挂载实例 |

挂载到容器时，Piant 在其中创建 Canvas，并使用 `ResizeObserver` 观察容器内容区。请先用 CSS 给容器明确尺寸，避免容器由 Canvas 反向撑开。设置 `width` 或 `height` 只固定对应轴，另一轴仍跟随容器。

挂载到已有 Canvas 时，Piant 使用原位置，不移动或替换 Canvas，并观察 Canvas 本身的内容区尺寸。已有的响应式 CSS（例如 `width: 100%; height: 100%`）保持有效，调整渲染缓冲区不会把这些规则改为固定像素。未通过 CSS 指定尺寸的轴使用挂载时的尺寸；需要随父容器变化时，先为 Canvas 和父容器设置相应 CSS，示例见 [Canvas 布局](/guide/canvas-layout#嵌入页面与多个实例)。

布局尺寸使用 CSS 像素，像素缓冲区按 `resolution` 缩放。例如 CSS 宽度 `400px`、分辨率 `2` 对应逻辑宽度 `400`、缓冲区宽度 `800`。Canvas 的边框和内边距请放在宿主容器上；DOM 输入层不支持祖先的旋转或斜切变换。

窗口尺寸变化时也会同步布局与当前 DPR。`resize(width, height)` 会固定传入轴的逻辑与 Canvas CSS 尺寸，后续自动同步继续使用该固定值；未传入且尚未固定的轴仍跟随尺寸来源。`resize()` 则立即按当前规则同步，不改变尺寸规则。也可以在挂载时通过第三个参数的 `width` / `height` 固定尺寸。

`mount` 默认使用透明背景并开启抗锯齿。应用背景通过组件或根节点样式设置；需要自行配置 PixiJS Application 时，使用底层 `render` / `PRoot` 接入方式。

### 返回实例

| `MountedApp` 成员         | 说明                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `app`                     | 此实例的 PixiJS `Application`，可交给调试工具                |
| `root`                    | 此实例的 `PRoot`                                             |
| `canvas`                  | 实际使用的 `HTMLCanvasElement`                               |
| `resize(width?, height?)` | 固定传入轴的 CSS 像素尺寸并同步布局；未传入的轴沿用当前规则 |
| `destroy()`               | 幂等销毁此实例                                               |
| `isDestroyed`             | 只读销毁状态                                                 |

每次 `mount` 都创建独立 Application、Canvas 挂载关系、响应式作用域和尺寸观察器。同一挂载元素在销毁前只能挂载一次，重复挂载会拒绝。同一页面可挂载多个实例，销毁一个实例不会停止其他实例。各实例需要独立状态时，在组件函数中创建状态，而非复用模块顶层的单例状态。

普通指针事件与 DOM `Input` 以各自 Canvas 为坐标和交互来源。PixiJS 的 `eventMode: 'dynamic'` 静止指针合成事件仍受上游全局单例机制影响；多个 Canvas 间不保证该模式的悬停合成事件完全隔离。

### 初始化、取消与资源所有权

`mount` 是异步函数，只有 Promise 成功完成后才可使用返回实例。初始化或组件渲染失败时，它会清理已取得的资源并拒绝 Promise。PixiJS 在渲染器内部失败时可能尚未将部分资源交给 Application，这部分由上游负责。

```ts
const controller = new AbortController();
const pending = mount(App, document.getElementById('app')!, {
  signal: controller.signal,
});

// 例如路由已离开，初始化还没结束：
controller.abort();

try {
  const instance = await pending;
  // 如果挂载完成后 signal 才被取消，同样会销毁 instance。
  console.log(instance.isDestroyed);
} catch (error) {
  if (!(error instanceof Error && error.name === 'AbortError')) throw error;
}
```

取消不会强制中断 PixiJS 内部的异步初始化；Piant 会等待初始化收尾后释放资源，并以 `AbortError` 拒绝挂载 Promise。初始化完成后的取消会调用实例销毁。

`destroy()` 停止此实例的响应式 effect，执行 `onCleanup`，清理当前挂载树的节点与 Yoga 节点、布局 ticker、尺寸观察器和 Pixi Application。重复调用不会重复清理。由 `mount` 创建的 Canvas 会被移除；用户提供的 Canvas 会留在原位置，并恢复挂载前的 `width`、`height` 和 `style` 属性。该恢复也意味着宿主应在销毁后再更新这些属性。PixiJS 销毁 WebGL 渲染器时会丢失其上下文；Piant 会恢复用户 Canvas 的上下文，随后在同一 Canvas 上再次 `mount` 时等待恢复完成。浏览器无法恢复时会拒绝 Promise。

共享纹理及其资源源不会随实例销毁，使用 `Assets` 等方式加载的共享资源由应用管理。`mount` 不接管组件在 owner 之外创建的资源；组件的外部订阅、定时器等应通过 `onCleanup` 释放。

---

## render

`render` 是底层渲染函数，在新的响应式 owner 中执行组件，将返回内容插入指定的 `PNode`，并返回该 owner 的清理函数（disposer）。已有 `render` / `PRoot` 接入方式可以继续使用，适用于宿主自行管理 PixiJS 的场景。

```ts
function render(component: () => JSX.Element, element: PNode): () => void;
```

- `component`：根组件函数。底层渲染器也接受数组、响应式 getter 等可渲染内容。
- `element`：渲染挂载点，通常传入 `PRoot`。

调用 disposer 会清理所属响应式 owner、停止 effect，并执行登记的 `onCleanup`。尚未执行的 `onMount` 回调会被取消。重复调用不会重复执行已清理的回调。

**disposer 不等同于应用销毁**：它不移除整个节点树，不销毁 `PRoot` 或 Pixi Application。低层宿主需自行完成树、Yoga、布局 ticker、渲染器和尺寸监听的资源管理。需要完整实例生命周期时，使用 `mount`。

```ts
import { PRoot, render } from '@piant/core';
import { App } from './App';

// app 是宿主自行初始化和管理的 Pixi Application。
const root = new PRoot(app.stage, { width: 800, height: 600 });
const dispose = render(App, root);

// 停止本次渲染的响应式副作用；其余资源由宿主管理。
dispose();
```

---

## PRoot

`PRoot` 是 Piant 布局根节点，继承自 `PView`，负责触发 Flexbox 布局计算。

```ts
class PRoot extends PView {
  constructor(renderContainer: Container, styles?: ViewStyles);

  markDirty(): void;
  doLayout(): void;
  destroy(): void;
}
```

- `renderContainer`：PixiJS `Container`，通常为 `app.stage`。
- `styles`：根节点初始样式，通常设置逻辑像素 `width` 和 `height`。

底层宿主在渲染器尺寸变化后同步根节点：

```ts
app.renderer.resize(width, height);
root.setStyle({ width, height });
```

`markDirty()` 标记根节点需要重新布局，样式更改时会自动触发。`doLayout()` 执行布局计算，通常由每帧的布局 ticker 调用。`destroy()` 移除此根的布局 ticker；它不销毁宿主 Application。

## 布局机制

`PRoot` 构造时注册布局 ticker，每帧检查 `_isDirty` 标记：

1. 标记为 `true` 时，调用 Yoga 的 `calculateLayout(width, height)`。
2. 递归调用 `applyLayout()`，将布局结果应用到子节点位置。
3. 清除脏标记，等待下一次样式或节点变化。

每帧最多执行一次布局计算，避免重复计算带来的性能损耗。

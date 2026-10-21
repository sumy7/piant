# 渲染 API

## render

`render` 函数在新的响应式 owner 中执行组件，将返回内容插入指定的 `PNode`，并返回该 owner 的清理函数（disposer）。通常使用 `PRoot` 作为挂载点。

```ts
function render(
  component: () => JSX.Element,
  element: PNode,
): () => void;
```

**参数：**
- `component`：根组件函数（无参数的函数）
- `element`：渲染挂载点，接受 `PNode`，通常传入 `PRoot` 实例

这里展示常规 JSX 组件的用法；底层渲染器也接受数组、响应式 getter 等可渲染内容。

**返回值与清理边界：**

调用 disposer 会清理所属响应式 owner、停止其 effect，并执行登记的 `onCleanup`（包括组件或 Hook 注册的资源清理）。尚未执行的 `onMount` 回调会被取消。重复调用不会重复执行已清理的回调。

disposer 本身没有移除或递归销毁整个节点树，也不会调用 `PRoot.destroy()` 或销毁 Pixi Application。宿主仍需管理这些资源；`PRoot.destroy()` 才会移除其布局 ticker。当前节点销毁也没有统一释放 Yoga 节点，不能把 disposer 当作完整的应用卸载函数。

**示例：**
```ts
import { PRoot, render } from '@piant/core';
import { App } from './App';

const root = new PRoot(app.stage, { width: 800, height: 600 });
const dispose = render(App, root);

// 宿主结束本次渲染时，先停止响应式更新与已登记的副作用。
dispose();
// 节点树、根节点和 Application 的销毁仍由宿主另行负责。
```

`app` 为已初始化的 Pixi Application。完整宿主的资源管理可参考[文档在线示例宿主](https://github.com/sumy7/piant/blob/main/docs/.vitepress/theme/mountExample.ts)；其 Yoga 释放是对当前核心清理限制的补偿。

---

## PRoot

`PRoot` 是 Piant 应用的根节点，继承自 `PView`，负责触发 Flexbox 布局计算。

```ts
class PRoot extends PView {
  constructor(
    renderContainer: Container,
    styles?: ViewStyles
  );

  markDirty(): void;
  doLayout(): void;
}
```

**构造参数：**
- `renderContainer`：PixiJS 的 `Container`，通常为 `app.stage`
- `styles`：根节点的初始样式，通常需要设置 `width` 和 `height`

**示例：**
```ts
import { Application } from 'pixi.js';
import { PRoot } from '@piant/core';

const app = new Application();
await app.init({ resizeTo: window });
document.body.appendChild(app.canvas);

const root = new PRoot(app.stage, {
  width: app.screen.width,
  height: app.screen.height,
});

// 响应窗口大小变化
window.onresize = () => {
  root.setStyle({
    width: app.screen.width,
    height: app.screen.height,
  });
};
```

**方法：**

### markDirty()

将根节点标记为需要重新布局。通常不需要手动调用，样式更改时会自动触发。

### doLayout()

执行布局计算。由 PixiJS Ticker 在每帧自动调用，通常不需要手动调用。

---

## 布局机制

`PRoot` 在构造时注册了一个 PixiJS Ticker 回调（`layoutTicker`），每帧检查 `_isDirty` 标记：

1. 若 `_isDirty` 为 `true`，调用 Yoga 的 `calculateLayout(width, height)` 重新计算布局
2. 然后递归调用 `applyLayout()` 将计算结果应用到所有子节点的位置上
3. 清除 `_isDirty` 标记

这个机制确保了每帧最多执行一次布局计算，避免了重复计算带来的性能损耗。

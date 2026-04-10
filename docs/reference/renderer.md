# 渲染 API

## render

`render` 函数将组件渲染到指定的根节点。

```ts
function render(
  component: () => JSX.Element,
  root: PRoot
): void;
```

**参数：**
- `component`：根组件函数（无参数的函数）
- `root`：`PRoot` 实例，作为渲染挂载点

**示例：**
```ts
import { PRoot, render } from '@piant/core';
import { App } from './App';

const root = new PRoot(app.stage, { width: 800, height: 600 });
render(App, root);
```

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

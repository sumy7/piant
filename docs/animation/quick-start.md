# 快速开始

先按[安装与配置](/guide/installation)启用 `@piant/babel-preset-piant`。通过组件 `ref` 获取 Piant 节点；事件的 Pixi `target` 不能直接传给动画 API。所有时间均使用毫秒。

## 状态驱动补间

`bindAnimation` 监听目标 getter。状态改变时取消旧动画，从当前显示值继续补间；相同目标不会重新播放。未指定 `initial` 时从节点当前值开始，完成后保持目标值。

```tsx
import { bindAnimation } from '@piant/animation';
import { createState, View } from '@piant/core';

export function Card() {
  const [expanded, setExpanded] = createState(false);
  return <View
    style={{ width: 80, height: 60, backgroundColor: '#4f46e5' }}
    ref={(node) => bindAnimation(node,
      () => ({ x: expanded() ? 120 : 0, scale: expanded() ? 1.1 : 1 }),
      { duration: 500, easing: 'ease-in-out' })}
    onClick={() => setExpanded((value) => !value)}
  />;
}
```

绑定归创建它的响应式 owner 和节点所有；owner 卸载或节点销毁时自动停止。`cancel()` 冻结当前值，`reset()` 恢复绑定前的属性，两者在目标再次变化时恢复响应；`dispose()` 永久解除绑定并冻结当前值。

## fade / slide / scale 进出场预设

预设返回 `Transition` hooks，直接展开使用。`fade` 隐藏到透明，`slide` 相对原偏移平移，`scale` 相对原比例缩放；进入恢复原值，离开完成后再移除节点。通过函数创建新的子节点，避免复用已经销毁的节点。

```tsx
import { fade } from '@piant/animation';
import { createState, Show, Transition, View } from '@piant/core';

const [visible, setVisible] = createState(true);
const content = Transition({
  ...fade({ duration: 350 }),
  appear: true,
  children: Show({ get when() { return visible(); }, children: (_value) =>
    <View style={{ width: 80, height: 60, backgroundColor: '#14b8a6' }} /> }),
});
```

切换第一个按钮验证状态快速反转；下方三个按钮分别切换各预设。

<LiveExample example="animationState" title="状态绑定与三个进出场预设" :height="370" />

## sequence / stagger 编排

传入**工厂函数**，让编排器决定何时创建动画。`sequence` 在上一步成功后启动下一步；`stagger` 按调用时刻的 `0、interval、2 × interval…` 错峰启动，等待全部任务完成。两者返回同样的组句柄，因此可以嵌套。

```ts
import { animate, sequence, stagger } from '@piant/animation';
import { onCleanup } from '@piant/core';

const group = sequence([
  () => stagger(nodes.map((node) => () => animate(node,
    [{ y: 0 }, { y: -30 }], { duration: 400, fill: 'forwards' })), 100),
  () => stagger(nodes.map((node) => () => animate(node,
    [{ y: -30 }, { y: 0 }], { duration: 400, fill: 'forwards' })), 100),
]);
onCleanup(() => group.cancel());
```

`cancel()` 清除待启动步骤并取消运行中任务；`finished` 立即拒绝。任一步骤抛错或拒绝会使整组失败，并清理其他任务。失败原因可通过 `await group.finished` / `.catch()` 读取。模块会内部观察拒绝，单纯依赖 owner 清理不会产生无人处理的拒绝。

<LiveExample example="animationSequence" title="错峰升起，再依次恢复；可取消与重播" />

## hover / press / drag 交互

交互绑定使用独立监听器，保留已有业务 handler。hover 离开、press 抬起或离开后恢复原值；drag 默认保留释放位置，`returnToOrigin: true` 则补间返回，`pointercancel` 总会返回。每个句柄提供 `reset()` 和 `dispose()`。

```tsx
import { drag, hover, press } from '@piant/animation';

<View ref={(node) => hover(node, { scale: 1.1 }, { duration: 180 })} />
<View ref={(node) => press(node, { scale: 0.9, alpha: 0.7 })} />
<View ref={(node) => drag(node, {
  axis: 'x', bounds: { minX: 0, maxX: 180 }, returnToOrigin: true,
})} />
```

拖拽位移以实际 Pixi 父容器的局部坐标计算，支持父级缩放、旋转。示例中的拖拽区域特意做了变换。

<LiveExample example="animationInteractions" title="悬停、按压与变换容器内拖拽" :height="310" />

## 低层关键帧和路由

需要暂停、seek、循环或自定义关键帧时使用 `animate(node, keyframes, options)`；也可导入 `'@piant/animation'` 后调用 `node.animate()`。默认 `fill: 'none'` 完成后恢复初始属性，`fill: 'forwards'` 保持终值。`cancel()` 恢复动画前快照，`cancel({ preserve: true })` 冻结当前值；节点销毁时自动取消。

在事件回调内发起的动画组不一定有响应式 owner，应在组件创建阶段注册 `onCleanup(() => currentGroup?.cancel())`，如上方在线示例所示。

- [API 参考](./api)：完整参数、取消与属性所有权限制。
- [Transition 与 TransitionGroup](/guide/control-flow/transition)：控制流生命周期。
- [路由切场](/router/transitions)：`RouteView` 的动画、lazy 与快速导航。

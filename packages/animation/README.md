# @piant/animation

Piant 的节点动画扩展，提供类似 Web Animations API 的关键帧接口，支持位移、缩放、透明度、颜色及布局属性动画。

状态驱动动画使用 `bindAnimation(node, targetGetter, options)`；`fade` / `slide` / `scale` 预设可直接展开到 `Transition` 和 `RouteView.transition`。`sequence` / `stagger` 接收惰性动画工厂，支持嵌套、取消和 owner 清理；`hover` / `press` / `drag` 提供按实例管理的交互动画。

可操作示例与资源所有权见[快速开始](https://piant.sumygg.com/animation/quick-start)，路由集成见[路由切场](https://piant.sumygg.com/router/transitions)。

## 安装

```bash
pnpm add @piant/animation @piant/core "pixi.js@^8.22.0"
```

Peer 依赖为 `@piant/core ^0.1.0` 和 `pixi.js ^8.22.0`。

本包仅提供 ESM 入口，使用 `import` 导入。

## 使用

在已配置 Piant JSX 的项目中，导入扩展后即可在 Piant 节点上调用 `animate()`：

```tsx
import { onCleanup, type PNode, View } from '@piant/core';
import '@piant/animation';
import type { PNodeAnimation } from '@piant/animation';

export function FadeDemo() {
  let node: PNode | undefined;
  let animation: PNodeAnimation | undefined;
  onCleanup(() => animation?.cancel());

  function play() {
    animation?.cancel();
    animation = node?.animate([{ alpha: 0 }, { alpha: 1 }], {
      duration: 500,
      easing: 'ease-out',
      fill: 'forwards',
    });
    animation?.finished.catch(() => {});
  }

  return (
    <View
      ref={(el) => {
        node = el;
      }}
      style={{ width: 100, height: 100, backgroundColor: '#4f46e5' }}
      onClick={play}
    />
  );
}
```

`animate()` 返回的动画支持 `play()`、`pause()`、`cancel()` 和 `finished` Promise。取消动画会拒绝 `finished`，示例在清理及重复播放时处理了该拒绝。

也可以使用导出的 `animate(node, keyframes, options)` 函数。完整选项见 [API 参考](https://piant.sumygg.com/animation/api)。

## 更多信息

- [文档](https://piant.sumygg.com/animation/introduction)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)

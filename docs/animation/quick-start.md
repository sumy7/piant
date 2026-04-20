# 快速开始

本节通过几个常见场景带你快速上手 `@piant/animation`。

## 0. 准备工作

在应用入口文件中导入一次，挂载 `PNode.prototype.animate`：

```ts
// main.ts（或 app.ts）
import '@piant/animation';
```

之后所有通过 Piant 组件创建的节点均可调用 `.animate()`。

## 1. 淡入 / 淡出

通过 `alpha` 关键帧实现透明度动画：

```tsx
import { View } from '@piant/core';

export function FadeDemo() {
  function handleClick(el: any) {
    // el 是 PNode 实例
    el.animate(
      [{ alpha: 1 }, { alpha: 0 }, { alpha: 1 }],
      { duration: 1000, easing: 'ease-in-out' },
    );
  }

  return (
    <View
      style={{ width: 100, height: 100, backgroundColor: '#4f46e5' }}
      onClick={(e) => handleClick(e.target)}
    />
  );
}
```

## 2. 位移动画

`x` / `y` 属性是叠加在 Flexbox 布局上的**偏移量**，不会影响其他节点的布局：

```tsx
import { View } from '@piant/core';

export function SlideDemo() {
  function handleClick(el: any) {
    el.animate(
      [{ x: 0 }, { x: 200 }],
      { duration: 600, easing: 'ease-out', fill: 'forwards' },
    );
  }

  return (
    <View
      style={{ width: 80, height: 80, backgroundColor: '#10b981' }}
      onClick={(e) => handleClick(e.target)}
    />
  );
}
```

## 3. 组合动画（多属性）

在单次 `animate()` 调用中同时驱动多个属性：

```tsx
el.animate(
  [
    { x: 0, alpha: 0, scale: 0.8 },
    { x: 150, alpha: 1, scale: 1 },
  ],
  { duration: 500, easing: 'ease-out', fill: 'forwards' },
);
```

## 4. 循环动画

将 `iterations` 设为 `Infinity` 实现无限循环：

```tsx
el.animate(
  [{ rotation: 0 }, { rotation: Math.PI * 2 }],
  { duration: 1200, iterations: Infinity, easing: 'linear' },
);
```

## 5. 交替方向（alternate）

结合 `direction: 'alternate'` 实现往返动画：

```tsx
el.animate(
  [{ x: 0 }, { x: 120 }],
  { duration: 800, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' },
);
```

## 6. 等待动画结束

通过 `finished` Promise 串联动画：

```tsx
async function runSequence(el: any) {
  await el.animate(
    [{ alpha: 0 }, { alpha: 1 }],
    { duration: 400, fill: 'forwards' },
  ).finished;

  await el.animate(
    [{ x: 0 }, { x: 200 }],
    { duration: 600, fill: 'forwards', easing: 'ease-out' },
  ).finished;

  console.log('sequence complete');
}
```

## 7. 暂停与恢复

```tsx
const anim = el.animate(
  [{ x: 0 }, { x: 300 }],
  { duration: 2000 },
);

// 1 秒后暂停
setTimeout(() => anim.pause(), 1000);

// 再过 500 ms 恢复
setTimeout(() => anim.play(), 1500);
```

## 8. 取消动画并恢复原状

```tsx
const anim = el.animate(
  [{ alpha: 1 }, { alpha: 0 }],
  { duration: 1000 },
);

// 取消后元素恢复到动画前的状态
setTimeout(() => anim.cancel(), 300);
```

## 9. 使用独立函数

不修改原型也可直接使用 `animate()` 工具函数：

```ts
import { animate } from '@piant/animation';

const anim = animate(el, [{ scale: 1 }, { scale: 1.2 }, { scale: 1 }], {
  duration: 400,
  easing: 'ease-in-out',
});
```

## 10. 在 Transition 组件中配合使用

`@piant/animation` 非常适合与 Piant 的 `Transition` 组件协同，实现进入 / 离开动画：

```tsx
import { Transition, Show, View } from '@piant/core';
import '@piant/animation';

Transition({
  mode: 'out-in',
  onBeforeEnter: (el) => {
    el.animate([{ alpha: 0, x: -20 }, { alpha: 1, x: 0 }], {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards',
    });
  },
  onExit: (el, done) => {
    el.animate([{ alpha: 1, x: 0 }, { alpha: 0, x: 20 }], {
      duration: 250,
      easing: 'ease-in',
      fill: 'forwards',
    }).finished.then(done);
  },
  children: Show({ when: visible, children: viewA, fallback: viewB }),
});
```

## 下一步

- [API 参考](./api) — 完整参数与类型说明

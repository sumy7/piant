# Animation API

## node.animate()

在 `PNode` 上发起一次关键帧动画，返回 `PNodeAnimation` 实例。

```ts
node.animate(keyframes: KeyframeEffect, options?: AnimationOptions): PNodeAnimation
```

> 需要先在入口文件导入 `'@piant/animation'` 以挂载原型方法，或改用独立函数 [`animate()`](#animate)。

## animate()

独立工具函数，无需原型挂载。

```ts
import { animate } from '@piant/animation';

animate(node: PNode, keyframes: KeyframeEffect, options?: AnimationOptions): PNodeAnimation
```

---

## KeyframeEffect

动画关键帧，支持两种格式。

### 数组格式（推荐）

每个对象为一帧，可携带任意 `AnimatableProps` 及 `offset`/`easing`：

```ts
[
  { alpha: 0, x: -20, offset: 0, easing: 'ease-out' },
  { alpha: 1, x: 0, offset: 1 },
]
```

- `offset`：帧在时间轴上的位置，范围 `0–1`。省略时自动均匀分布。
- `easing`：该帧到下一帧的缓动函数名（默认 `'linear'`）。

### 属性索引格式

将每个属性的值列成数组，长度须一致：

```ts
{
  alpha: [0, 0.5, 1],
  x: [-20, 0, 20],
  offset: [0, 0.3, 1],       // 可选
  easing: 'ease-in-out',     // 全局缓动，或传数组逐帧指定
}
```

---

## AnimationOptions

```ts
type AnimationOptions =
  | number    // 仅传数字 = duration（ms）
  | {
      duration?: number;          // 单次迭代时长，默认 300 ms
      delay?: number;             // 开始前延迟，默认 0
      endDelay?: number;          // 结束后延迟，默认 0
      easing?: string;            // 全局缓动（会被关键帧内 easing 覆盖），默认 'linear'
      iterations?: number;        // 迭代次数，默认 1；Infinity 为无限循环
      direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
                                  // 默认 'normal'
      fill?: 'none' | 'forwards' | 'backwards' | 'both';
                                  // 默认 'none'
      playbackRate?: number;      // 播放速率倍数，默认 1
    };
```

### `fill` 说明

| 值 | 行为 |
|----|------|
| `'none'`（默认） | 动画结束后属性恢复到动画前的值 |
| `'forwards'` | 动画结束后保持最后一帧的值 |
| `'backwards'` | 在 `delay` 阶段立即应用第一帧的值 |
| `'both'` | 兼具 `forwards` 与 `backwards` |

### `direction` 说明

| 值 | 行为 |
|----|------|
| `'normal'` | 每次迭代从头到尾 |
| `'reverse'` | 每次迭代从尾到头 |
| `'alternate'` | 奇数次正向，偶数次反向 |
| `'alternate-reverse'` | 奇数次反向，偶数次正向 |

---

## PNodeAnimation

`node.animate()` 的返回值，提供对动画全生命周期的控制。

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `playState` | `'idle' \| 'running' \| 'paused' \| 'finished'` | 当前播放状态（只读） |
| `currentTime` | `number` | 当前动画时间（ms）；可写入以跳转到指定时间 |
| `playbackRate` | `number` | 播放速率；可在运行时修改 |
| `finished` | `Promise<PNodeAnimation>` | 动画自然结束时 resolve；取消时 reject |
| `ready` | `Promise<PNodeAnimation>` | 动画准备就绪时 resolve（本实现中立即 resolve） |
| `onfinish` | `((event) => void) \| null` | 自然结束回调 |
| `oncancel` | `((event) => void) \| null` | 取消回调 |

### 方法

#### `play()`

启动或恢复动画。

```ts
anim.play();
```

> 对处于 `'finished'` 状态的动画调用 `play()` 无效。如需重播，请重新调用 `node.animate()`。

#### `pause()`

暂停动画，保持当前时间。

```ts
anim.pause();
```

#### `cancel()`

取消动画，将属性恢复到动画前的值，`finished` Promise 进入 rejected 状态。

```ts
anim.cancel();
```

#### `finish()`

立即跳转到动画终点并完成。

```ts
anim.finish();
```

#### `reverse()`

反转播放方向（将 `playbackRate` 乘以 `-1`）。

```ts
anim.reverse();
```

---

## AnimatableProps

所有可动画属性的类型定义：

```ts
type AnimatableProps = {
  x?: number;                       // 位移 X 偏移（px）
  y?: number;                       // 位移 Y 偏移（px）
  scale?: number;                   // 等比缩放（同时设置 scaleX / scaleY）
  scaleX?: number;                  // X 轴缩放
  scaleY?: number;                  // Y 轴缩放
  rotation?: number;                // 旋转角度（弧度）
  alpha?: number;                   // 透明度（0–1，直接操作 Pixi Container）
  backgroundColor?: ColorSource;    // 背景色
  borderRadius?: number;            // 圆角半径（px）
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
  width?: number;                   // 宽度（px）
  height?: number;                  // 高度（px）
  opacity?: number;                 // 透明度，通过 setStyle 触发布局更新
};
```

---

## 支持的缓动名称

| 名称 | 说明 |
|------|------|
| `'linear'` | 匀速 |
| `'ease'` | 等同 `cubic-bezier(0.25, 0.1, 0.25, 1.0)` |
| `'ease-in'` | 先慢后快 |
| `'ease-out'` | 先快后慢 |
| `'ease-in-out'` | 两端慢中间快 |
| `'circ-in'` / `'circIn'` | 圆弧加速 |
| `'circ-out'` / `'circOut'` | 圆弧减速 |
| `'circ-in-out'` / `'circInOut'` | 圆弧对称 |
| `'back-in'` / `'backIn'` | 先回弹再前进 |
| `'back-out'` / `'backOut'` | 超出终点后回弹 |
| `'back-in-out'` / `'backInOut'` | 两端回弹 |
| `'anticipate'` | 预备动作后加速 |
| `'cubic-bezier(x1, y1, x2, y2)'` | 自定义贝塞尔曲线 |

未识别的缓动名称会自动回退到 `'linear'`。

---

## parseEasing()

将缓动字符串解析为 `(t: number) => number` 函数，供自定义插值使用。

```ts
import { parseEasing } from '@piant/animation';

const fn = parseEasing('ease-in-out');
const value = fn(0.3); // 0–1 之间的插值结果
```

---

## normalizeKeyframes()

将 `KeyframeEffect`（数组或属性索引格式）归一化为带有显式 `offset` 的内部关键帧数组。

```ts
import { normalizeKeyframes } from '@piant/animation';

const kfs = normalizeKeyframes([{ alpha: 0 }, { alpha: 1 }]);
// [
//   { alpha: 0, offset: 0, easing: 'linear' },
//   { alpha: 1, offset: 1, easing: 'linear' },
// ]
```

---

## interpolateKeyframes()

在归一化关键帧之间对给定进度（`0–1`）进行插值，返回当前帧的 `AnimatableProps`。

```ts
import { interpolateKeyframes, normalizeKeyframes } from '@piant/animation';

const kfs = normalizeKeyframes([{ x: 0 }, { x: 100 }]);
const props = interpolateKeyframes(kfs, 0.5);
// { x: 50 }
```

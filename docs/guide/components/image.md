# Image

`Image` 组件用于在 Canvas 上渲染 PixiJS 的 `Sprite` 或 `Graphics` 对象。

## 基本用法

```tsx
import { Image } from '@piant/core';
import { Sprite } from 'pixi.js';

function MyImage() {
  const sprite = Sprite.from('/path/to/image.png');

  return <Image src={sprite} style={{ width: 100, height: 100 }} />;
}
```

## 使用 Graphics

```tsx
import { Image } from '@piant/core';
import { Graphics } from 'pixi.js';

function IconView() {
  const icon = new Graphics().circle(0, 0, 20).fill({ color: '#ff0000' });

  return <Image src={icon} style={{ width: 40, height: 40 }} />;
}
```

## 使用 SVG

```tsx
import { Image } from '@piant/core';
import { Graphics } from 'pixi.js';
import svgString from './icon.svg?raw';

const icon = new Graphics().svg(svgString);

<Image src={icon} style={{ width: 24, height: 24 }} />;
```

## Props

| 属性     | 类型                      | 必填 | 说明                          |
| -------- | ------------------------- | ---- | ----------------------------- |
| `src`    | `Sprite \| Graphics`      | ✅   | PixiJS 可渲染对象             |
| `style`  | `StyleValue<ImageStyles>` | —    | 样式，支持 `objectFit`        |
| `ref`    | `(el: PImage) => void`    | —    | 获取底层节点实例              |
| 事件属性 | —                         | —    | 详见[事件处理](/guide/events) |

## objectFit

`ImageStyles` 扩展了 `ViewStyles`，额外支持 `objectFit` 属性：

| 值          | 说明                                                 |
| ----------- | ---------------------------------------------------- |
| `'contain'` | 默认值；保持比例，完整显示并居中                     |
| `'cover'`   | 保持比例，居中填满容器，超出部分裁剪到容器的圆角轮廓 |
| `'fill'`    | 拉伸填满容器（不保持比例）                           |
| `'none'`    | 恢复未缩放的原始尺寸，左上对齐                       |

```tsx
<Image src={sprite} style={{ width: 200, height: 150, objectFit: 'contain' }} />
```

原始尺寸在每次布局时读取：`Sprite` 使用纹理的 `orig` 尺寸（保留图集裁切前的逻辑尺寸），`Graphics` 使用绘图内容的局部 bounds，包含描边，不包含附加子对象。此前的 `fill`、容器尺寸为零或其他 fit 模式不会改变这个尺寸来源。`Graphics` 不必先转换成纹理，也不会把第一次空图形的尺寸永久缓存。

`Image` 管理传入对象的 `position` 和 `scale`，输入对象预设的缩放不作为原始尺寸；`none` 将缩放恢复为 1。负坐标的 `Graphics` 与 `Sprite.anchor` 会补偿到对应的对齐位置。布局按未旋转的源几何计算；自定义旋转、skew 等变换不参与 fit 尺寸计算。

`cover` 始终只裁剪图像层，即使 `overflow: 'visible'` 也不会溢出；它沿用 `borderRadius` 和四角独立圆角。背景、边框及普通子节点沿用 View 的绘制与叠放规则，图片仍绘制在背景/边框之上；`cover` 不额外裁剪子节点。需要裁剪整个节点及子节点时，设置 `overflow: 'hidden'`。其他 fit 模式不添加图像遮罩，仍可通过 `overflow: 'hidden'` 裁剪。

空图形或任一原始尺寸为零/非有限值时暂不绘制图像，避免无效缩放。替换 `src` 会触发布局；直接重绘同一个 `Graphics`、修改纹理或等待资源加载完成后，应调用 ref 节点的 `setImage(src)` 或 `markDirty()` 请求下一次布局，以读取更新后的原始尺寸。建议先用 `Assets.load()` 完成资源加载。

源 `Sprite`、`Graphics`、纹理及纹理源归调用者所有。替换 `src` 或销毁 Image 时会解除源对象挂载，不销毁这些外部资源；Image 会销毁自己创建的裁剪遮罩。请在不再使用源对象时自行释放资源。

## 响应式 src

`src` 属性通过 `effect` 监听变化，支持响应式更新：

```tsx
const [currentSprite, setCurrentSprite] = createState(defaultSprite);

<Image src={currentSprite()} style={{ width: 64, height: 64 }} />;
```

## 注意事项

- `src` 接受 PixiJS 的 `Sprite` 或 `Graphics` 实例，而不是 URL 字符串
- 如果需要从 URL 加载图片，需要先通过 PixiJS 的 `Assets.load()` 或 `Sprite.from()` 创建 `Sprite`

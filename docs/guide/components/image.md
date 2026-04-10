# Image

`Image` 组件用于在 Canvas 上渲染 PixiJS 的 `Sprite` 或 `Graphics` 对象。

## 基本用法

```tsx
import { Image } from '@piant/core';
import { Sprite } from 'pixi.js';

function MyImage() {
  const sprite = Sprite.from('/path/to/image.png');

  return (
    <Image
      src={sprite}
      style={{ width: 100, height: 100 }}
    />
  );
}
```

## 使用 Graphics

```tsx
import { Image } from '@piant/core';
import { Graphics } from 'pixi.js';

function IconView() {
  const icon = new Graphics()
    .circle(0, 0, 20)
    .fill({ color: '#ff0000' });

  return <Image src={icon} style={{ width: 40, height: 40 }} />;
}
```

## 使用 SVG

```tsx
import { Image } from '@piant/core';
import { Graphics } from 'pixi.js';
import svgString from './icon.svg?raw';

const icon = new Graphics().svg(svgString);

<Image src={icon} style={{ width: 24, height: 24 }} />
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `src` | `Sprite \| Graphics` | ✅ | PixiJS 可渲染对象 |
| `style` | `ImageStyles \| ImageStyles[]` | — | 样式，支持 `objectFit` |
| `ref` | `(el: PImage) => void` | — | 获取底层节点实例 |
| 事件属性 | — | — | 详见[事件处理](/guide/events) |

## objectFit

`ImageStyles` 扩展了 `ViewStyles`，额外支持 `objectFit` 属性：

| 值 | 说明 |
|----|------|
| `'contain'` | 保持比例，完整显示在容器内 |
| `'cover'` | 保持比例，填满容器（可能裁剪） |
| `'fill'` | 拉伸填满容器（不保持比例） |
| `'none'` | 使用图片原始尺寸 |

```tsx
<Image
  src={sprite}
  style={{ width: 200, height: 150, objectFit: 'contain' }}
/>
```

## 响应式 src

`src` 属性通过 `effect` 监听变化，支持响应式更新：

```tsx
const [currentSprite, setCurrentSprite] = createState(defaultSprite);

<Image src={currentSprite()} style={{ width: 64, height: 64 }} />
```

## 注意事项

- `src` 接受 PixiJS 的 `Sprite` 或 `Graphics` 实例，而不是 URL 字符串
- 如果需要从 URL 加载图片，需要先通过 PixiJS 的 `Assets.load()` 或 `Sprite.from()` 创建 `Sprite`

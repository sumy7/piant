# 事件处理

Piant 将 PixiJS 事件封装为 React 风格的事件 props。

## 基本用法

```tsx
import { View } from '@piant/core';

<View
  style={{ width: 100, height: 40, backgroundColor: '#0066cc' }}
  onClick={() => console.log('点击了！')}
/>
```

当组件绑定任意事件处理器时，PixiJS 的 `interactive` 属性会自动设置为 `true`。

## 事件映射

当前映射如下：

| 属性 | PixiJS 事件 | 说明 |
|------|-------------|------|
| `onClick` | `pointertap` | 点击（推荐默认交互入口） |
| `onPointerDown` | `pointerdown` | 指针按下 |
| `onPointerUp` | `pointerup` | 指针抬起 |
| `onPointerMove` | `pointermove` | 指针移动 |
| `onPointerEnter` | `pointerenter` | 指针进入 |
| `onPointerLeave` | `pointerleave` | 指针离开 |
| `onPointerOver` | `pointerover` | 指针悬停（冒泡） |
| `onPointerOut` | `pointerout` | 指针移出（冒泡） |
| `onPointerCancel` | `pointercancel` | 指针取消 |
| `onPointerUpOutside` | `pointerupoutside` | 元素外抬起 |
| `onPointerTap` | `pointertap` | 指针点击 |
| `onRightClick` | `rightclick` | 右键点击 |
| `onRightDown` | `rightdown` | 右键按下 |
| `onRightUp` | `rightup` | 右键抬起 |
| `onRightUpOutside` | `rightupoutside` | 元素外右键抬起 |
| `onWheel` | `wheel` | 滚轮 |
| `onGlobalMouseMove` | `globalmousemove` | 全局鼠标移动 |
| `onGlobalTouchMove` | `globaltouchmove` | 全局触摸移动 |
| `onGlobalPointerMove` | `globalpointermove` | 全局指针移动 |

## 响应式事件处理器

事件处理器通过 `effect` 绑定，当 handler 函数变化时会自动更新：

```tsx
const [mode, setMode] = createState<'add' | 'remove'>('add');

const handleClick = createMemo(() =>
  mode() === 'add' ? () => addItem() : () => removeItem(),
);

<View onClick={handleClick()} style={{ width: 60, height: 60 }} />
```

## 示例：悬停与点击

```tsx
import { createState, View } from '@piant/core';

function HoverButton() {
  const [hovered, setHovered] = createState(false);

  return (
    <View
      style={{
        width: 120,
        height: 44,
        backgroundColor: hovered() ? '#0052a3' : '#0066cc',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={() => console.log('按钮点击')}
    />
  );
}
```

## 注意事项

- 所有事件处理器支持 `View`、`Image`、`ScrollView`、`CustomView`。
- 推荐默认交互使用 `onClick`，需要精细控制时使用 pointer 系列事件。
- `onPointerEnter` / `onPointerLeave` 不冒泡，`onPointerOver` / `onPointerOut` 会冒泡。

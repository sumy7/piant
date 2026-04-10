# 事件处理

Piant 将 PixiJS 的事件系统封装为 React 风格的事件 props，支持鼠标、触摸、指针等交互事件。

## 基本用法

```tsx
import { View } from '@piant/core';

<View
  style={{ width: 100, height: 40, backgroundColor: '#0066cc' }}
  onClick={() => console.log('点击了！')}
/>
```

当组件绑定任意事件处理器时，PixiJS 的 `interactive` 属性会自动设置为 `true`。

## 事件属性列表

### 鼠标事件

| 属性 | PixiJS 事件 | 说明 |
|------|------------|------|
| `onClick` | `click` | 鼠标点击 |
| `onMouseDown` | `mousedown` | 鼠标按下 |
| `onMouseUp` | `mouseup` | 鼠标抬起 |
| `onMouseMove` | `mousemove` | 鼠标移动 |
| `onMouseEnter` | `mouseenter` | 鼠标进入 |
| `onMouseLeave` | `mouseleave` | 鼠标离开 |
| `onMouseOver` | `mouseover` | 鼠标悬停（冒泡） |
| `onMouseOut` | `mouseout` | 鼠标移出（冒泡） |
| `onRightClick` | `rightclick` | 鼠标右键点击 |
| `onRightDown` | `rightdown` | 鼠标右键按下 |
| `onRightUp` | `rightup` | 鼠标右键抬起 |
| `onRightUpOutside` | `rightupoutside` | 在元素外右键抬起 |
| `onWheel` | `wheel` | 鼠标滚轮 |

### 触摸事件

| 属性 | PixiJS 事件 | 说明 |
|------|------------|------|
| `onTouchStart` | `touchstart` | 触摸开始 |
| `onTouchEnd` | `touchend` | 触摸结束 |
| `onTouchMove` | `touchmove` | 触摸移动 |
| `onTouchCancel` | `touchcancel` | 触摸取消 |
| `onTouchEndOutside` | `touchendoutside` | 在元素外触摸结束 |
| `onTap` | `tap` | 触摸点击（相当于触摸版 click） |

### 指针事件（推荐）

指针事件同时支持鼠标和触摸，推荐用于跨设备交互：

| 属性 | PixiJS 事件 | 说明 |
|------|------------|------|
| `onPointerDown` | `pointerdown` | 指针按下 |
| `onPointerUp` | `pointerup` | 指针抬起 |
| `onPointerMove` | `pointermove` | 指针移动 |
| `onPointerEnter` | `pointerenter` | 指针进入 |
| `onPointerLeave` | `pointerleave` | 指针离开 |
| `onPointerOver` | `pointerover` | 指针悬停（冒泡） |
| `onPointerOut` | `pointerout` | 指针移出（冒泡） |
| `onPointerCancel` | `pointercancel` | 指针取消 |
| `onPointerUpOutside` | `pointerupoutside` | 在元素外指针抬起 |
| `onPointerTap` | `pointertap` | 指针点击 |

### 全局事件

| 属性 | PixiJS 事件 | 说明 |
|------|------------|------|
| `onGlobalMouseMove` | `globalmousemove` | 全局鼠标移动（不受元素边界限制） |
| `onGlobalTouchMove` | `globaltouchmove` | 全局触摸移动 |
| `onGlobalPointerMove` | `globalpointermove` | 全局指针移动 |

## 响应式事件处理器

事件处理器通过 `effect` 绑定，当 handler 函数变化时会自动更新（旧的 handler 会被移除，新的 handler 会被注册）：

```tsx
const [mode, setMode] = createState<'add' | 'remove'>('add');

const handleClick = createMemo(() =>
  mode() === 'add'
    ? () => addItem()
    : () => removeItem()
);

<View onClick={handleClick()} style={{ width: 60, height: 60 }} />
```

## 示例：悬停效果

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => console.log('按钮点击')}
    />
  );
}
```

## 注意事项

- 所有事件处理器支持 `View`、`Image`、`ScrollView`、`CustomView` 组件
- 绑定事件会自动设置 PixiJS 的 `interactive = true`，无需手动配置
- `onMouseEnter` / `onMouseLeave` 不冒泡，`onMouseOver` / `onMouseOut` 会冒泡

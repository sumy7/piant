# 事件处理

Piant 将 PixiJS 事件封装为 React 风格的事件 props。

## 基本用法

```tsx
import { View } from '@piant/core';

<View
  style={{ width: 100, height: 40, backgroundColor: '#0066cc' }}
  onClick={() => console.log('点击了！')}
/>;
```

## 回调参数

事件回调接收 `(event, node)` 两个参数，TypeScript 会根据事件和组件自动推导类型：

```tsx
<View
  onClick={(event, node) => {
    console.log(event.global.x, event.global.y); // FederatedPointerEvent
    console.log(node); // PView
  }}
  onWheel={(event) => {
    console.log(event.deltaY); // FederatedWheelEvent
  }}
/>
```

第二个参数是绑定处理器的 Piant 节点：`View` 对应 `PView`，`Image` 对应 `PImage`，`ScrollView` 对应 `PScrollView`，`CustomView` 对应 `PCustomView`。不需要参数或只使用事件参数的现有回调仍然可用。

`event.target` 和 `event.currentTarget` 保留 PixiJS 的原生语义，指向 PixiJS 渲染对象。操作 Piant 节点时请使用第二个参数；即使事件从子节点冒泡而来，`node` 也始终是当前处理器所属的组件节点。例如，导入动画扩展后可以直接启动节点动画：

```tsx
import '@piant/animation';

<View
  onClick={(_event, node) => {
    node.animate([{ alpha: 1 }, { alpha: 0 }], { duration: 500 });
  }}
/>;
```

## 交互模式

绑定事件处理器时，节点的 `eventMode` 为 `passive` 或 `auto` 会自动切换为 `static`。已有的 `static`、`dynamic`、`none` 保持不变；显式设置为 `none` 的节点仍不参与事件交互。

全部处理器禁用或组件销毁时，若自动提升的 `eventMode` 仍为 `static`，会恢复原来的模式。若期间将其改为其他模式，则保留该设置。

## 事件映射

当前映射如下：

| 属性                  | PixiJS 事件         | 说明                     |
| --------------------- | ------------------- | ------------------------ |
| `onClick`             | `pointertap`        | 点击（推荐默认交互入口） |
| `onPointerDown`       | `pointerdown`       | 指针按下                 |
| `onPointerUp`         | `pointerup`         | 指针抬起                 |
| `onPointerMove`       | `pointermove`       | 指针移动                 |
| `onPointerEnter`      | `pointerenter`      | 指针进入                 |
| `onPointerLeave`      | `pointerleave`      | 指针离开                 |
| `onPointerOver`       | `pointerover`       | 指针悬停（冒泡）         |
| `onPointerOut`        | `pointerout`        | 指针移出（冒泡）         |
| `onPointerCancel`     | `pointercancel`     | 指针取消                 |
| `onPointerUpOutside`  | `pointerupoutside`  | 元素外抬起               |
| `onPointerTap`        | `pointertap`        | 指针点击                 |
| `onRightClick`        | `rightclick`        | 右键点击                 |
| `onRightDown`         | `rightdown`         | 右键按下                 |
| `onRightUp`           | `rightup`           | 右键抬起                 |
| `onRightUpOutside`    | `rightupoutside`    | 元素外右键抬起           |
| `onWheel`             | `wheel`             | 滚轮                     |
| `onGlobalMouseMove`   | `globalmousemove`   | 全局鼠标移动             |
| `onGlobalTouchMove`   | `globaltouchmove`   | 全局触摸移动             |
| `onGlobalPointerMove` | `globalpointermove` | 全局指针移动             |

## 响应式事件处理器

事件处理器支持响应式更新，函数变化后会调用最新的处理器；设为 `undefined` 可以禁用对应事件：

```tsx
const [mode, setMode] = createState<'add' | 'remove'>('add');

const handleClick = createMemo(() =>
  mode() === 'add' ? () => addItem() : () => removeItem(),
);

<View onClick={handleClick()} style={{ width: 60, height: 60 }} />;
```

`onClick` 和 `onPointerTap` 可以同时使用，各自独立更新和清理。同一事件触发时，两个处理器都会执行。

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

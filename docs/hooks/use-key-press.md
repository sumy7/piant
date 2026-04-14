# useKeyPress

追踪某个键是否正在被按下，返回一对响应式 getter。

## 签名

```ts
function useKeyPress(
  keyFilter: KeyFilter,
): [() => boolean, () => KeyboardEvent | null]
```

## 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `keyFilter` | `KeyFilter` | 要追踪的键名、断言函数、或 null |

`KeyFilter` 的用法与 [`useKey`](./use-key#参数) 完全一致。

## 返回值

返回一个元组 `[pressed, lastEvent]`：

| 返回项 | 类型 | 说明 |
|--------|------|------|
| `pressed` | `() => boolean` | 响应式 getter，`true` 表示该键正被按下 |
| `lastEvent` | `() => KeyboardEvent \| null` | 响应式 getter，最近一次触发的键盘事件 |

两个 getter 均由 MobX observable 驱动，在 Piant 组件渲染上下文中访问时会**自动追踪依赖**。

## 基本用法

```tsx
import { useKeyPress } from '@piant/hooks';

export function MyComponent() {
  const [isShiftDown] = useKeyPress('Shift');

  return (
    <Text>{isShiftDown() ? 'Shift 已按下' : '正常模式'}</Text>
  );
}
```

## 读取最近事件

```tsx
const [isCtrlDown, lastEvent] = useKeyPress('Control');

// 在 effect 中读取事件详情
effect(() => {
  if (isCtrlDown()) {
    console.log('Ctrl 按下，事件对象：', lastEvent());
  }
});
```

## 组合使用

追踪多个键，实现组合逻辑：

```tsx
const [isCtrl] = useKeyPress('Control');
const [isZ] = useKeyPress('z');

// 在其他 hook 里判断组合状态
useKey('z', () => {
  if (isCtrl()) undo();
});
```

## 自动清理

与 `useKey` 相同，监听器在响应式 Owner 销毁时自动移除，state 不再更新。

## 另见

- [useKey](./use-key) — 基础键盘事件监听
- [useKeyPressEvent](./use-key-press-event) — 按下/松开时分别触发

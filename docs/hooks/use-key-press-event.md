# useKeyPressEvent

在指定键被**按下**或**松开**时分别触发对应的回调函数。

## 签名

```ts
function useKeyPressEvent(
  key: KeyFilter,
  keydown?: Handler | null,
  keyup?: Handler | null,
): void
```

## 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `key` | `KeyFilter` | — | 要监听的键（同 [`useKey`](./use-key#参数)） |
| `keydown` | `Handler \| null` | `undefined` | 按下时的回调 |
| `keyup` | `Handler \| null` | `undefined` | 松开时的回调 |

`keydown` 和 `keyup` 均为可选，可以只传其中一个。

## 基本用法

```tsx
import { useKeyPressEvent } from '@piant/hooks';

export function MyComponent() {
  useKeyPressEvent(
    'Shift',
    () => console.log('Shift 按下'),
    () => console.log('Shift 松开'),
  );

  return <View />;
}
```

## 只监听按下

```tsx
useKeyPressEvent('Enter', () => submit());
```

## 只监听松开

```tsx
useKeyPressEvent('Space', null, () => releaseCharge());
```

## 结合状态实现长按检测

```tsx
const [holding, setHolding] = createState(false);

useKeyPressEvent(
  ' ',
  () => setHolding(true),  // keydown
  () => setHolding(false), // keyup
);

return <Text>{holding() ? '长按中…' : '未按下'}</Text>;
```

## 与 `useKey` 的区别

| 特性 | `useKey` | `useKeyPressEvent` |
|------|----------|--------------------|
| 事件类型 | 可配置（`keydown` / `keyup`） | 分别注册 keydown 和 keyup |
| 用法 | 单一回调 | 两个独立回调 |
| 适合场景 | 单一事件响应 | 需要同时处理按下与松开 |

## 自动清理

与 `useKey` 相同，监听器在响应式 Owner 销毁时自动移除。

## 另见

- [useKey](./use-key) — 基础键盘事件监听
- [useKeyPress](./use-key-press) — 响应式按键状态

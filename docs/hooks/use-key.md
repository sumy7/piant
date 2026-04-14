# useKey

监听键盘事件，当按键匹配时调用回调函数。

## 签名

```ts
function useKey(
  key: KeyFilter,
  handler: Handler,
  opts?: UseKeyOptions,
): void
```

## 参数

### `key: KeyFilter`

```ts
type KeyFilter =
  | string                           // 匹配 event.key，如 'a'、'ArrowLeft'、'Enter'
  | ((event: KeyboardEvent) => boolean) // 自定义断言函数
  | null
  | undefined                        // null/undefined：永不触发
```

### `handler: Handler`

```ts
type Handler = (event: KeyboardEvent) => void
```

匹配时执行的回调，接收原始 `KeyboardEvent`。

### `opts?: UseKeyOptions`

```ts
interface UseKeyOptions {
  event?: 'keydown' | 'keypress' | 'keyup' // 默认 'keydown'
  target?: EventTarget                       // 默认 window
}
```

## 基本用法

```tsx
import { useKey } from '@piant/hooks';

export function MyComponent() {
  useKey('ArrowLeft', () => moveLeft());
  useKey('ArrowRight', () => moveRight());

  return <View />;
}
```

## 监听 keyup

```tsx
useKey('a', (e) => console.log('a released'), { event: 'keyup' });
```

## 自定义断言函数

```tsx
// 同时按下 Ctrl + S
useKey(
  (e) => e.ctrlKey && e.key === 's',
  (e) => {
    e.preventDefault();
    save();
  },
);
```

## 自定义事件目标

```tsx
const ref = getCanvasElement();

useKey('Enter', () => confirm(), { target: ref });
```

## 自动清理

`useKey` 在响应式 Owner 销毁时自动移除监听器：

```tsx
root((dispose) => {
  useKey('q', () => quit());

  // 销毁 Owner 后，'q' 的监听器自动解绑
  dispose();
});
```

## 类型导出

```ts
import type { Handler, KeyEventType, KeyFilter, UseKeyOptions } from '@piant/hooks';
```

## 另见

- [useKeyPress](./use-key-press) — 追踪按键是否正在被按下
- [useKeyPressEvent](./use-key-press-event) — 按下/松开分别触发

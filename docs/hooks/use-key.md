# useKey

监听键盘事件，当按键匹配时调用回调函数。

## 在线体验

先点击示例中的输入框，再按 ← / → 移动方块（位置范围为 -2 到 2），按 Enter 归位。观察按键次数与位置的变化，移开焦点后再按键则不会控制方块。

<LiveExample example="keyboard" title="useKey：限定目标的键盘交互" :height="300" />

示例将 `target` 指向自己的输入框，并在 `Input` 的同步 `ref` 回调中调用 `useKey`，保证注册时处于组件的响应式 Owner 内。重新运行或卸载示例时会自动解绑监听器。展开代码可复制完整实现。

## 签名

```ts
function useKey(key: KeyFilter, handler: Handler, opts?: UseKeyOptions): void;
```

## 参数

### `key: KeyFilter`

```ts
type KeyFilter =
  | string // 匹配 event.key，如 'a'、'ArrowLeft'、'Enter'
  | ((event: KeyboardEvent) => boolean) // 自定义断言函数
  | null
  | undefined; // null/undefined：永不触发
```

### `handler: Handler`

```ts
type Handler = (event: KeyboardEvent) => void;
```

匹配时执行的回调，接收原始 `KeyboardEvent`。

### `opts?: UseKeyOptions`

```ts
interface UseKeyOptions {
  event?: 'keydown' | 'keypress' | 'keyup'; // 默认 'keydown'
  target?: EventTarget; // 默认 window
  ignoreComposition?: boolean; // 默认 true，跳过 IME 按键
}
```

业务快捷键默认跳过组合输入及其结束按键，同时检查 `isComposing`、兼容边界值 `keyCode === 229` 和 core Input 的组合状态。需要观察原始按键时，可显式传入 `ignoreComposition: false`；这不会撤销 Input 对 IME Enter/Escape 的冒泡隔离。自建 capture 监听应先调用 core 的 `isComposingInput(event)`。

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
import type {
  Handler,
  KeyEventType,
  KeyFilter,
  UseKeyOptions,
} from '@piant/hooks';
```

## 另见

- [useKeyPress](./use-key-press) — 追踪按键是否正在被按下
- [useKeyPressEvent](./use-key-press-event) — 按下/松开分别触发

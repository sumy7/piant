# @piant/hooks 简介

`@piant/hooks` 是 Piant 生态中的键盘交互工具包，提供一组开箱即用的键盘事件 hooks。

所有 hooks 均深度整合 Piant 的响应式系统——监听器在宿主组件的**响应式上下文（Owner）销毁时自动解绑**，无需手动管理生命周期。

## 功能一览

| Hook | 说明 |
|------|------|
| [`useKey`](./use-key) | 监听键盘事件，匹配时调用回调 |
| [`useKeyPress`](./use-key-press) | 追踪某个键的按下/松开状态，返回响应式布尔值 |
| [`useKeyPressEvent`](./use-key-press-event) | 按下与松开时分别触发不同回调 |
| [`useKeystroke`](./use-keystroke) | 绑定单键或组合键（基于 `@rwh/keystrokes`） |

## 安装

```bash
pnpm add @piant/hooks
```

> `@piant/hooks` 以 `@piant/core` 作为 peerDependency，请确保已安装。

## 引入方式

所有 hooks 均从同一入口导入：

```ts
import { useKey, useKeyPress, useKeyPressEvent, useKeystroke } from '@piant/hooks';
```

也可以按需导入：

```ts
import { useKey } from '@piant/hooks';
import { useKeyPress } from '@piant/hooks';
import { useKeyPressEvent } from '@piant/hooks';
import { useKeystroke } from '@piant/hooks';
```

## 使用须知

### 必须在响应式上下文中调用

所有 hooks 内部使用 `onCleanup` 注册清理函数，因此**必须在 Piant 的响应式上下文（组件函数体或 `root` 回调）内调用**，否则自动解绑无法生效。

```tsx
// ✅ 正确：在组件函数体内调用
export function MyComponent() {
  useKey('Escape', () => console.log('ESC'));
  return <View />;
}

// ✅ 正确：在 root 回调中调用
root((dispose) => {
  useKey('Escape', () => console.log('ESC'));
});

// ❌ 错误：在顶层调用（没有响应式 Owner）
useKey('Escape', () => console.log('ESC'));
```

### 事件目标默认为 `window`

`useKey` 和 `useKeyPressEvent` 默认将事件监听器附加到 `window`。可通过 `opts.target` 指定其他 DOM 元素。

## 下一步

- [useKey](./use-key) — 基础键盘事件监听
- [useKeyPress](./use-key-press) — 响应式按键状态
- [useKeyPressEvent](./use-key-press-event) — 按下/松开双回调
- [useKeystroke](./use-keystroke) — 单键与组合键绑定

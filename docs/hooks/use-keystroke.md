# useKeystroke

绑定**单键**或**组合键**处理函数，底层基于 [`@rwh/keystrokes`](https://github.com/RobertWHurst/Keystrokes) 实现。

支持按下、持续按下（repeat）、松开三个阶段的独立回调，以及多步序列组合键（如 `control > y, r`）。

## 签名

```ts
function useKeystroke(
  key: string,
  handler: KeystrokeHandler | KeyComboHandler,
): void
```

## 参数

### `key: string`

键名或组合键表达式。

**单键**：使用 [KeyboardEvent.key](https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/key) 的标准值（大小写不敏感）：

```
'a'  'Enter'  'Escape'  'ArrowLeft'  'control'  'shift'
```

**组合键表达式**：

| 运算符 | 含义 | 示例 |
|--------|------|------|
| `+` | 同时按下（Unit 内多键） | `'control + s'` |
| `>` | 先后按下（Unit 序列） | `'control > z'` |
| `,` | 多序列组合 | `'control > y, r'` |
| `\` | 转义运算符字符 | `'a \+ b'` |

> 含有 `+`、`>` 或 `,` 的字符串会自动识别为组合键，调用 `bindKeyCombo`；否则调用 `bindKey`。

### `handler: KeystrokeHandler | KeyComboHandler`

支持两种形式：

**函数形式**（等价于 `onPressedWithRepeat`）：

```ts
useKeystroke('a', () => console.log('按住 a'));
```

**对象形式**：

```ts
useKeystroke('a', {
  onPressed: (e) => console.log('首次按下 a'),
  onPressedWithRepeat: (e) => console.log('按住 a（含连发）'),
  onReleased: (e) => console.log('松开 a'),
});
```

| 回调 | 触发时机 |
|------|----------|
| `onPressed` | 首次按下（不含连发） |
| `onPressedWithRepeat` | 按下及连发期间持续触发 |
| `onReleased` | 松开时 |

## 基本用法

### 单键

```tsx
import { useKeystroke } from '@piant/hooks';

export function MyComponent() {
  useKeystroke('p', () => togglePause());
  useKeystroke('r', { onPressed: () => restart() });

  return <View />;
}
```

### 同时按下多键（`+`）

```tsx
// Ctrl + S 保存
useKeystroke('control + s', {
  onPressed: (e) => {
    e.originalEvent?.preventDefault();
    save();
  },
});
```

### 先后按下（`>`）

```tsx
// 先按 Ctrl，再按 Z（不松开 Ctrl）
useKeystroke('control > z', { onPressed: () => undo() });
```

### 多步序列（`,`）

```tsx
// 先完成 control > y，全部松开，再按 r
useKeystroke('control > y, r', { onPressed: () => redo() });
```

## 完整示例：游戏快捷键

```tsx
export function GameScene() {
  useKeystroke('p', {
    onPressed: () => togglePause(),
  });

  useKeystroke('control + r', {
    onPressed: () => restartGame(),
  });

  // 俄罗斯方块旋转：Up 或 Z
  useKeystroke('ArrowUp', () => rotate());
  useKeystroke('z', () => rotate());

  return <View />;
}
```

## 自动清理

binding 在响应式 Owner 销毁时自动调用 `unbindKey` / `unbindKeyCombo` 解绑：

```tsx
root((dispose) => {
  useKeystroke('control + s', () => save());
  dispose(); // 解绑，后续 Ctrl+S 不再触发
});
```

## 与 `useKey` 的区别

| 特性 | `useKey` | `useKeystroke` |
|------|----------|----------------|
| 底层实现 | `addEventListener` | `@rwh/keystrokes` |
| 组合键 | 需手动判断 modifier | 原生支持 `a + b > c` 表达式 |
| 多步序列 | 不支持 | 支持 `,` 序列语法 |
| 连发回调 | 需自行区分 | `onPressed` vs `onPressedWithRepeat` |
| 适合场景 | 简单按键响应 | 游戏快捷键、编辑器组合键 |

## 类型导出

```ts
import type { KeyComboHandler, KeystrokeHandler } from '@piant/hooks';
```

## 另见

- [useKey](./use-key) — 基础键盘事件监听
- [useKeyPressEvent](./use-key-press-event) — 按下/松开分别触发
- [@rwh/keystrokes 文档](https://github.com/RobertWHurst/Keystrokes) — 底层库完整文档

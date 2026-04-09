# StyleSheet

Piant 提供了 `StyleSheet` 工具对象，用于管理和操作样式，设计灵感来自 React Native 的 StyleSheet API。

## StyleSheet.create

`StyleSheet.create` 是一个身份函数（identity function），用于创建样式表。主要优势是在 IDE 中获得完整的 TypeScript 类型检查和智能提示。

```tsx
import { StyleSheet } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111111',
  },
  button: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// 使用
<View style={styles.container}>
  <TextView style={styles.title}>标题</TextView>
</View>
```

## StyleSheet.flatten

`StyleSheet.flatten` 将样式数组展平为单个样式对象，后面的样式会覆盖前面的同名属性。

```tsx
const baseStyle = { padding: 8, backgroundColor: '#fff' };
const activeStyle = { backgroundColor: '#e0e0ff' };

const merged = StyleSheet.flatten([baseStyle, activeStyle]);
// 结果：{ padding: 8, backgroundColor: '#e0e0ff' }
```

在 `View` 等组件中，`style` 属性传入数组时会自动调用 `flatten`：

```tsx
<View style={[styles.base, isActive && styles.active]} />
```

## StyleSheet.compose

`StyleSheet.compose` 将两个样式合并，`style2` 中的属性会覆盖 `style1`：

```tsx
const result = StyleSheet.compose(style1, style2);
```

与 `flatten` 的区别：当某个参数为 falsy 时，直接返回另一个，不分配新数组，适合性能敏感场景。

## 动态样式

通过响应式状态动态切换样式：

```tsx
const [isActive, setIsActive] = createState(false);

const dynamicStyle = createMemo(() =>
  StyleSheet.flatten([
    styles.base,
    isActive() && styles.active,
  ])
);

<View style={dynamicStyle()} />
```

## 样式优先级

当 `style` 为数组时，**后面的样式优先级更高**：

```tsx
<View style={[
  { backgroundColor: 'red' },   // 被覆盖
  { backgroundColor: 'blue' },  // 生效
]} />
```

## 类型系统

`StyleSheet.create` 接受 `Record<string, ViewStyles>` 类型，提供完整的类型检查：

```ts
import type { ViewStyles } from '@piant/core';

// 可以手动标注类型
const myStyle: ViewStyles = {
  width: 100,
  // TypeScript 会检查属性名和类型
};
```

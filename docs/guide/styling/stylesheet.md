# StyleSheet

Piant 提供了 `StyleSheet` 工具对象，用于管理和操作样式，设计灵感来自 React Native 的 StyleSheet API。

## StyleSheet.create

`StyleSheet.create` 是一个带类型检查的样式表工厂函数，接受普通样式对象和通过 `StyleSheet.extend` 声明的继承样式。继承样式会在 `create` 时被立即解析为普通对象。

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
  <Text style={styles.title}>标题</Text>
</View>
```

## StyleSheet.extend（样式继承）

`StyleSheet.extend` 声明样式继承关系，使一个样式可以复用并覆盖已有样式的属性，支持单继承、多继承和深层继承链。

### 单父继承

```tsx
const styles = StyleSheet.create({
  base: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  primary: StyleSheet.extend('base', {
    backgroundColor: '#0055ff',
  }),
  danger: StyleSheet.extend('base', {
    backgroundColor: '#ff3b30',
  }),
});
// styles.primary => { padding: 12, borderRadius: 8, backgroundColor: '#0055ff' }
// styles.danger  => { padding: 12, borderRadius: 8, backgroundColor: '#ff3b30' }
```

### 多父合并继承

多个父样式从左到右合并，右侧覆盖左侧，子样式属性最后应用：

```tsx
const styles = StyleSheet.create({
  rounded: { borderRadius: 8 },
  elevated: { opacity: 0.9 },
  card: StyleSheet.extend(['rounded', 'elevated'], {
    backgroundColor: '#fff',
  }),
});
// styles.card => { borderRadius: 8, opacity: 0.9, backgroundColor: '#fff' }
```

### 深层继承链

```tsx
const styles = StyleSheet.create({
  base: { padding: 8 },
  panel: StyleSheet.extend('base', { backgroundColor: '#fff' }),
  button: StyleSheet.extend('panel', { alignItems: 'center' }),
});
// styles.button => { padding: 8, backgroundColor: '#fff', alignItems: 'center' }
```

### 从样式对象直接继承

也可以直接传入已有样式对象作为父级：

```tsx
const base = { padding: 16, flex: 1 };
const styles = StyleSheet.create({
  derived: StyleSheet.extend(base, { color: 'red' }),
});
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

## StyleSheet.resolve

`StyleSheet.resolve` 将 `StyleValue`（对象、数组或假值）解析为单个平铺样式对象，语义上等同于 `flatten`：

```tsx
const resolved = StyleSheet.resolve([styles.base, isActive && styles.active]);
```

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

继承样式中，优先级从低到高依次为：父样式（多父时按声明顺序，右侧覆盖左侧） → 子样式自身 → 传入的 `style` prop。

## 推荐使用场景

| API | 推荐场景 |
|-----|----------|
| `create` | 模块初始化时声明静态样式集合 |
| `extend` | 在 `create` 内部复用和派生已有样式 |
| `flatten` | 将已展开的样式对象数组合并为单个对象 |
| `resolve` | 运行时统一消费来自 props 的样式（对象/数组/假值均可） |
| `compose` | 性能敏感的二元样式合并（避免数组分配） |

**何时用 `flatten` vs `resolve`**

- 样式已经是展开的对象数组时 → 使用 `flatten`。
- 消费来自外部 props 的 `style`（类型是 `StyleValue<T>`，不确定是对象还是数组还是假值）→ 使用 `resolve`，它是更安全的统一入口。

## 组件 style prop 的类型声明

自定义组件中推荐使用 `StyleValue<T>` 标注 `style` prop：

```ts
import type { StyleValue, ViewStyles } from '@piant/core';

interface MyComponentProps {
  style?: StyleValue<ViewStyles>;
}
```

这样使用方可以传入单个对象、数组或 `isActive && style` 表达式，全部兼容。



## 类型系统

样式类型层次：

```
LayoutStyles  ← Yoga flexbox 布局属性（YogaStyles 的公开名称）
VisualStyles  ← 视觉外观（背景色、圆角、透明度等）
ViewStyles    = LayoutStyles & Partial<VisualStyles>
ImageStyles   = ViewStyles & { objectFit? }
TextStyles    = ViewStyles & Partial<TextLayoutStyle>  ← 文本样式完整能力集
TextViewStyles = TextStyles                            ← Text 组件对外主类型
```

`LayoutStyles` 与 `YogaStyles` 完全等价，前者是推荐的对外名称，后者是绑定实现的内部名称。

`TextViewStyles` 与 `TextStyles` 完全等价，用于 `Text` / `TextView` 组件的 prop 类型声明时推荐使用 `TextViewStyles`，更明确地表达组件用途。

```ts
import type { ViewStyles, TextStyles, TextViewStyles } from '@piant/core';

// View 组件样式
const viewStyle: ViewStyles = { width: 100, padding: 8 };

// Text 组件样式（包含布局和文字属性）
const textStyle: TextViewStyles = { fontSize: 16, color: '#111', padding: 8 };
```

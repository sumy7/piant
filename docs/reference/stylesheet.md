# 样式 API

## StyleSheet

```ts
const StyleSheet: {
  create<T extends object = ViewStyles>(
    obj: Record<string, StyleEntry<T>>
  ): Record<string, Partial<T>>;

  extend<T extends object = ViewStyles>(
    parents: string | Array<string | Partial<T>> | Partial<T>,
    override?: Partial<T>
  ): StyleReference<T>;

  flatten(style?: StyleValue | StyleValue[] | false | null | undefined): object | undefined;

  compose<T extends object>(
    style1?: Partial<T> | null,
    style2?: Partial<T> | null
  ): Partial<T> | [Partial<T>, Partial<T>] | undefined;

  resolve<T extends object = ViewStyles>(
    style: StyleValue<T>
  ): Partial<T> | undefined;
};
```

### StyleSheet.create

创建带类型检查的样式表。支持普通样式对象和通过 `StyleSheet.extend` 创建的继承样式引用（`StyleReference`），后者在 `create` 调用时会被立即解析为普通对象。

```ts
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold' },
  // 继承 container 并覆盖部分属性
  activeContainer: StyleSheet.extend('container', { backgroundColor: '#e0e0ff' }),
});
```

### StyleSheet.extend

声明样式继承关系，返回一个 `StyleReference`，供 `StyleSheet.create` 在解析时使用。

支持三种形式：

**单父继承（by key）**

```ts
StyleSheet.extend('base', { backgroundColor: '#0055ff' })
```

**多父合并继承（by keys array）**

多个父样式从左到右合并，右侧覆盖左侧，最后应用子样式：

```ts
StyleSheet.extend(['rounded', 'elevated'], { backgroundColor: '#fff' })
```

**从已有样式对象继承**

```ts
StyleSheet.extend(baseStyle, { color: 'red' })
```

完整示例：

```ts
const styles = StyleSheet.create({
  base: { padding: 12, borderRadius: 8 },
  elevated: StyleSheet.extend('base', { opacity: 0.9 }),
  primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
  primaryText: StyleSheet.extend('primary', { color: '#fff', fontWeight: 'bold' }),
});
```

### StyleSheet.flatten

将样式数组展平为单个对象，后面的属性覆盖前面的。当传入 `null`、`undefined`、`false` 或非对象值时返回 `undefined`。

```ts
StyleSheet.flatten([style1, style2, false, style3]);
// 返回合并后的样式对象，或 undefined（当输入为空/非对象时）
```

### StyleSheet.compose

合并两个样式，`style2` 优先级更高。当两个样式都存在时，返回 `[style1, style2]` 数组供后续 `flatten` 处理；若其中一个为假值，则直接返回另一个，不分配新数组。

```ts
StyleSheet.compose(baseStyle, overrideStyle);
```

### StyleSheet.resolve

将 `StyleValue`（对象、数组或假值）解析为单个平铺样式对象。语义上等同于 `flatten`，但名称更明确地表达"解析"意图。

```ts
const resolved = StyleSheet.resolve([styles.base, isActive && styles.active]);
```

---

## 样式类型层次

```
LayoutStyles  (= YogaStyles，Yoga flexbox 布局属性)
VisualStyles  (视觉外观：背景色、圆角、透明度等)
ViewStyles    = LayoutStyles & Partial<VisualStyles>   ← View 组件使用
ImageStyles   = ViewStyles & { objectFit? }            ← Image 组件使用
TextStyles    = ViewStyles & Partial<TextLayoutStyle>  ← Text 组件使用（含文字属性）
TextViewStyles = TextStyles                            ← TextStyles 的语义别名
```

### LayoutStyles / YogaStyles

Yoga flexbox 布局属性，两者等价：

| 属性 | 类型 |
|------|------|
| `width` / `height` | `NumberValue \| 'auto'` |
| `minWidth` / `maxWidth` | `NumberValue` |
| `minHeight` / `maxHeight` | `NumberValue` |
| `flex` / `flexGrow` / `flexShrink` | `number` |
| `flexDirection` | `'row' \| 'column' \| ...` |
| `flexWrap` | `'nowrap' \| 'wrap' \| ...` |
| `justifyContent` | `JustifyContent` |
| `alignItems` / `alignSelf` / `alignContent` | `AlignItems` |
| `gap` / `rowGap` / `columnGap` | `number` |
| `padding` / `paddingTop` / ... | `NumberValue` |
| `margin` / `marginTop` / ... | `NumberValue \| 'auto'` |
| `position` | `'relative' \| 'absolute' \| 'static'` |
| `top` / `bottom` / `left` / `right` | `NumberValue` |
| `overflow` | `'visible' \| 'hidden' \| 'scroll'` |
| `boxSizing` | `'border-box' \| 'content-box'` |
| `display` | `'none' \| 'flex' \| 'contents'` |

### VisualStyles

| 属性 | 类型 | 说明 |
|------|------|------|
| `backgroundColor` | `ColorSource` | 背景颜色 |
| `borderColor` | `ColorSource` | 边框颜色 |
| `borderRadius` | `number` | 四角圆角半径 |
| `borderTopLeftRadius` | `number` | 左上圆角 |
| `borderTopRightRadius` | `number` | 右上圆角 |
| `borderBottomRightRadius` | `number` | 右下圆角 |
| `borderBottomLeftRadius` | `number` | 左下圆角 |
| `opacity` | `number` | 不透明度（0-1） |
| `zIndex` | `number` | 层叠顺序 |

### ImageStyles

继承 `ViewStyles`，额外支持：

```ts
interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

### TextStyles / TextViewStyles

继承 `ViewStyles`，额外支持文本布局属性：

```ts
type TextStyles = ViewStyles & Partial<TextLayoutStyle>;
type TextViewStyles = TextStyles; // 语义别名

interface TextLayoutStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic' | 'oblique' | string;
  color: string;
  lineHeight: number | `${number}x` | 'normal';
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace: 'normal' | 'nowrap' | string;
  wordBreak: 'break-word' | 'normal' | string;
  verticalAlign: 'baseline' | 'middle' | 'top' | 'bottom';
}
```

---

## StyleValue 类型

```ts
type StyleValue<T extends object = object> =
  | Partial<T>
  | StyleValue<T>[]
  | false
  | null
  | undefined;
```

组件的 `style` prop 均接受此类型，支持：
- 单个样式对象
- 样式数组（包含嵌套）
- `false` / `null` / `undefined`（忽略）

---

## NumberValue 类型

```ts
type NumberValue = number | `${number}%` | `${number}`;
```

支持：
- `200` — 像素值
- `'50%'` — 百分比
- `'200'` — 数字字符串（等同于像素值）

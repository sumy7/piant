# 样式 API

## StyleSheet

```ts
const StyleSheet: {
  create(obj: Record<string, ViewStyles>): Record<string, ViewStyles>;
  flatten(style: ViewStyles | ViewStyles[] | false | null | undefined): ViewStyles;
  compose(style1: ViewStyles | null | undefined, style2: ViewStyles | null | undefined): ViewStyles | null | undefined;
};
```

### StyleSheet.create

身份函数，用于创建带类型检查的样式表。

```ts
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold' },
});
```

### StyleSheet.flatten

将样式数组展平为单个对象，后面的属性覆盖前面的。

```ts
StyleSheet.flatten([style1, style2, false, style3]);
// 返回合并后的样式对象
```

### StyleSheet.compose

合并两个样式，`style2` 优先级更高。

```ts
StyleSheet.compose(baseStyle, overrideStyle);
```

---

## ViewStyles 类型

`ViewStyles` = `Partial<VisualStyles> & YogaStyles`

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

### YogaStyles（布局属性，部分）

完整列表详见[布局样式文档](/guide/styling/layout)。

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

---

## ImageStyles 类型

继承 `ViewStyles`，额外支持：

```ts
interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

---

## TextStyles 类型

继承 `ViewStyles`，额外支持文本布局属性：

```ts
type TextStyles = ViewStyles & Partial<TextLayoutStyle>;

interface TextLayoutStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  color: ColorSource;
  lineHeight: number | string;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace: 'normal' | 'nowrap';
  wordBreak: 'normal' | 'break-all' | 'break-word';
  verticalAlign: 'baseline' | 'middle' | 'top' | 'bottom';
}
```

---

## NumberValue 类型

```ts
type NumberValue = number | `${number}%` | `${number}`;
```

支持：
- `200` — 像素值
- `'50%'` — 百分比
- `'200'` — 数字字符串（等同于像素值）

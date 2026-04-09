# TextView

`TextView` 是 Piant 中用于渲染富文本内容的组件，支持内联样式、多字体、图文混排等功能。所有文本内容都必须包裹在 `TextView` 中。

## 基本用法

```tsx
import { TextView } from '@piant/core';

<TextView>Hello, Piant!</TextView>
```

```tsx
// 带样式
<TextView style={{ fontSize: 20, color: '#333', fontWeight: 'bold' }}>
  标题文本
</TextView>
```

## 使用 Span 设置内联样式

`Span` 用于给文本片段单独设置样式：

```tsx
import { TextView, Span } from '@piant/core';

<TextView style={{ fontSize: 16, color: '#333' }}>
  这是<Span style={{ color: 'red', fontWeight: 'bold' }}>红色粗体</Span>文字
</TextView>
```

## 图文混排

使用 `ImageSpan` 可以在文字行内插入图片：

```tsx
import { TextView, Span, ImageSpan } from '@piant/core';
import { Graphics } from 'pixi.js';

const icon = new Graphics().svg(iconSvg);

<TextView>
  <Span>点击</Span>
  <ImageSpan src={icon} style={{ width: 16, height: 16 }} />
  <Span>图标</Span>
</TextView>
```

## Props

### TextView Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `TextStyles \| TextStyles[]` | 文本样式（同时支持布局样式和文本样式） |
| `children` | `JSX.Element` | 子内容，可以是字符串、`Span`、`ImageSpan` |
| `ref` | `(el: PText) => void` | 获取底层节点实例 |

### Span Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `TextStyles` | 内联文本样式 |
| `bold` | `boolean` | 快捷设置 `fontWeight: 'bold'` |
| `italic` | `boolean` | 快捷设置 `fontStyle: 'italic'` |
| `children` | `string \| Span \| ImageSpan` | 子内容 |

### ImageSpan Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `src` | `Sprite \| Graphics` | 图片源 |
| `style` | `TextStyles` | 内联样式（宽高等） |

## 文本样式属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fontSize` | `number` | `16` | 字体大小（像素） |
| `fontFamily` | `string` | `'Arial'` | 字体族 |
| `fontWeight` | `'normal' \| 'bold' \| string` | `'normal'` | 字体粗细 |
| `fontStyle` | `'normal' \| 'italic'` | `'normal'` | 字体风格 |
| `color` | `ColorSource` | `'#000000'` | 文字颜色 |
| `lineHeight` | `number \| string` | `20` | 行高（像素或倍数字符串如 `'1.5x'`） |
| `letterSpacing` | `number` | `0` | 字间距（像素） |
| `textAlign` | `'left' \| 'center' \| 'right'` | `'left'` | 文本对齐 |
| `textTransform` | `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'` | `'none'` | 文本变换 |
| `whiteSpace` | `'normal' \| 'nowrap'` | `'normal'` | 空白字符处理 |
| `wordBreak` | `'normal' \| 'break-all' \| 'break-word'` | `'break-word'` | 换行规则 |
| `verticalAlign` | `'baseline' \| 'middle' \| 'top' \| 'bottom'` | `'baseline'` | 垂直对齐（用于 ImageSpan） |

## 完整示例

```tsx
import { StyleSheet, Span, TextView } from '@piant/core';

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  highlight: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#d63384',
  },
});

<TextView style={styles.body}>
  使用 <Span style={styles.highlight}>Piant</Span> 构建
  <Span style={styles.code}> Canvas </Span> 应用。
</TextView>
```

## 注意事项

- 直接在 `<View>` 中使用字符串子节点会产生警告，文本必须放在 `<TextView>` 中
- `Span` 和 `ImageSpan` 只能用于 `TextView` 内部，不能单独使用
- `TextView` 的布局由外层的 `View` 尺寸决定，文字会在该区域内自动换行

# Text

`Text` 是 Piant 中用于渲染富文本内容的组件，支持内联样式、多字体、图文混排等功能。所有文本内容都必须包裹在 `Text` 中。

## 基本用法

```tsx
import { Text } from '@piant/core';

<Text>Hello, Piant!</Text>;
```

```tsx
// 带样式
<Text style={{ fontSize: 20, color: '#333', fontWeight: 'bold' }}>
  标题文本
</Text>
```

## 使用 Span 设置内联样式

`Span` 用于给文本片段单独设置样式：

```tsx
import { Text, Span } from '@piant/core';

<Text style={{ fontSize: 16, color: '#333' }}>
  这是<Span style={{ color: 'red', fontWeight: 'bold' }}>红色粗体</Span>文字
</Text>;
```

## 图文混排

使用 `Img` 可以在文字行内插入图片：

```tsx
import { Text, Span, Img } from '@piant/core';
import { Graphics } from 'pixi.js';

const icon = new Graphics().svg(iconSvg);

<Text>
  <Span>点击</Span>
  <Img src={icon} style={{ width: 16, height: 16 }} />
  <Span>图标</Span>
</Text>;
```

## Props

### Text Props

| 属性       | 类型                         | 说明                                   |
| ---------- | ---------------------------- | -------------------------------------- |
| `style`    | `TextStyles \| TextStyles[]` | 文本样式（同时支持布局样式和文本样式） |
| `children` | `JSX.Element`                | 子内容，可以是字符串、`Span`、`Img`    |
| `ref`      | `(el: PText) => void`        | 获取底层节点实例                       |

### Span Props

| 属性       | 类型                    | 说明                           |
| ---------- | ----------------------- | ------------------------------ |
| `style`    | `TextStyles`            | 内联文本样式                   |
| `bold`     | `boolean`               | 快捷设置 `fontWeight: 'bold'`  |
| `italic`   | `boolean`               | 快捷设置 `fontStyle: 'italic'` |
| `children` | `string \| Span \| Img` | 子内容                         |

### Img Props

| 属性    | 类型                 | 说明               |
| ------- | -------------------- | ------------------ |
| `src`   | `Sprite \| Graphics` | 图片源             |
| `style` | `TextStyles`         | 内联样式（宽高等） |

## 文本样式属性

| 属性            | 类型                                                   | 默认值         | 说明                                 |
| --------------- | ------------------------------------------------------ | -------------- | ------------------------------------ |
| `fontSize`      | `number`                                               | `16`           | 字体大小（像素）                     |
| `fontFamily`    | `string`                                               | `'Arial'`      | 字体族                               |
| `fontWeight`    | `'normal' \| 'bold' \| string`                         | `'normal'`     | 字体粗细                             |
| `fontStyle`     | `'normal' \| 'italic'`                                 | `'normal'`     | 字体风格                             |
| `color`         | `ColorSource`                                          | `'#000000'`    | 文字颜色                             |
| `lineHeight`    | `number \| string`                                     | `20`           | 行高（像素或倍数字符串如 `'1.5x'`）  |
| `letterSpacing` | `number`                                               | `0`            | 字间距（像素）；由 pretext 在断行时原生计算，渲染时逐字符绘制 |
| `textAlign`     | `'left' \| 'center' \| 'right'`                        | `'left'`       | 文本对齐                             |
| `textTransform` | `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'` | `'none'`       | 文本变换                             |
| `whiteSpace`    | `'normal' \| 'nowrap'`                                 | `'normal'`     | 空白字符处理                         |
| `wordBreak`     | `'normal' \| 'break-all' \| 'break-word'`              | `'break-word'` | 换行规则                             |
| `textOverflow`  | `'clip' \| 'ellipsis'`                                 | `'clip'`       | 超出可见行时的截断策略               |
| `lineClamp`     | `number`                                               | `0`            | 最大可见行数；`0` 或未设置表示不限制 |
| `verticalAlign` | `'baseline' \| 'middle' \| 'top' \| 'bottom'`          | `'baseline'`   | 垂直对齐（用于 Img）                 |

### textOverflow + lineClamp

`textOverflow` 需要与 `lineClamp` 搭配使用，才会在超出行数时生效：

- `lineClamp`：控制最多显示多少行。
- `textOverflow: 'clip'`：直接裁切，不显示省略符。
- `textOverflow: 'ellipsis'`：在最后一行尾部追加省略符。

```tsx
<Text
  style={{
    width: 280,
    lineHeight: 24,
    lineClamp: 2,
    textOverflow: 'ellipsis',
  }}
>
  这是一段较长文本，用于演示在限定行数后自动追加省略号的效果。
</Text>
```

### letterSpacing

`letterSpacing` 设置字符间距（像素），基于 `@chenglou/pretext` 在断行阶段原生计算，渲染时逐字符绘制，兼顾精确布局与正确换行：

```tsx
<Text style={{ fontSize: 18, letterSpacing: 6 }}>
  <Span>增大字间距的示例文本</Span>
</Text>
```

`letterSpacing` 与 `textAlign`、`lineClamp + textOverflow` 可正常组合使用：

```tsx
<Text style={{ fontSize: 18, letterSpacing: 6, textAlign: 'center' }}>
  <Span>居中对齐 + 字间距</Span>
</Text>

<Text
  style={{ fontSize: 18, letterSpacing: 6, lineClamp: 1, textOverflow: 'ellipsis' }}
>
  <Span>字间距 + 省略截断：超出部分将被替换为省略号</Span>
</Text>
```

## 完整示例

```tsx
import { StyleSheet, Span, Text } from '@piant/core';

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

<Text style={styles.body}>
  使用 <Span style={styles.highlight}>Piant</Span> 构建
  <Span style={styles.code}> Canvas </Span> 应用。
</Text>;
```

## 注意事项

- 直接在 `<View>` 中使用字符串子节点会产生警告，文本必须放在 `<Text>` 中
- `Span` 和 `Img` 只能用于 `Text` 内部，不能单独使用
- `Text` 的布局由外层的 `View` 尺寸决定，文字会在该区域内自动换行

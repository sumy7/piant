# 视觉样式

视觉样式控制元素的外观（颜色、圆角、透明度等），通过 `VisualStyles` 类型定义。

## 背景与边框

| 属性 | 类型 | 说明 |
|------|------|------|
| `backgroundColor` | `ColorSource` | 背景颜色 |
| `borderColor` | `ColorSource` | 边框颜色 |
| `borderRadius` | `number` | 四角圆角半径（像素） |
| `borderTopLeftRadius` | `number` | 左上角圆角半径 |
| `borderTopRightRadius` | `number` | 右上角圆角半径 |
| `borderBottomRightRadius` | `number` | 右下角圆角半径 |
| `borderBottomLeftRadius` | `number` | 左下角圆角半径 |

> **注意**：边框的宽度由布局属性 `borderWidth`（及其各方向变体）控制，`borderColor` 仅控制颜色。

## 透明度与层叠

| 属性 | 类型 | 说明 |
|------|------|------|
| `opacity` | `number` | 不透明度，范围 `0`（完全透明）到 `1`（完全不透明） |
| `zIndex` | `number` | 层叠顺序，数值越大越在上层 |

## 颜色格式

`ColorSource` 来自 PixiJS，支持多种颜色格式：

```tsx
// 十六进制字符串
backgroundColor: '#ff0000'
backgroundColor: '#f00'

// RGB 字符串
backgroundColor: 'rgb(255, 0, 0)'
backgroundColor: 'rgba(255, 0, 0, 0.5)'

// 颜色名称
backgroundColor: 'red'
backgroundColor: 'transparent'

// 十六进制数字
backgroundColor: 0xff0000
```

## 示例

```tsx
import { StyleSheet, View } from '@piant/core';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    opacity: 0.95,
  },
  badge: {
    backgroundColor: '#ff4444',
    borderRadius: 9999, // 完全圆形
    width: 20,
    height: 20,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
```

## 文本视觉样式

`TextView` 额外支持以下视觉样式属性，详见 [TextView](/guide/components/textview)：

| 属性 | 类型 | 说明 |
|------|------|------|
| `color` | `ColorSource` | 文字颜色 |
| `fontSize` | `number` | 字号（像素） |
| `fontFamily` | `string` | 字体族 |
| `fontWeight` | `string` | 字体粗细 |
| `fontStyle` | `'normal' \| 'italic'` | 斜体 |
| `textAlign` | `'left' \| 'center' \| 'right'` | 文本对齐 |
| `lineHeight` | `number \| string` | 行高 |
| `letterSpacing` | `number` | 字间距 |

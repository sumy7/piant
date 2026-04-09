# 布局样式

Piant 的布局系统基于 [Yoga Layout](https://www.yogalayout.dev/)，提供与 CSS Flexbox 高度兼容的布局属性。

## 尺寸属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `width` | `NumberValue \| 'auto'` | 元素宽度（像素、百分比或 'auto'） |
| `height` | `NumberValue \| 'auto'` | 元素高度 |
| `minWidth` | `NumberValue` | 最小宽度 |
| `maxWidth` | `NumberValue` | 最大宽度 |
| `minHeight` | `NumberValue` | 最小高度 |
| `maxHeight` | `NumberValue` | 最大高度 |
| `aspectRatio` | `number` | 宽高比（如 `16/9`） |

`NumberValue` 类型支持：
- 数字（像素），如 `200`
- 百分比字符串，如 `'50%'`
- 数字字符串，如 `'200'`

## Flexbox 属性

### 容器属性

| 属性 | 可选值 | 说明 |
|------|--------|------|
| `display` | `'flex'` \| `'none'` \| `'contents'` | 显示类型 |
| `flexDirection` | `'row'` \| `'column'` \| `'row-reverse'` \| `'column-reverse'` | 主轴方向 |
| `flexWrap` | `'nowrap'` \| `'wrap'` \| `'wrap-reverse'` | 是否换行 |
| `justifyContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'space-between'` \| `'space-around'` \| `'space-evenly'` | 主轴对齐 |
| `alignItems` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` \| `'baseline'` | 交叉轴对齐 |
| `alignContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` \| `'space-between'` \| `'space-around'` \| `'space-evenly'` | 多行交叉轴对齐 |
| `gap` | `number` | 子元素间距（行列同时设置） |
| `rowGap` | `number` | 行间距 |
| `columnGap` | `number` | 列间距 |

### 子项属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `flex` | `number` | 弹性因子（grow + shrink 简写） |
| `flexGrow` | `number` | 弹性增长系数 |
| `flexShrink` | `number` | 弹性收缩系数 |
| `flexBasis` | `NumberValue \| 'auto'` | 弹性基准尺寸 |
| `alignSelf` | 同 `alignItems` | 覆盖容器的 `alignItems` |

## 内外边距

| 属性 | 说明 |
|------|------|
| `padding` | 四边内边距 |
| `paddingTop` / `paddingBottom` / `paddingLeft` / `paddingRight` | 单边内边距 |
| `paddingInline` | 左右内边距简写 |
| `paddingBlock` | 上下内边距简写 |
| `paddingStart` / `paddingEnd` | 逻辑属性（LTR/RTL 感知） |
| `margin` | 四边外边距（支持 `'auto'`） |
| `marginTop` / `marginBottom` / `marginLeft` / `marginRight` | 单边外边距 |
| `marginInline` | 左右外边距简写 |
| `marginBlock` | 上下外边距简写 |

## 定位

| 属性 | 可选值 | 说明 |
|------|--------|------|
| `position` | `'relative'` \| `'absolute'` \| `'static'` | 定位方式 |
| `top` | `NumberValue` | 距顶部偏移 |
| `bottom` | `NumberValue` | 距底部偏移 |
| `left` | `NumberValue` | 距左侧偏移 |
| `right` | `NumberValue` | 距右侧偏移 |
| `inset` | `NumberValue` | 四边偏移简写 |

## 其他属性

| 属性 | 可选值 | 说明 |
|------|--------|------|
| `overflow` | `'visible'` \| `'hidden'` \| `'scroll'` | 溢出处理 |
| `boxSizing` | `'border-box'` \| `'content-box'` | 盒模型 |
| `direction` | `'ltr'` \| `'rtl'` | 文字和布局方向 |

## 示例

```tsx
// 水平居中的固定宽度容器
<View
  style={{
    width: 400,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  }}
/>

// 两列等宽布局
<View style={{ flexDirection: 'row', gap: 8 }}>
  <View style={{ flex: 1 }} />
  <View style={{ flex: 1 }} />
</View>

// 绝对定位
<View style={{ position: 'absolute', top: 10, right: 10, width: 50, height: 50 }} />
```

# Text

`Text` 是 Piant 中用于渲染富文本内容的组件，支持内联样式、多字体、图文混排等功能。所有文本内容都必须包裹在 `Text` 中。

## 在线示例

观察同一行中的 Text、Span 和 Img：彩色粗体、斜体与图标共享文本布局。点击按钮切换两行省略与完整段落，或开关下划线与删除线，缩窄预览还能观察自动换行。

<LiveExample example="text" title="富文本与行数截断" :height="420" />

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

## 下划线与删除线

`Text` 和 `Span` 的 `textDecoration` 支持 `'none'`（默认）、`'underline'`、`'line-through'`，以及组合值 `'underline line-through'` / `'line-through underline'`。

```tsx
<Text style={{ fontSize: 20, textDecoration: 'underline line-through' }}>
  <Span>
    继承两种装饰 <Span>嵌套片段也继承</Span>
  </Span>
  <Span style={{ textDecoration: 'underline' }}>仅下划线</Span>
  <Span style={{ textDecoration: 'none' }}>取消装饰</Span>
</Text>
```

未设置的子级继承父级值；显式设置会替换继承值，`none` 可取消两种装饰。更新样式时可在这些值之间响应式切换。

装饰按最终可见文本片段绘制，颜色跟随片段的 `color`，支持混合字体/字号、换行、字间距与对齐，不改变文字测量或断行结果。截断后只绘制可见内容；省略号沿用其来源片段的装饰。行内图片与制表符不绘制装饰，因此图文之间的线条会断开。位置和粗细由字体度量推导；Canvas 不提供字体原生装饰表，删除线位置使用测得的 x 字高估算，不提供独立线色、粗细或线型配置。

紧行高下，下划线会向上限制在当前行框内，避免无下伸笔画的文字将线条裁出画布。

下面的可运行示例包含继承、子级覆盖、响应式开关、混合字体、居中换行、右对齐、省略号和行内图片：

<<< ../../../examples/text-layout/src/TextDecorationExample.tsx

在仓库根目录运行 `pnpm --filter @piant/examples-text-layout dev` 查看并点击开关。

## 图文混排

使用 `Img` 可以在文字行内插入 `Texture` 或 `Sprite`。`Img` 读取 `Sprite` 的纹理，不会将原 Sprite 加入文本容器，也不会复制它的变换或滤镜；行内尺寸优先使用有效的样式宽高（包括从父级 Text/Span 继承的值），没有有效样式值时使用纹理尺寸。建议通过 `Img` 的 `style.width`、`style.height` 显式设置所需尺寸。

`Graphics` 不能直接传给 `Img`。如果需要 SVG 图标，可由调用方使用已初始化的 PixiJS 渲染器将 `Graphics` 转成纹理，再传给 `Img`：

<<< ../../../examples/text-layout/src/InlineImageExample.tsx

在 `await app.init(...)` 之后，将 `app.renderer` 作为 `renderer` 属性传入此组件。完整运行示例见 [text-layout](https://github.com/sumy7/piant/tree/main/examples/text-layout)，在仓库根目录执行 `pnpm --filter @piant/examples-text-layout dev` 即可查看。

生成的纹理是 Graphics 当前内容的快照；后续修改 Graphics 不会自动更新它。示例生成纹理后立即释放临时 Graphics，并在组件清理时释放自己创建的 Sprite 和纹理（包括纹理源）。`Img` 借用输入纹理，不负责销毁；共享纹理应由其所有者在所有使用者结束后统一释放。参见 [PixiJS 纹理文档](https://pixijs.com/8.x/guides/components/textures)。

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

| 属性    | 类型                        | 说明                             |
| ------- | --------------------------- | -------------------------------- |
| `src`   | `Sprite \| Texture \| null` | 可选；省略或为 null 时使用空纹理 |
| `style` | `StyleValue<TextStyles>`    | 内联样式（宽高、垂直对齐等）     |

## 文本样式属性

| 属性             | 类型                                                                                              | 默认值         | 说明                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `fontSize`       | `number`                                                                                          | `16`           | 字体大小（像素）                                              |
| `fontFamily`     | `string`                                                                                          | `'Arial'`      | 字体族                                                        |
| `fontWeight`     | `'normal' \| 'bold' \| string`                                                                    | `'normal'`     | 字体粗细                                                      |
| `fontStyle`      | `'normal' \| 'italic'`                                                                            | `'normal'`     | 字体风格                                                      |
| `color`          | `ColorSource`                                                                                     | `'#000000'`    | 文字颜色                                                      |
| `lineHeight`     | `number \| string`                                                                                | `20`           | 行高（像素或倍数字符串如 `'1.5x'`）                           |
| `letterSpacing`  | `number`                                                                                          | `0`            | 字间距（像素）；由 pretext 在断行时原生计算，渲染时逐字符绘制 |
| `textAlign`      | `'left' \| 'center' \| 'right'`                                                                   | `'left'`       | 文本对齐                                                      |
| `textDecoration` | `'none' \| 'underline' \| 'line-through' \| 'underline line-through' \| 'line-through underline'` | `'none'`       | 下划线、删除线或两者组合；子级显式值替换继承值                |
| `textTransform`  | `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'`                                            | `'none'`       | 文本变换                                                      |
| `whiteSpace`     | `'normal' \| 'pre-wrap'`                                                                          | `'normal'`     | 折叠空白，或保留空格、制表符和换行                            |
| `wordBreak`      | `'normal' \| 'keep-all' \| 'break-word'`                                                          | `'break-word'` | `keep-all` 保持中日韩词组；其余使用默认断行                   |
| `textOverflow`   | `'clip' \| 'ellipsis'`                                                                            | `'clip'`       | 超出可见行时的截断策略                                        |
| `lineClamp`      | `number`                                                                                          | `0`            | 最大可见行数；`0` 或未设置表示不限制                          |
| `verticalAlign`  | `'baseline' \| 'middle' \| 'top' \| 'bottom'`                                                     | `'baseline'`   | 垂直对齐（用于 Img）                                          |

`wordBreak` 是段落级配置：目前仅 `keep-all` 启用独立模式；`normal`、兼容值 `break-word` 及其他字符串（包括 `break-all`）均使用默认断行，尚未提供独立 CSS `break-all` / `break-word` 语义。`whiteSpace` 同样按段落处理，只有 `pre-wrap` 保留空白，其余字符串使用 `normal`。

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

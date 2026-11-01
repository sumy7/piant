# 布局与状态组件

`Stack`、`Surface`、`Separator`、`Icon`、`Badge`、`ProgressBar`、`Spinner` 从 `@piant/ui` 根入口导入。它们复用 core 的布局、文字测量、图片和绘图节点，消费当前 `UIProvider` 的语义 tokens；没有 provider 时使用默认主题。

尺寸均为逻辑像素。`style` 接受 core 的 `StyleValue`，在组件默认样式之后应用，因此可以覆盖尺寸、间距、圆角和溢出规则。绘图颜色使用对应的 `color` 属性或主题 tokens。响应式属性通过 JSX 或 getter 转发；普通对象展开会提前读取 getter。`Surface` 不自动给内部 core `Text` 继承字体和颜色，需要文字样式时显式读取 `useUITheme()`。

## Stack

沿 Flex 主轴排列内容，默认纵向，子项之间使用主题间距。

<LiveExample example="uiStack" title="Stack：切换排列方向与自动换行" :height="320" />

| 属性                       | 类型与默认值                                     | 行为                             |
| -------------------------- | ------------------------------------------------ | -------------------------------- |
| `direction`                | `ViewStyles['flexDirection']`，`'column'`        | 支持横向、纵向及反向排列         |
| `gap`                      | `number \| keyof ThemeTokens['spacing']`，`'md'` | 数字为固定间距，token 随密度更新 |
| `align`                    | `ViewStyles['alignItems']`，`'stretch'`          | 交叉轴对齐                       |
| `justify`                  | `ViewStyles['justifyContent']`，`'flex-start'`   | 主轴对齐                         |
| `wrap`                     | `boolean`，`false`                               | 开启 Flex 换行                   |
| `children`、`style`、`ref` | 对应 core `View` 属性                            | `style` 最后应用                 |

`StackProps` 为公共属性类型。容器不会自动限制子项宽度；窄容器可使用 `wrap`、子项的 `flexShrink` 或 `maxWidth`。需要裁剪时显式设置 `style.overflow: 'hidden'`。

## Surface

提供语义背景、内边距和圆角，适合面板或分组区域。

<LiveExample example="uiSurface" title="Surface：明暗主题、密度与文字缩放" :height="340" />

| 属性                       | 类型与默认值                                     | 行为                                               |
| -------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `tone`                     | `'surface' \| 'raised' \| 'canvas'`，`'surface'` | 使用 `colors.surface`、`surfaceRaised` 或 `canvas` |
| `padding`                  | `number \| keyof ThemeTokens['spacing']`，`'md'` | 四边内边距                                         |
| `radius`                   | `number \| keyof ThemeTokens['radius']`，`'md'`  | 圆角半径                                           |
| `bordered`                 | `boolean`，`false`                               | 使用主题 `border` 的 1px 边框                      |
| `children`、`style`、`ref` | 对应 core `View` 属性                            | 布局和溢出由 core 样式控制                         |

`SurfaceProps` 为公共属性类型。背景不改变子树文字或图片，圆角也不等于子项裁剪；需要裁剪时设置 `overflow: 'hidden'`。

## Separator

使用 `colors.border` 绘制分隔线。

<LiveExample example="uiSeparator" title="Separator：横向与纵向分隔" :height="300" />

`SeparatorProps`：`orientation?: 'horizontal' | 'vertical'` 默认 `'horizontal'`；`thickness?: number` 默认 `1`；`length?: ViewStyles['width']` 指定长边。横线默认宽度 `100%`。纵线在横向 `Stack` / `View` 中省略长度时沿交叉轴拉伸，父容器需有可用高度；其他父方向请显式指定 `length`。非有限或负线宽回退到 `1`，`0` 不占线宽。`style` 和 `ref` 对应 core `View`，不接收子节点。使用数字可固定长度，使用百分比可随父容器伸缩。

## Icon

调用方可以提供图片资产，或在组件持有的 Graphics 上绘图；不附带图标集合。

<LiveExample example="uiIcon" title="Icon：不同几何形状与尺寸缩放" :height="250" />

`IconProps` 使用两种互斥输入，绘图回调类型为 `IconDraw`：

- `src`：core `Image` 接受的 `Sprite | Graphics`。通过 contain 保持比例并居中，支持负坐标或非正方形的源几何。资产模式不接收 `color`，颜色由资产本身决定。
- `draw(graphics, width, height, color)`：使用当前实际布局尺寸与颜色绘制；`color?: string` 默认 `colors.text`。根据传入尺寸构造几何，避免只为某个固定图标尺寸绘制。

公共选项包括 `size?: number`（默认 `24`，同时设置宽高）、`style`、`ref` 和可选 `label?: string`。`style` 可以覆盖宽高，绘制入口收到覆盖后的尺寸。输入模式在创建时确定；资产模式可更新 `src`，绘制模式可响应式更新颜色与绘图内容。

资产仍由调用方持有，Icon 不销毁 Sprite、Graphics 或其 texture；同一个可显示对象同时只能属于一个父节点，多个 Icon 应提供各自的实例。绘制模式的 Graphics 由组件创建和销毁，回调不要销毁或转移它，也不要缓存它跨实例使用。无 `label` 时为装饰图标；有标签时附加无 Tab 停靠的 DOM `img` 语义。

## Badge

`Badge` 使用外层 `View` 承载背景、圆角与内边距，内部标签通过 core `Text` 实际测量，不按字符数估算宽度。

<LiveExample example="uiBadge" title="Badge：内容变化、主题、密度与文字溢出" :height="330" />

`BadgeProps`：`children?: string | number`；`tone?: 'neutral' | 'primary' | 'danger'` 默认 `'neutral'`；`style?: StyleValue<ViewStyles>` 与 `ref` 对应外层 core `View`；`textStyle?: TextProps['style']` 对应内部文字。默认使用主题小字的字体、字号、行高，水平 `spacing.sm`、垂直 `spacing.xs` 和 pill 圆角。中性色使用 `surfaceRaised/text`，主色与危险色分别使用 `primary/onPrimary`、`danger/onDanger`。

内容驱动自然宽高；默认单行，在有限宽度下显示省略号。通过 `maxWidth` 或父布局约束限制长标签。`fontScale` 改变测量后的文字和节点高度；`style` 在外层默认样式后应用，可覆盖背景、内边距、宽高与溢出；`textStyle` 在标签默认样式后应用，可覆盖文字颜色、字体及截断规则。文字表达业务状态，不建立焦点或自动朗读通知。需要播报状态的应用可自行提供对应 DOM 语义。

## ProgressBar

显示一个范围内的确定进度，或等待结果时的不确定进度。

<LiveExample example="uiProgressBar" title="ProgressBar：进度边界、模式切换与减少动画" :height="320" />

| 属性            | 类型与默认值                | 行为                                                    |
| --------------- | --------------------------- | ------------------------------------------------------- |
| `min`、`max`    | `number`，`0` / `100`       | 非有限端点分别回退到默认值；`max <= min` 时确定进度为空 |
| `value`         | `number`，`0`               | 限制到有效范围；非有限值显示为空                        |
| `indeterminate` | `boolean`，`false`          | 开启后不使用 `value` 绘制长度                           |
| `thickness`     | `number`，`6`               | 默认高度                                                |
| `label`         | `string`，省略              | 提供 DOM `progressbar` 语义名称                         |
| `style`、`ref`  | 对应 core `CustomView` 属性 | 可覆盖布局宽高                                          |

`ProgressBarProps` 为公共属性类型。轨道使用 `surfaceRaised`，填充使用 `primary`。确定进度按 `(value - min) / (max - min)` 计算；进度更新直接生效。不确定状态显示移动色带，减少动画时显示固定的三分之一色带，以区别于数值进度。

有 `label` 时，确定模式同步范围与当前值；不确定模式省略 `aria-valuenow`。它没有 Tab 停靠，也不使用交互控件的 `createFocusable`。

## Spinner

显示环形加载标识，默认使用当前主题的正文行高作为尺寸。

<LiveExample example="uiSpinner" title="Spinner：尺寸、暂停与减少动画" :height="330" />

`SpinnerProps`：`size?: number`（默认 `typography.lineHeight`）；`thickness?: number`（默认 `2`）；`color?: string`（默认 `colors.primary`）；`active?: boolean`（默认 `true`）；可选 `label?: string`；`style`、`ref` 对应 core `CustomView`。线宽随可用尺寸限制，避免小尺寸下负半径；`style` 可覆盖宽高。

`active: false` 或减少动画时保留静态环形标识。有 `label` 时附加无 Tab 停靠的 DOM `status` 语义；省略标签可用于已有加载文字旁边的装饰标识。

## 动画、生命周期与语义边界

Spinner 和不确定进度消费 provider 的减少动画偏好，运行中切换立即生效。动画只在对应组件需要运动时启动；隐藏、暂停或切回确定进度后停止，所属 owner 或节点销毁时移除 ticker 与监听。重新显示或切回不确定模式不会累积重复动画。

展示组件不注册键盘动作或焦点停靠。可选标签通过 core 的 `attachDOMElement` 将真实 DOM 语义附着到 Canvas 节点，位置、可见性和裁剪跟随节点；标签不意味着整个 Canvas 场景已有完整可访问性支持。DOM 属性与清理可由自动化检查，实际辅助技术的播报、浏览顺序与浏览器组合仍须在应用中单独验证。有关交互组件的语义桥接见[焦点与语义桥接](/ui/focus)。

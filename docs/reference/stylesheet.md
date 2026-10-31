# 样式 API

## StyleSheet

```ts
import { StyleSheet, type ViewStyles } from '@piant/core';

const styles = StyleSheet.create({
  base: { padding: 12 },
  active: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
});

// 显式选择样式能力，并保留精确的 sheet key 和属性类型
const viewStyles = StyleSheet.create<ViewStyles>()({
  box: { width: '50%' },
});

StyleSheet.flatten([styles.base, [false, styles.active]] as const);
StyleSheet.resolve([styles.base, styles.active]);
StyleSheet.compose(styles.base, styles.active);
```

---

## API 职责边界

| API       | 职责                                                    | 适用场景                        |
| --------- | ------------------------------------------------------- | ------------------------------- |
| `create`  | 定义样式集合，立即解析继承关系                          | 模块初始化时声明全部样式        |
| `extend`  | 声明继承关系（返回 `StyleReference`，由 `create` 解析） | 在 `create` 内部复用父样式      |
| `flatten` | 展平**数组嵌套**，不处理继承声明                        | 合并已展开的样式对象数组        |
| `resolve` | 将任意 `StyleValue` 解析为单个对象                      | 运行时统一消费来自 props 的样式 |
| `compose` | 轻量二元合并（已展开的平铺对象）                        | 性能敏感的二元覆盖场景          |

`flatten` 和 `resolve` 的区别：

- `flatten` 只做**数组展平**，不处理 `StyleReference` 继承声明。
- `resolve` 是运行时的统一入口，名称明确表达"把任意样式输入解析为最终对象"的意图，功能等价于 `flatten`（继承已在 `create` 时解析完毕）。

---

### StyleSheet.create

创建带类型检查的样式表，**保留输入的所有 key**。默认检查 View、Image、Input 和 Text 的已知样式属性及属性值，例如 `widht` 或 `width: 'banana'` 会产生编译错误。支持普通样式对象和通过 `StyleSheet.extend` 创建的继承样式引用（`StyleReference`），后者在 `create` 调用时会被立即解析为普通对象。

循环继承链会在 `create` 时被检测：循环边被跳过，并输出 `console.warn` 告警以便开发期排查。

```ts
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold' },
  // 继承 container 并覆盖部分属性
  activeContainer: StyleSheet.extend('container', {
    backgroundColor: '#e0e0ff',
  }),
});
// styles.container      — { padding: 16, backgroundColor: '#fff' }
// styles.activeContainer — { padding: 16, backgroundColor: '#e0e0ff' }
```

普通样式条目保留输入对象的精确类型，已存在的属性不会被额外变成可选属性。继承条目的结果类型包含父级属性，并按运行时相同的顺序计算覆盖结果。

自定义样式或需要限制为某一组件的样式时，使用两段调用：

```ts
type CustomStyle = { tone?: 'warm' | 'cool'; size?: number };
const create = StyleSheet.create<CustomStyle>();
const extend = StyleSheet.extend<CustomStyle>();
const custom = create({
  base: { size: 12 },
  child: extend('base', { tone: 'warm' }),
});
// custom.child.size 为 12，tone 为 'warm'；不存在的 sheet key 会报错
```

已有的 `StyleSheet.create<ViewStyles>({...})` 和 `StyleSheet.extend<TextStyles>('base', {...})` 仍可使用。由于 TypeScript 无法在显式指定部分泛型参数后继续推导剩余参数，这些旧写法保留较宽的结果类型，继承引用也沿用原有的结构类型校验；需要完整推导与严格对象校验时使用 `create<T>()(...)` / `extend<T>()(...)`。

### StyleSheet.extend

声明样式继承关系，返回一个 `StyleReference`，供 `StyleSheet.create` 在解析时使用。父级字符串字面量会在 `create` 内按当前 sheet 的 key 校验，拼写错误会报错。动态字符串和旧式显式泛型引用保留运行时解析；找不到的父级仍会被忽略。

结果类型按父级从左到右、子级最后覆盖的顺序合并。循环边在类型和运行时解析中都会跳过；类型推导最多展开 16 层继承，更深的父级保守返回所选样式能力的可选属性，运行时解析不受这个类型推导上限影响。

支持三种形式：

**单父继承（推荐写法）**

```ts
StyleSheet.extend('base', { backgroundColor: '#0055ff' });
```

**多父合并继承**

多个父样式从左到右合并，右侧覆盖左侧，最后应用子样式：

```ts
StyleSheet.extend(['rounded', 'elevated'], { backgroundColor: '#fff' });
```

**从已有样式对象继承（高级用法）**

直接传入样式对象作为父级，适合 sheet 外部的一次性样式复用：

```ts
StyleSheet.extend(baseStyle, { color: 'red' });
```

完整示例：

```ts
const styles = StyleSheet.create({
  base: { padding: 12, borderRadius: 8 },
  elevated: StyleSheet.extend('base', { opacity: 0.9 }),
  primary: StyleSheet.extend('base', { backgroundColor: '#0055ff' }),
  primaryText: StyleSheet.extend('primary', {
    color: '#fff',
    fontWeight: 'bold',
  }),
});
```

### StyleSheet.flatten

将样式数组（含嵌套数组、只读数组和 `as const` 元组）展平为单个对象，后面的属性覆盖前面的。直接传入对象时保留对象类型；数组结果的属性以可选类型表示，涵盖数组内的对象字段和值。数组字段推导最多展开 8 层；更深的输入可用 `StyleSheet.flatten<ViewStyles>(style)` 或 `resolve<ViewStyles>(style)` 选择返回的样式能力，运行时展平不受该类型推导上限影响。

**Scope**：`flatten` 仅展平**数组嵌套**，不处理 `StyleReference` 继承声明。继承已在 `create` 时解析，此处无需再处理。

```ts
StyleSheet.flatten([style1, style2, false, style3]);
// 返回合并后的样式对象；空数组或仅含假值时返回 {}（空对象）；非对象/null 输入返回 undefined
```

### StyleSheet.compose

合并两个**已展开的平铺样式对象**，`style2` 优先级更高。当两个样式都存在时，返回 `[style1, style2]` 数组供后续 `flatten` 处理；若其中一个为假值，则直接返回另一个，不分配新数组。

适合性能敏感场景（避免数组分配）。仅支持已展平的对象，不支持数组或 `StyleReference`。

```ts
StyleSheet.compose(baseStyle, overrideStyle);
```

### StyleSheet.resolve

将任意 `StyleValue`（对象、数组含嵌套、或假值）解析为单个平铺样式对象。假值被忽略。

这是运行时消费样式的推荐入口，名称明确表达"解析"意图。

```ts
const resolved = StyleSheet.resolve([
  styles.base,
  isActive && styles.active,
  props.style,
]);
```

---

## 组件 style prop 类型声明

自定义组件中推荐使用 `StyleValue<T>` 标注 `style` prop，以兼容单个对象、数组和动态条件的全部写法：

```ts
import type { StyleValue, ViewStyles } from '@piant/core';

interface MyComponentProps {
  style?: StyleValue<ViewStyles>;
}
```

对于文本组件：

```ts
import type { StyleValue, TextViewStyles } from '@piant/core';

interface TextProps {
  style?: StyleValue<TextViewStyles>;
}
```

---

## 样式类型层次

```
LayoutStyles  (= YogaStyles，Yoga flexbox 布局属性的公开名称)
VisualStyles  (视觉外观：背景色、圆角、透明度等)
ViewStyles    = LayoutStyles & Partial<VisualStyles>   ← View 组件使用
ImageStyles   = ViewStyles & { objectFit? }            ← Image 组件使用
InputStyles   = ViewStyles & 原生输入文字样式           ← Input 组件使用
TextStyles    = ViewStyles & Partial<TextLayoutStyle>  ← 完整文本样式能力集
TextViewStyles = TextStyles                            ← Text 组件对外主类型（语义别名）
```

**`LayoutStyles` vs `YogaStyles`**

- `YogaStyles` 是底层实现类型，命名绑定到 Yoga 布局引擎。
- `LayoutStyles` 是推荐的对外命名，语义更通用；两者完全等价。

**`TextStyles` vs `TextViewStyles`**

- `TextStyles` 描述完整的文本样式能力集（布局 + 视觉 + 文字属性）。
- `TextViewStyles` 是 `Text` / `TextView` 等组件的对外主类型，是 `TextStyles` 的语义别名。

### LayoutStyles / YogaStyles

Yoga flexbox 布局属性，两者等价：

| 属性                                        | 类型                                   |
| ------------------------------------------- | -------------------------------------- |
| `width` / `height`                          | `NumberValue \| 'auto'`                |
| `minWidth` / `maxWidth`                     | `NumberValue`                          |
| `minHeight` / `maxHeight`                   | `NumberValue`                          |
| `flex` / `flexGrow` / `flexShrink`          | `number`                               |
| `flexDirection`                             | `'row' \| 'column' \| ...`             |
| `flexWrap`                                  | `'nowrap' \| 'wrap' \| ...`            |
| `justifyContent`                            | `JustifyContent`                       |
| `alignItems` / `alignSelf` / `alignContent` | `AlignItems`                           |
| `gap` / `rowGap` / `columnGap`              | `number`                               |
| `padding` / `paddingTop` / ...              | `NumberValue`                          |
| `margin` / `marginTop` / ...                | `NumberValue \| 'auto'`                |
| `position`                                  | `'relative' \| 'absolute' \| 'static'` |
| `top` / `bottom` / `left` / `right`         | `NumberValue`                          |
| `overflow`                                  | `'visible' \| 'hidden' \| 'scroll'`    |
| `boxSizing`                                 | `'border-box' \| 'content-box'`        |
| `display`                                   | `'none' \| 'flex' \| 'contents'`       |

### VisualStyles

| 属性                      | 类型          | 说明            |
| ------------------------- | ------------- | --------------- |
| `backgroundColor`         | `ColorSource` | 背景颜色        |
| `borderColor`             | `ColorSource` | 边框颜色        |
| `borderRadius`            | `number`      | 四角圆角半径    |
| `borderTopLeftRadius`     | `number`      | 左上圆角        |
| `borderTopRightRadius`    | `number`      | 右上圆角        |
| `borderBottomRightRadius` | `number`      | 右下圆角        |
| `borderBottomLeftRadius`  | `number`      | 左下圆角        |
| `opacity`                 | `number`      | 不透明度（0-1） |
| `zIndex`                  | `number`      | 层叠顺序        |

### ImageStyles

继承 `ViewStyles`，额外支持：

```ts
interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

### InputStyles

`Input` 使用 `StyleValue<InputStyles>`，在 View/Yoga 能力之上把支持的文字属性同步为原生 HTML input 的 CSS：

```ts
interface InputStyles extends ViewStyles {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  lineHeight?: number | `${number}x` | 'normal';
  letterSpacing?: number;
  color?: string;
  caretColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'start' | 'end';
}
```

字号、数字行高和字间距使用逻辑像素；如 `'1.5x'` 的行高转为 CSS 倍数。移除属性时恢复默认或继承值。Yoga 计算后的 padding 和 border 成为原生文字内边距，背景及边框仍由 Canvas 绘制。它不是任意 CSS 属性透传，也不将 Text 的换行、富文本或排版能力应用到原生输入框。

### TextStyles / TextViewStyles

继承 `ViewStyles`，额外支持文本布局属性：

```ts
type TextStyles = ViewStyles & Partial<TextLayoutStyle>;
type TextViewStyles = TextStyles; // Text 组件对外主类型（语义别名）

interface TextLayoutStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic' | 'oblique' | string;
  color: string;
  lineHeight: number | `${number}x` | 'normal';
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  textDecoration:
    | 'none'
    | 'underline'
    | 'line-through'
    | 'underline line-through'
    | 'line-through underline';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace: 'normal' | 'pre-wrap' | string;
  wordBreak: 'break-word' | 'normal' | 'keep-all' | string;
  textOverflow?: 'clip' | 'ellipsis' | string;
  lineClamp?: number;
  verticalAlign: 'baseline' | 'middle' | 'top' | 'bottom';
}
```

---

`textDecoration` 默认为 `'none'`，由 Text / Span 向子级继承；显式设置（包括 `'none'`）替换继承值。两种组合顺序等效。装饰跟随文字颜色与最终可见片段，不参与测量；不覆盖行内图片或制表符，省略号使用来源片段样式。不提供独立装饰颜色、粗细或线型。参见 [Text 指南](/guide/components/text#下划线与删除线)。

## StyleValue 类型

```ts
type StyleValue<T extends object = object> =
  | Partial<T>
  | StyleValue<T>[]
  // 区分只读输入，保留可变初始化数组的 push 等操作
  | (readonly StyleValue<T>[] & { readonly push?: never })
  | false
  | null
  | undefined;
```

组件的 `style` prop 均接受此类型，支持：

- 单个样式对象
- 可变或只读样式数组（包含嵌套）
- `false` / `null` / `undefined`（忽略）

---

## 辅助类型

```ts
// 语义化的 Partial<T> 别名，用于标注纯样式对象
type StyleObject<T extends object> = Partial<T>;

// StyleSheet.create 定义的类型
type StyleSheetDefinition<T extends object> = Record<string, StyleEntry<T>>;

// StyleSheet.create 返回类型的推导辅助：普通条目保留类型，继承条目合并父级
const definition = {
  base: { padding: 12 },
  child: StyleSheet.extend('base', { color: 'red' }),
};
type Resolved = ResolvedStyleSheet<typeof definition>;
// Resolved['child'] 包含 padding: number 和 color: 'red'
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

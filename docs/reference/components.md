# 组件 API

## View

```ts
type ViewProps = {
  style?: ViewStyles | ViewStyles[];
  children?: any;
  ref?: (el: PView) => void;
} & PixiEventProps<PView>;
```

详见：[View 组件文档](/guide/components/view)

---

## Image

```ts
type ImageProps = {
  src: Sprite | Graphics;
  style?: StyleValue<ImageStyles>;
  ref?: (el: PImage) => void;
} & PixiEventProps<PImage>;

interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

`objectFit` 默认为 `contain`；`cover` 居中并沿容器圆角裁剪图像层，子节点仍由 `overflow` 控制。`none` 恢复每次布局读取的未缩放尺寸（Sprite 的纹理 `orig` / Graphics 绘图 bounds），左上对齐。源对象和纹理由调用者管理。

详见：[Image 组件文档](/guide/components/image)

---

## Text

```ts
interface TextProps {
  style?: TextStyles | TextStyles[];
  children?: JSX.Element;
  ref?: (el: PText) => void;
}
```

常用文本截断样式（通过 `style` 传入）：

- `textOverflow: 'clip' | 'ellipsis'`
- `lineClamp: number`

详见：[Text 组件文档](/guide/components/text)

---

## Input

```ts
import type { InputProps } from '@piant/core';

function Input(props: InputProps): JSX.Element;
```

`InputProps` 的属性均可选：

| 属性 | 类型 | 说明 |
|------|------|------|
| `style` | `StyleValue<ViewStyles>` | 节点布局与视觉样式 |
| `value` | `string` | 响应式同步的值 |
| `defaultValue` | `string` | 仅用于初始化；同时传 `value` 时被其覆盖 |
| `placeholder` | `string` | 默认 `''` |
| `type` | `string` | 默认 `'text'` |
| `disabled` | `boolean` | 默认 `false` |
| `onInput` / `onChange` | `(value: string, event: Event) => void` | 当前字符串值与原生 DOM 事件 |
| `onFocus` / `onBlur` | `(event: FocusEvent) => void` | 原生焦点事件 |
| `ref` | `InputProps['ref']` | 接收 `PInput` 节点，参数类型可自动推导 |

`Input` 基于原生 HTML input，需要 DOM 环境；受控用法应在 `onInput` 中写回状态。`ref` 的 `node._inputElement` 是原生 `HTMLInputElement`；`PInput` 没有从包入口直接导出。Props 不包含 `children`、`PixiEventProps` 或任意 HTML 属性透传，`style` 不会将文本样式转换成原生 input 的 CSS。

详见：[Input 指南与在线示例](/guide/components/input)

---

## Span

```ts
// Span 内联文本样式包裹器，仅用于 Text 内部
function Span(props: {
  style?: TextStyles;
  bold?: boolean;
  italic?: boolean;
  children?: any;
}): JSX.Element;
```

---

## Img

```ts
// Img 行内图片，仅用于 Text 内部
function Img(props: {
  src?: Sprite | Texture | null;
  style?: StyleValue<TextStyles>;
}): JSX.Element;
```

`Img` 借用输入纹理；传入 `Sprite` 时仅使用其纹理，不复制变换或滤镜。行内尺寸优先使用有效的样式宽高（包括从父级 Text/Span 继承的值），没有有效样式值时使用纹理尺寸。`Graphics` 需由调用方先转换为纹理，纹理的创建、更新和释放由调用方管理。

详见：[图文混排示例](/guide/components/text#图文混排)

---

## ScrollView

```ts
type ScrollViewProps = {
  style?: ViewStyles | ViewStyles[];
  children?: any;
  ref?: (el: PScrollView) => void;
  horizontal?: boolean;
} & PixiEventProps<PScrollView>;
```

详见：[ScrollView 组件文档](/guide/components/scrollview)

---

## CustomView

```ts
type CustomViewProps = {
  style?: ViewStyles | ViewStyles[];
  onDraw?: (graphics: Graphics, width: number, height: number) => void;
  ref?: (el: PCustomView) => void;
} & PixiEventProps<PCustomView>;
```

详见：[CustomView 组件文档](/guide/components/customview)

---

## Show

```ts
type ShowProps<T> = {
  when: T;
  children?: JSX.Element | ((item: () => NonNullable<T>) => JSX.Element);
  fallback?: JSX.Element;
};

function Show<T>(props: ShowProps<T>): JSX.Element;
```

详见：[Show 控制流文档](/guide/control-flow/show)

---

## For

```ts
function For<T>(props: {
  each: T[];
  fallback?: JSX.Element;
  children: (item: T, index: Getter<number>) => JSX.Element;
}): JSX.Element;
```

详见：[For 控制流文档](/guide/control-flow/for)

---

## Index

```ts
function Index<T>(props: {
  each: T[];
  fallback?: JSX.Element;
  children: (item: Getter<T>, index: number) => JSX.Element;
}): JSX.Element;
```

详见：[For 与 Index 文档](/guide/control-flow/for)

---

## Switch

```ts
type SwitchProps = {
  fallback?: JSX.Element;
  children?: JSX.Element;
};

function Switch(props: SwitchProps): JSX.Element;
```

---

## Match

```ts
type MatchProps<T> = {
  when?: T | false | null;
  keyed?: boolean;
  children?: JSX.Element | ((value: T | (() => T)) => JSX.Element);
};

function Match<T>(props: MatchProps<T>): JSX.Element;
```

详见：[Switch 与 Match 文档](/guide/control-flow/switch)

---

## Dynamic

```ts
interface DynamicProps {
  component: JSX.Element;
  props: any;
}

function Dynamic(props: DynamicProps): JSX.Element;
```

详见：[Dynamic 控制流文档](/guide/control-flow/dynamic)

---

## ErrorBoundary

```ts
function ErrorBoundary(props: {
  fallback: JSX.Element | ((err: Error, reset: () => void) => JSX.Element);
  children: JSX.Element;
}): JSX.Element;
```

详见：[ErrorBoundary 文档](/guide/control-flow/error-boundary)

---

## Transition 与 TransitionGroup

```ts
import type { TransitionGroupProps, TransitionProps } from '@piant/core';

function Transition(props: TransitionProps): JSX.Element;
function TransitionGroup(props: TransitionGroupProps): JSX.Element;
```

两者均接受 `children`、`appear`（默认 `false`）和 `TransitionEvents` 中的六个进入/离开钩子。`Transition` 另接受 `mode: 'parallel' | 'out-in' | 'in-out'`（默认 `'parallel'`），通常配合 `Show` 使用；`TransitionGroup` 配合 `For` / `Index` 管理列表增删。

`onEnter` / `onExit` 接收元素与 `done` 回调，调用 `done()` 表示该阶段完成。`TransitionProps`、`TransitionGroupProps` 和 `TransitionEvents` 均从包入口导出。

详见：[完整 Props、生命周期与用法](/guide/control-flow/transition)

---

## 事件 Props（PixiEventProps）

View、Image、ScrollView、CustomView 接受以下 Pixi 事件 props；Input 使用上文列出的原生 DOM 事件回调：

```ts
type PixiEventProps<TNode extends PNode = PNode> = {
  onClick?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerDown?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerUp?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerMove?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerEnter?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerLeave?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerOver?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerOut?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerCancel?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerUpOutside?: (event: FederatedPointerEvent, node: TNode) => void;
  onPointerTap?: (event: FederatedPointerEvent, node: TNode) => void;
  onRightClick?: (event: FederatedPointerEvent, node: TNode) => void;
  onRightDown?: (event: FederatedPointerEvent, node: TNode) => void;
  onRightUp?: (event: FederatedPointerEvent, node: TNode) => void;
  onRightUpOutside?: (event: FederatedPointerEvent, node: TNode) => void;
  onWheel?: (event: FederatedWheelEvent, node: TNode) => void;
  onGlobalMouseMove?: (event: FederatedPointerEvent, node: TNode) => void;
  onGlobalTouchMove?: (event: FederatedPointerEvent, node: TNode) => void;
  onGlobalPointerMove?: (event: FederatedPointerEvent, node: TNode) => void;
};
```

回调的 `node` 根据组件推导为 `PView`、`PImage`、`PScrollView` 或 `PCustomView`。只接收一个参数或不接收参数的回调仍然兼容。`event.target` / `event.currentTarget` 保持 PixiJS 原生语义，操作 Piant 节点请使用 `node`。

`onClick` 对应 PixiJS 的 `pointertap` 事件，可与 `onPointerTap` 独立使用。

详见：[事件处理文档](/guide/events)

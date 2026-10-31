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

常用文本样式（通过 `style` 传入）：

- `textOverflow: 'clip' | 'ellipsis'`
- `lineClamp: number`
- `textDecoration: 'none' | 'underline' | 'line-through' | 'underline line-through' | 'line-through underline'`（默认 `'none'`）

`textDecoration` 从 Text 继承到嵌套 Span；子级显式值替换父级值，`none` 取消装饰。线色跟随文字颜色，不改变排版；行内图片和制表符不画线，省略号沿用来源片段样式。支持响应式切换，详细绘制边界见 [文本装饰](/guide/components/text#下划线与删除线)。

详见：[Text 组件文档](/guide/components/text)

---

## Input

```ts
import type { InputProps } from '@piant/core';

function Input(props: InputProps): JSX.Element;
```

`InputProps` 的属性均可选，`style` 使用 `StyleValue<InputStyles>`。`InputStyles` 包含 View/Yoga 布局、视觉样式以及原生文字 CSS：`fontFamily`、`fontSize`、`fontWeight`、`fontStyle`、`lineHeight`、`letterSpacing`、`color`、`caretColor` 和 `textAlign`。Yoga padding 与 border 宽度同步为原生文字内边距。

| 属性                                                                                                                 | 类型 / 行为                                     |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `value` / `defaultValue`                                                                                             | `string`；受控同步 / 仅用于初始化               |
| `placeholder` / `type`                                                                                               | `string`；默认 `''` / `'text'`                  |
| `disabled` / `readOnly` / `required`                                                                                 | 原生布尔属性                                    |
| `id` / `name` / `autoComplete` / `inputMode` / `enterKeyHint`                                                        | 原生标识及输入提示                              |
| `minLength` / `maxLength` / `min` / `max` / `step` / `pattern`                                                       | 原生输入限制                                    |
| `tabIndex`                                                                                                           | 原生焦点导航索引                                |
| `role` / `aria-label` / `aria-labelledby` / `aria-describedby` / `aria-errormessage`                                 | 角色、名称与描述关联                            |
| `aria-invalid` / `aria-required` / `aria-expanded` / `aria-controls` / `aria-activedescendant` / `aria-autocomplete` | 语义状态和组合控件关联                          |
| `onInput` / `onChange`                                                                                               | `(value: string, event: Event) => void`         |
| `onBeforeInput`                                                                                                      | `(event: InputEvent) => void`                   |
| `onFocus` / `onBlur`                                                                                                 | `(event: FocusEvent) => void`                   |
| `onKeyDown` / `onKeyUp`                                                                                              | `(event: KeyboardEvent) => void`                |
| `onCompositionStart` / `onCompositionUpdate` / `onCompositionEnd`                                                    | `(event: CompositionEvent) => void`             |
| `onCopy` / `onCut` / `onPaste`                                                                                       | `(event: ClipboardEvent) => void`               |
| `onSelect`                                                                                                           | `(event: Event) => void`                        |
| `ref`                                                                                                                | `(node: PInput) => void`；`PInput` 从主入口导出 |

`node.element` 是稳定的原生 `HTMLInputElement`，`node.domElement` 为对应 `DOMElementBinding<HTMLInputElement>`；`node.focus(options?)`、`node.blur()` 转发焦点操作，`node.isComposing` 暴露组合状态。无需访问内部字段。

组合期间延迟外部 value 写入，compositionend 后在当前事件轮次收尾时同步最新受控值；相同值不重写，实际替换保留并按新长度截断支持类型的选区数字位置。`onInput` 不因 compositionend 额外伪造触发。IME Enter/Escape 不调用业务键盘回调，停止冒泡但不阻止原生候选确认/取消；祖先 capture 快捷键必须在消费前调用 `isComposingInput(event)` 检查，目标监听无法撤销此前的 capture 行为。

Input 保留浏览器编辑、选区、剪贴板、readOnly 和 disabled 行为。Props 不包含 `children`、`PixiEventProps` 或任意 HTML 属性透传。组件副作用及监听具有 owner/节点清理；调用方自行添加的监听由调用方清理。

详见：[Input 指南与在线示例](/guide/components/input)、[InputStyles](/reference/stylesheet#inputstyles)、[DOM 绑定](/reference/renderer#attachdomelement)。

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

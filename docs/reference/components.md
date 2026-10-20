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
  style?: ImageStyles | ImageStyles[];
  ref?: (el: PImage) => void;
} & PixiEventProps<PImage>;

interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

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
  src: Sprite | Graphics;
  style?: TextStyles;
}): JSX.Element;
```

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

## 事件 Props（PixiEventProps）

所有支持交互的组件（View、Image、ScrollView、CustomView）均接受以下事件 props：

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

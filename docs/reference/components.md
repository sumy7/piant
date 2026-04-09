# 组件 API

## View

```ts
type ViewProps = {
  style?: ViewStyles | ViewStyles[];
  children?: any;
  ref?: (el: PView) => void;
} & EventProps;
```

详见：[View 组件文档](/guide/components/view)

---

## Image

```ts
type ImageProps = {
  src: Sprite | Graphics;
  style?: ImageStyles | ImageStyles[];
  ref?: (el: PImage) => void;
} & EventProps;

interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
```

详见：[Image 组件文档](/guide/components/image)

---

## TextView

```ts
interface TextViewProps {
  style?: TextStyles | TextStyles[];
  children?: JSX.Element;
  ref?: (el: PText) => void;
}
```

详见：[TextView 组件文档](/guide/components/textview)

---

## Span

```ts
// Span 内联文本样式包裹器，仅用于 TextView 内部
function Span(props: {
  style?: TextStyles;
  bold?: boolean;
  italic?: boolean;
  children?: any;
}): JSX.Element;
```

---

## ImageSpan

```ts
// ImageSpan 行内图片，仅用于 TextView 内部
function ImageSpan(props: {
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
} & EventProps;
```

详见：[ScrollView 组件文档](/guide/components/scrollview)

---

## CustomView

```ts
type CustomViewProps = {
  style?: ViewStyles | ViewStyles[];
  onDraw?: (graphics: Graphics, width: number, height: number) => void;
  ref?: (el: PCustomView) => void;
} & EventProps;
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
  props?: any;
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

## 事件 Props（EventProps）

所有支持交互的组件（View、Image、ScrollView、CustomView）均接受以下事件 props：

```ts
type EventProps = {
  onClick?: (event: FederatedPointerEvent) => void;
  onMouseDown?: (event: FederatedPointerEvent) => void;
  onMouseUp?: (event: FederatedPointerEvent) => void;
  onMouseMove?: (event: FederatedPointerEvent) => void;
  onMouseEnter?: (event: FederatedPointerEvent) => void;
  onMouseLeave?: (event: FederatedPointerEvent) => void;
  onPointerDown?: (event: FederatedPointerEvent) => void;
  onPointerUp?: (event: FederatedPointerEvent) => void;
  onPointerMove?: (event: FederatedPointerEvent) => void;
  onPointerEnter?: (event: FederatedPointerEvent) => void;
  onPointerLeave?: (event: FederatedPointerEvent) => void;
  onTouchStart?: (event: FederatedPointerEvent) => void;
  onTouchEnd?: (event: FederatedPointerEvent) => void;
  onTouchMove?: (event: FederatedPointerEvent) => void;
  // ... 完整列表详见事件处理文档
};
```

详见：[事件处理文档](/guide/events)

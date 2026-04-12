import type { CustomViewProps } from './components/CustomView';
import type { DynamicProps } from './components/Dynamic';
import type { ErrorBoundaryProps } from './components/ErrorBoundary';
import type { ForProps, IndexProps } from './components/For';
import type { ImageProps } from './components/Image';
import type { ScrollViewProps } from './components/ScrollView';
import type { ShowProps } from './components/Show';
import type { MatchProps, SwitchProps } from './components/Switch';
import type { ImgProps, SpanProps, TextProps } from './components/Text';
import type { ComponentChild, ComponentValue } from './components/types';
import type { ViewProps } from './components/View';
import type { PixiEventProps } from './events';

type Eventful<T> = T & PixiEventProps;

interface PiantIntrinsicElements {
  view: Eventful<ViewProps>;
  text: Eventful<TextProps>;
  image: Eventful<ImageProps>;
  customview: Eventful<CustomViewProps>;
  scrollview: Eventful<ScrollViewProps>;
  show: ShowProps<ComponentValue>;
  for: ForProps<ComponentValue>;
  index: IndexProps<ComponentValue>;
  switch: SwitchProps;
  match: MatchProps<ComponentValue>;
  dynamic: DynamicProps<Record<string, ComponentValue>>;
  errorboundary: ErrorBoundaryProps;
  span: SpanProps;
  img: ImgProps;
}

interface PiantIntrinsicAttributes {
  key?: string | number;
}

export namespace JSX {
  type Element = ComponentChild;

  interface ElementClass {}

  interface ElementAttributesProperty {}

  interface ElementChildrenAttribute {
    children: ComponentChild;
  }

  interface IntrinsicAttributes extends PiantIntrinsicAttributes {}

  interface IntrinsicElements extends PiantIntrinsicElements {}
}

declare global {
  namespace JSX {
    type Element = ComponentChild;

    interface ElementClass {}

    interface ElementAttributesProperty {}

    interface ElementChildrenAttribute {
      children: ComponentChild;
    }

    interface IntrinsicAttributes extends PiantIntrinsicAttributes {}

    interface IntrinsicElements extends PiantIntrinsicElements {}
  }
}

export {};

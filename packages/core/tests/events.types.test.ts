import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import { describe, expectTypeOf, it } from 'vitest';
import type { CustomViewProps } from '../src/components/CustomView';
import type { ImageProps } from '../src/components/Image';
import type { ScrollViewProps } from '../src/components/ScrollView';
import type { ViewProps } from '../src/components/View';
import type { PCustomView } from '../src/elements/PCustomView';
import type { PImage } from '../src/elements/PImage';
import type { PScrollView } from '../src/elements/PScrollView';
import type { PView } from '../src/elements/PView';

describe('event types', () => {
  it('infers the native pointer, wheel and global payloads', () => {
    const props: ViewProps = {
      onClick(event, node) {
        expectTypeOf(event).toEqualTypeOf<FederatedPointerEvent>();
        expectTypeOf(node).toEqualTypeOf<PView>();
        // @ts-expect-error pointer events do not have wheel deltas
        event.deltaY;
        // @ts-expect-error a native Pixi target is not a Piant node
        event.target.setStyle({ width: 10 });
      },
      onWheel(event, node) {
        expectTypeOf(event).toEqualTypeOf<FederatedWheelEvent>();
        expectTypeOf(event.deltaY).toEqualTypeOf<number>();
        expectTypeOf(node).toEqualTypeOf<PView>();
      },
      onGlobalMouseMove(event) {
        expectTypeOf(event).toEqualTypeOf<FederatedPointerEvent>();
      },
      onGlobalTouchMove(event) {
        expectTypeOf(event).toEqualTypeOf<FederatedPointerEvent>();
      },
      onGlobalPointerMove(event) {
        expectTypeOf(event).toEqualTypeOf<FederatedPointerEvent>();
      },
    };
    expectTypeOf(props.onClick).toBeNullable();
  });

  it('infers component-specific nodes for component and intrinsic props', () => {
    const image: Pick<ImageProps, 'onClick'> = {
      onClick(_event, node) {
        expectTypeOf(node).toEqualTypeOf<PImage>();
      },
    };
    const scroll: ScrollViewProps = {
      onWheel(_event, node) {
        expectTypeOf(node).toEqualTypeOf<PScrollView>();
      },
    };
    const custom: CustomViewProps = {
      onPointerDown(_event, node) {
        expectTypeOf(node).toEqualTypeOf<PCustomView>();
      },
    };
    const view: JSX.IntrinsicElements['view'] = {
      onClick(event, node) {
        expectTypeOf(event).toEqualTypeOf<FederatedPointerEvent>();
        expectTypeOf(node).toEqualTypeOf<PView>();
      },
    };
    const intrinsicScroll: JSX.IntrinsicElements['scrollview'] = {
      onWheel(_event, node) {
        expectTypeOf(node).toEqualTypeOf<PScrollView>();
      },
    };
    expectTypeOf(image.onClick).toBeNullable();
    expectTypeOf(scroll.onWheel).toBeNullable();
    expectTypeOf(custom.onPointerDown).toBeNullable();
    expectTypeOf(view.onClick).toBeNullable();
    expectTypeOf(intrinsicScroll.onWheel).toBeNullable();
  });

  it('continues accepting single-argument and argument-free handlers', () => {
    const props: ViewProps = {
      onClick: (event: FederatedPointerEvent) => {
        event.stopPropagation();
      },
      onWheel: () => undefined,
    };
    expectTypeOf(props).toEqualTypeOf<ViewProps>();
  });
});

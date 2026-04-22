import type { Graphics } from 'pixi.js';
import type { ViewStyles } from '../elements/layout/viewStyles';
import { PCustomView } from '../elements/PCustomView';
import type { PixiEventProps } from '../events';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { createState } from '../reactivity';
import { cleanup, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { StyleSheet } from '../styleSheet';
import type { StyleValue } from '../styleSheet';
import type { RefCallback } from './types';

export type CustomViewProps = {
  style?: StyleValue<ViewStyles>;
  onDraw?: (graphics: Graphics, width: number, height: number) => void;
  ref?: RefCallback<PCustomView>;
} & PixiEventProps;

export function CustomView(props: CustomViewProps) {
  const [styleProps, onDrawProps, eventProps] = splitProps(
    props,
    ['style'],
    ['onDraw'],
    EVENT_PROPS,
  );
  const [size, setSize] = createState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const element = new PCustomView();
  props.ref?.(element);

  const onSizeChange = (event: { width: number; height: number }) => {
    setSize({
      width: event.width,
      height: event.height,
    });
  };
  element._view.on('sizeChange', onSizeChange);
  cleanup(() => {
    element._view.off('sizeChange', onSizeChange);
  });

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });
  effect(() => {
    const { width, height } = size();
    onDrawProps.onDraw?.(element._graphic, width, height);
  });
  bindEventEffects(element._view, eventProps);

  return element;
}

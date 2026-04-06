import type { Graphics } from 'pixi.js';
import type { ViewStyles } from '../elements/layout/viewStyles';
import { PCustomView } from '../elements/PCustomView';
import { bindEventEffects } from '../events';
import { createState } from '../reactivity';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { StyleSheet } from '../styleSheet';

export type CustomViewProps = {
  style?: ViewStyles | ViewStyles[];
  onDraw?: (graphics: Graphics, width: number, height: number) => void;
  ref?: any;
};

export function CustomView(props: CustomViewProps) {
  const [styleProps, onDrawProps, otherProps] = splitProps(
    props,
    ['style'],
    ['onDraw'],
  );
  const [size, setSize] = createState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const element = new PCustomView();
  props.ref && (props as any).ref(element);

  element._view.on('sizeChange', (event) => {
    setSize({
      width: event.width,
      height: event.height,
    });
  });

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });
  effect(() => {
    const { width, height } = size();
    onDrawProps.onDraw?.(element._graphic, width, height);
  });
  bindEventEffects(element._view, otherProps);

  return element;
}

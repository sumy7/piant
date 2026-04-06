import type { Graphics, Sprite } from 'pixi.js';
import type { ImageStyles } from '../elements/layout/viewStyles';
import { PImage } from '../elements/PImage';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { StyleSheet } from '../styleSheet';

export type ImageProps = {
  src: Sprite | Graphics;
  style?: ImageStyles | ImageStyles[];
  ref?: any;
};

export function Image(props: ImageProps) {
  const [srcProps, styleProps, otherProps] = splitProps(
    props,
    ['src'],
    ['style'],
  );

  const element = new PImage();
  props.ref && (props as any).ref(element);

  effect(() => {
    element.setImage(srcProps.src);
  });
  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });
  bindEventEffects(element._view, otherProps);

  return element;
}

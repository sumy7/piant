import type { Graphics, Sprite } from 'pixi.js';
import type { ImageStyles } from '../elements/layout/viewStyles';
import { PImage } from '../elements/PImage';
import type { PixiEventProps } from '../events';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { StyleSheet } from '../styleSheet';
import type { StyleValue } from '../styleSheet';
import type { RefCallback } from './types';

export type ImageProps = {
  src: Sprite | Graphics;
  style?: StyleValue<ImageStyles>;
  ref?: RefCallback<PImage>;
} & PixiEventProps;

export function Image(props: ImageProps) {
  const [srcProps, styleProps, eventProps] = splitProps(
    props,
    ['src'],
    ['style'],
    EVENT_PROPS,
  );

  const element = new PImage();
  props.ref?.(element);

  effect(() => {
    element.setImage(srcProps.src);
  });
  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });
  bindEventEffects(element._view, eventProps);

  return element;
}

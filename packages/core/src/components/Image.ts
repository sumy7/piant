import type { Graphics, Sprite } from 'pixi.js';
import type { ImageStyles } from '../elements/layout/viewStyles';
import { PImage } from '../elements/PImage';
import type { PixiEventProps } from '../events';
import { bindEventEffects } from '../events';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import { bindStyle } from './bindStyle';
import type { RefCallback } from './types';

export type ImageProps = {
  src: Sprite | Graphics;
  style?: StyleValue<ImageStyles>;
  ref?: RefCallback<PImage>;
} & PixiEventProps<PImage>;

export function Image(props: ImageProps) {
  const [srcProps, styleProps] = splitProps(props, ['src'], ['style']);

  const element = new PImage();
  props.ref?.(element);

  effect(() => {
    element.setImage(srcProps.src);
  });
  bindStyle<ImageStyles>(element, () => StyleSheet.flatten(styleProps.style));
  bindEventEffects(element, props);

  return element;
}

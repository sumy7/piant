import type { ViewStyles } from '../elements/layout/viewStyles';
import { PScrollView } from '../elements/PScrollView';
import type { PixiEventProps } from '../events';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { onTick } from '../hooks';
import { children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import { StyleSheet } from '../styleSheet';
import type { StyleValue } from '../styleSheet';
import type { ComponentChild, RefCallback } from './types';

export type ScrollViewProps = {
  style?: StyleValue<ViewStyles>;
  children?: ComponentChild;
  ref?: RefCallback<PScrollView>;
} & PixiEventProps;

export function ScrollView(props: ScrollViewProps) {
  const [eventProps, styleProps, childrenProps] = splitProps(
    props,
    EVENT_PROPS,
    ['style'],
    ['children'],
  );
  const element = new PScrollView();

  props.ref?.(element);

  onTick(element.update.bind(element));

  bindEventEffects(element._view, eventProps);

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });

  insert(
    element.scrollContent,
    children(() => childrenProps.children),
  );

  return element;
}

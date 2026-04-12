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
  horizontal?: boolean;
} & PixiEventProps;

export function ScrollView(props: ScrollViewProps) {
  const [eventProps, styleProps, childrenProps, behaviorProps] = splitProps(
    props,
    EVENT_PROPS,
    ['style'],
    ['children'],
    ['horizontal'],
  );
  const element = new PScrollView(behaviorProps.horizontal ?? false);

  props.ref?.(element);

  onTick(element.update.bind(element));

  bindEventEffects(element._view, eventProps);

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });

  effect(() => {
    element.setHorizontal(behaviorProps.horizontal ?? false);
  });

  insert(
    element.scrollContent,
    children(() => childrenProps.children),
  );

  return element;
}

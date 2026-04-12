import { ViewStyles } from '../elements/layout/viewStyles';
import { PView } from '../elements/PView';
import type { PixiEventProps } from '../events';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import { StyleSheet } from '../styleSheet';
import type { StyleValue } from '../styleSheet';
import type { ComponentChild, RefCallback } from './types';

export type ViewProps = {
  style?: StyleValue<ViewStyles>;
  children?: ComponentChild;
  ref?: RefCallback<PView>;
} & PixiEventProps;

export function View(props: ViewProps): JSX.Element {
  const [eventProps, styleProps, childrenProps] = splitProps(
    props,
    EVENT_PROPS,
    ['style'],
    ['children'],
  );
  const element = new PView();

  props.ref?.(element);

  bindEventEffects(element._view, eventProps);

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });

  insert(
    element,
    children(() => childrenProps.children),
  );

  return element as JSX.Element;
}

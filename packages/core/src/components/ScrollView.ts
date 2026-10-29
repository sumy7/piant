import type { ViewStyles } from '../elements/layout/viewStyles';
import { PScrollView } from '../elements/PScrollView';
import type { PixiEventProps } from '../events';
import { bindEventEffects } from '../events';
import { onTick } from '../hooks';
import { children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import { bindStyle } from './bindStyle';
import type { ComponentChild, RefCallback } from './types';

export type ScrollViewProps = {
  style?: StyleValue<ViewStyles>;
  children?: ComponentChild;
  ref?: RefCallback<PScrollView>;
  horizontal?: boolean;
} & PixiEventProps<PScrollView>;

export function ScrollView(props: ScrollViewProps) {
  const [styleProps, childrenProps, behaviorProps] = splitProps(
    props,
    ['style'],
    ['children'],
    ['horizontal'],
  );
  const element = new PScrollView(behaviorProps.horizontal ?? false);

  props.ref?.(element);

  element.onDestroy(onTick(element.update.bind(element)));

  bindEventEffects(element, props);

  bindStyle<ViewStyles>(element, () => StyleSheet.flatten(styleProps.style));

  effect(() => {
    element.setHorizontal(behaviorProps.horizontal ?? false);
  });

  insert(
    element.scrollContent,
    children(() => childrenProps.children),
  );

  return element;
}

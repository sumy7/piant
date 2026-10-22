import type { ViewStyles } from '../elements/layout/viewStyles';
import { PView } from '../elements/PView';
import type { PixiEventProps } from '../events';
import { bindEventEffects } from '../events';
import { children } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import { bindStyle } from './bindStyle';
import type { ComponentChild, RefCallback } from './types';

export type ViewProps = {
  style?: StyleValue<ViewStyles>;
  children?: ComponentChild;
  ref?: RefCallback<PView>;
} & PixiEventProps<PView>;

export function View(props: ViewProps): JSX.Element {
  const [styleProps, childrenProps] = splitProps(
    props,
    ['style'],
    ['children'],
  );
  const element = new PView();

  props.ref?.(element);

  bindEventEffects(element, props);

  bindStyle<ViewStyles>(element, () => StyleSheet.flatten(styleProps.style));

  insert(
    element,
    children(() => childrenProps.children),
  );

  return element as JSX.Element;
}

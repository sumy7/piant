import { ViewStyles } from '../elements/layout/viewStyles';
import { PView } from '../elements/PView';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import { StyleSheet } from '../styleSheet';

export type ViewProps = {
  style?: ViewStyles | ViewStyles[];
  children?: any;
  ref?: any;
} & Record<string, any>;

export function View(props: ViewProps): JSX.Element {
  const [eventProps, otherProps] = splitProps(props, EVENT_PROPS) as any;
  const element = new PView();

  props.ref && (props as any).ref(element);

  bindEventEffects(element._view, eventProps);

  effect(() => {
    element.setStyle(StyleSheet.flatten(otherProps.style) || {});
  });

  insert(
    element,
    children(() => otherProps.children),
  );

  return element as any;
}

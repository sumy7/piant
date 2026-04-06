import type { ImageStyles, ViewStyles } from '../elements/layout/viewStyles';
import { PScrollView } from '../elements/PScrollView';
import { bindEventEffects, EVENT_PROPS } from '../events';
import { onTick } from '../hooks';
import { children, effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import { insert } from '../renderer/runtime';
import { StyleSheet } from '../styleSheet';

export type ScrollViewProps = {
  style?: ViewStyles | ViewStyles[];
  children?: any;
  ref?: any;
};

export function ScrollView(props: ScrollViewProps) {
  const element = new PScrollView();

  props.ref && (props as any).ref(element);

  onTick(element.update.bind(element));

  bindEventEffects(element._view, props);

  effect(() => {
    element.setStyle(StyleSheet.flatten(props.style) || {});
  });

  insert(
    element.scrollContent,
    children(() => props.children),
  );

  return element;
}

import { untracked } from 'mobx';
import { memo } from '../reactivity';
import { splitProps } from '../reactivity/props';
import type { ComponentValue } from './types';

type DynamicComponent<TProps extends Record<string, ComponentValue>> =
  | ((props: TProps) => JSX.Element)
  | JSX.Element;

export interface DynamicProps<
  TProps extends Record<string, ComponentValue> = Record<
    string,
    ComponentValue
  >,
> {
  component: DynamicComponent<TProps>;
  props?: TProps;
}

export function Dynamic(props: DynamicProps) {
  const [p, others] = splitProps(props, ['component']);

  const cached = memo(() => p.component);
  return memo(() => {
    const component = cached();
    switch (typeof component) {
      case 'function':
        return untracked(() =>
          (component as (props: typeof others.props) => JSX.Element)(
            others.props,
          ),
        );
      default:
        break;
    }

    return component;
  });
}

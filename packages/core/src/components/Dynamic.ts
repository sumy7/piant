import { untracked } from 'mobx';
import { memo } from '../reactivity';
import { splitProps } from '../reactivity/props';

interface DynamicProps {
  component: JSX.Element;
  props: any;
}

export function Dynamic(props: DynamicProps) {
  const [p, others] = splitProps(props, ['component']);

  const cached = memo(() => p.component);
  return memo(() => {
    const component = cached() as unknown as JSX.Element;
    switch (typeof component) {
      case 'function':
        return untracked(() => component(others.props));
      default:
        break;
    }

    return component;
  });
}

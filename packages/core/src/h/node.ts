import { untracked } from 'mobx';
import { memo } from '../reactivity/effects';

function stabilizeProps(props: Record<string, any>) {
  const descriptors = Object.getOwnPropertyDescriptors(props);
  let hasGetter = false;

  for (const key of Object.keys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof descriptor.get === 'function') {
      hasGetter = true;
      break;
    }
  }

  if (!hasGetter) return props;

  const stabilized: Record<string, any> = {};

  for (const key of Object.keys(descriptors)) {
    const descriptor = descriptors[key];
    if (typeof descriptor.get === 'function') {
      const getter = descriptor.get.bind(props);
      const accessor = memo(() => getter());
      Object.defineProperty(stabilized, key, {
        enumerable: descriptor.enumerable ?? true,
        configurable: true,
        get: accessor,
        set: descriptor.set ? descriptor.set.bind(props) : undefined,
      });
      continue;
    }

    Object.defineProperty(stabilized, key, descriptor);
  }

  return stabilized;
}

export function createComponent(type: any, props: Record<string, any>) {
  const Comp = type;

  if (typeof Comp !== 'function') {
    console.warn(`Invalid component type: ${typeof Comp}`);
    return null;
  }

  const normalizedProps = stabilizeProps(props);
  return untracked(() => Comp(normalizedProps));
}

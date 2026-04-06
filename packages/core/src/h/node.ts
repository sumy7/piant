import { untracked } from 'mobx';

export function createComponent(type: any, props: Record<string, any>) {
  const Comp = type;

  if (typeof Comp !== 'function') {
    console.warn(`Invalid component type: ${typeof Comp}`);
    return null;
  }

  return untracked(() => Comp(props));
}

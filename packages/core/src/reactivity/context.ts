import { children, memo } from './effects';
import type { ContextOwner } from './owner';
import { getOwner } from './owner';

export interface Context<T> {
  id: symbol;
  Provider: (props: { value: T; children: any }) => any;
  defaultValue?: T;
}

function createProvider(id: symbol) {
  return function provider(props: { value: unknown; children: any }) {
    return memo(() => {
      const owner = getOwner()!;
      owner.context = { ...owner.context, [id]: props.value };
      return children(() => props.children);
    });
  };
}

// context api
export function createContext<T>(defaultValue?: T): Context<T> {
  const id = Symbol('context');
  return { id, Provider: createProvider(id), defaultValue };
}

export function useContext<T>(context: Context<T>) {
  const owner = getOwner();
  return lookup(owner, context.id, context.defaultValue) as T;
}

export function lookup(
  owner: ContextOwner | null,
  key: symbol | string,
  defaultValue: any,
): any {
  if (owner && owner.context && owner.context[key] !== undefined) {
    return owner.context[key];
  } else if (owner && owner.owner) {
    return lookup(owner.owner, key, defaultValue);
  } else {
    return defaultValue;
  }
}

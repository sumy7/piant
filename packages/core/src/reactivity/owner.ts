import { handleError } from './errors';
import type { Fn } from './types';

export type ContextOwner = {
  disposables: any[];
  owner: ContextOwner | null;
  context?: any;
};

let globalContext: ContextOwner | null = null;

export function getOwner(): ContextOwner | null {
  return globalContext;
}

export function createOwner(): ContextOwner {
  return {
    disposables: [],
    owner: globalContext,
    context: {},
  };
}

export function runWithOwner<T>(owner: ContextOwner | null, fn: Fn<T>): T {
  const prevOwner = globalContext;
  globalContext = owner;
  try {
    return fn();
  } catch (e) {
    handleError(e, owner);
    return undefined as T;
  } finally {
    globalContext = prevOwner;
  }
}

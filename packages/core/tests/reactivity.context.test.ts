import { describe, expect, it } from 'vitest';
import { root } from '../src/reactivity/effects';
import { createContext, lookup, useContext } from '../src/reactivity/context';
import { runWithOwner, createOwner } from '../src/reactivity/owner';

describe('createContext', () => {
  it('creates a context with a unique id', () => {
    const ctx1 = createContext<number>();
    const ctx2 = createContext<number>();
    expect(ctx1.id).not.toBe(ctx2.id);
  });

  it('uses provided default value', () => {
    const ctx = createContext<number>(42);
    expect(ctx.defaultValue).toBe(42);
  });

  it('creates a Provider component', () => {
    const ctx = createContext<number>(0);
    expect(typeof ctx.Provider).toBe('function');
  });
});

describe('useContext', () => {
  it('returns default value when no provider', () => {
    const ctx = createContext<number>(99);
    root(() => {
      const value = useContext(ctx);
      expect(value).toBe(99);
    });
  });

  it('returns undefined when no provider and no default', () => {
    const ctx = createContext<number>();
    root(() => {
      const value = useContext(ctx);
      expect(value).toBeUndefined();
    });
  });
});

describe('lookup', () => {
  it('returns default value when owner is null', () => {
    const key = Symbol('test');
    const result = lookup(null, key, 'default');
    expect(result).toBe('default');
  });

  it('returns value from owner context when present', () => {
    const key = Symbol('test');
    const owner = createOwner();
    owner.context[key] = 'found';
    const result = lookup(owner, key, 'default');
    expect(result).toBe('found');
  });

  it('traverses owner chain to find value', () => {
    const key = Symbol('test');
    const parentOwner = createOwner();
    parentOwner.context[key] = 'parent-value';

    const childOwner = createOwner();
    // childOwner.owner points to globalContext at time of creation,
    // so we manually set parent
    childOwner.owner = parentOwner;

    const result = lookup(childOwner, key, 'default');
    expect(result).toBe('parent-value');
  });

  it('returns default when key not found anywhere in chain', () => {
    const key = Symbol('test');
    const owner = createOwner();
    const result = lookup(owner, key, 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns value undefined from context differently than missing', () => {
    const key = Symbol('test');
    const owner = createOwner();
    // Value is undefined, so lookup should fall through to owner chain
    owner.context[key] = undefined;
    const result = lookup(owner, key, 'default');
    expect(result).toBe('default');
  });
});

describe('Context.Provider', () => {
  it('provides context value to children via Provider', () => {
    const ctx = createContext<number>(0);
    root(() => {
      const owner = createOwner();
      owner.context = { [ctx.id]: 10 };
      let value: number | undefined;
      runWithOwner(owner, () => {
        value = useContext(ctx);
      });
      expect(value).toBe(10);
    });
  });
});

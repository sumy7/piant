import { describe, expect, it, vi } from 'vitest';
import { Dynamic } from '../src/components/Dynamic';
import { root } from '../src/reactivity/effects';

describe('Dynamic', () => {
  it('calls component function with props when component is a function', () => {
    root(() => {
      const MyComponent = vi.fn((p: { text: string }) => `rendered:${p.text}`);
      const result = Dynamic({
        component: MyComponent as any,
        props: { text: 'hello' },
      });
      expect((result as any)()).toBe('rendered:hello');
      expect(MyComponent).toHaveBeenCalledWith({ text: 'hello' });
    });
  });

  it('returns non-function component as-is', () => {
    root(() => {
      const result = Dynamic({
        component: 'literal-string' as any,
        props: {},
      });
      expect((result as any)()).toBe('literal-string');
    });
  });

  it('returns undefined when component is undefined', () => {
    root(() => {
      const result = Dynamic({
        component: undefined as any,
        props: {},
      });
      expect((result as any)()).toBeUndefined();
    });
  });

  it('returns null when component is null', () => {
    root(() => {
      const result = Dynamic({
        component: null as any,
        props: {},
      });
      expect((result as any)()).toBeNull();
    });
  });

  it('returns numeric component as-is', () => {
    root(() => {
      const result = Dynamic({
        component: 42 as any,
        props: {},
      });
      expect((result as any)()).toBe(42);
    });
  });

  it('passes props correctly to component function', () => {
    root(() => {
      const comp = vi.fn((p: any) => null as any);
      const result = Dynamic({ component: comp as any, props: { a: 1, b: 2 } });
      (result as any)();
      expect(comp).toHaveBeenCalledTimes(1);
      expect(comp).toHaveBeenCalledWith({ a: 1, b: 2 });
    });
  });
});

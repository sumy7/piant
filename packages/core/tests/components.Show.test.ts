import { describe, expect, it } from 'vitest';
import { Show } from '../src/components/Show';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('Show', () => {
  it('renders children when condition is truthy', () => {
    root(() => {
      const result = Show({ when: true, children: 'visible' as any });
      expect(typeof result).toBe('function');
      expect((result as any)()).toBe('visible');
    });
  });

  it('renders fallback when condition is falsy', () => {
    root(() => {
      const result = Show({
        when: false,
        children: 'visible' as any,
        fallback: 'hidden' as any,
      });
      expect((result as any)()).toBe('hidden');
    });
  });

  it('renders empty array when falsy and no fallback', () => {
    root(() => {
      const result = Show({ when: false, children: 'visible' as any });
      expect((result as any)()).toEqual([]);
    });
  });

  it('reacts to changing condition via reactive when prop', () => {
    root(() => {
      const [visible, setVisible] = createState<boolean>(false);
      const result = Show({
        get when() { return visible(); },
        children: 'shown' as any,
        fallback: 'hidden' as any,
      });

      expect((result as any)()).toBe('hidden');

      setVisible(true);
      expect((result as any)()).toBe('shown');
    });
  });

  it('calls child function with a getter when child is function with args', () => {
    root(() => {
      // Show passes `() => props.when` to the child function
      const childFn = (getVal: () => boolean) => `got:${typeof getVal}`;
      const result = Show({
        when: true as any,
        children: childFn as any,
      });
      const rendered = (result as any)();
      // child is called with a getter function
      expect(rendered).toBe('got:function');
    });
  });
});

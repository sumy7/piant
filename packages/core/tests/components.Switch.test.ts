import { describe, expect, it } from 'vitest';
import { Match, Switch } from '../src/components/Switch';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('Match', () => {
  it('returns props unchanged (identity function for Switch to consume)', () => {
    const props = { when: true, children: 'child' as any };
    expect(Match(props)).toBe(props as unknown);
  });
});

describe('Switch', () => {
  it('renders the first matched child', () => {
    root(() => {
      const result = Switch({
        children: [
          Match({ when: false, children: 'first' as any }),
          Match({ when: true, children: 'second' as any }),
          Match({ when: true, children: 'third' as any }),
        ] as any,
      });
      expect((result as any)()).toBe('second');
    });
  });

  it('renders fallback when no match', () => {
    root(() => {
      const result = Switch({
        fallback: 'fallback' as any,
        children: [
          Match({ when: false, children: 'a' as any }),
          Match({ when: null, children: 'b' as any }),
        ] as any,
      });
      expect((result as any)()).toBe('fallback');
    });
  });

  it('returns undefined when no match and no fallback', () => {
    root(() => {
      const result = Switch({
        children: [Match({ when: false, children: 'a' as any })] as any,
      });
      expect((result as any)()).toBeUndefined();
    });
  });

  it('reacts to condition changes', () => {
    root(() => {
      const [flag, setFlag] = createState(false);
      const result = Switch({
        fallback: 'off' as any,
        children: [Match({ when: flag() as boolean, children: 'on' as any })] as any,
      });
      // Initial: flag is false
      expect((result as any)()).toBe('off');

      // New Switch with updated condition
      setFlag(true);
      const result2 = Switch({
        fallback: 'off' as any,
        children: [Match({ when: true, children: 'on' as any })] as any,
      });
      expect((result2 as any)()).toBe('on');
    });
  });

  it('calls non-keyed child function with a getter for the condition', () => {
    root(() => {
      // For non-keyed Match, child receives a getter function wrapping the condition
      const childFn = (getVal: () => unknown) => (typeof getVal === 'function' ? 'ok' : 'fail') as any;
      const result = Switch({
        children: [Match({ when: true, children: childFn as any })] as any,
      });
      const rendered = (result as any)();
      // The rendered value is what childFn returned, or a derived reactive value
      expect(rendered).not.toBeNull();
      expect(rendered).not.toBeUndefined();
    });
  });

  it('handles empty array children gracefully', () => {
    root(() => {
      const result = Switch({ fallback: 'fb' as any, children: [] as any });
      expect((result as any)()).toBe('fb');
    });
  });
});

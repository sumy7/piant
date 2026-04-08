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

  it('reacts to condition changes via reactive when prop', () => {
    root(() => {
      const [flag, setFlag] = createState(false);
      const result = Switch({
        fallback: 'off' as any,
        children: [Match({ get when() { return flag(); }, children: 'on' as any })] as any,
      });

      expect((result as any)()).toBe('off');

      setFlag(true);
      expect((result as any)()).toBe('on');
    });
  });

  it('calls non-keyed child function with a getter for the condition value', () => {
    root(() => {
      const sentinel = 'child-rendered';
      let getterValue: unknown = undefined;

      // Use a class instance so MobX deepEnhancer doesn't wrap function
      // properties as zero-length actions (only plain objects are converted).
      class MatchConfig {
        constructor(
          public when: unknown,
          public children: (...args: any[]) => any,
        ) {}
      }

      const childFn = function (getVal: () => unknown) {
        getterValue = getVal;
        return sentinel;
      };

      const result = Switch({
        children: [new MatchConfig(true, childFn)] as any,
      });
      const rendered = (result as any)();
      expect(rendered).toBe(sentinel);
      expect(typeof getterValue).toBe('function');
      // The getter should return the truthy condition value
      expect((getterValue as () => unknown)()).toBe(true);
    });
  });

  it('handles empty array children gracefully', () => {
    root(() => {
      const result = Switch({ fallback: 'fb' as any, children: [] as any });
      expect((result as any)()).toBe('fb');
    });
  });
});

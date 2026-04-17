import { describe, expect, it, vi } from 'vitest';
import { Show } from '../src/components/Show';
import { Transition } from '../src/components/Transition';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('Transition', () => {
  it('returns empty array when no children are provided', () => {
    root(() => {
      const result = Transition({}) as unknown as () => JSX.Element[];
      expect(result()).toEqual([]);
    });
  });

  it('returns single-element array on initial mount without appear', () => {
    root(() => {
      const result = Transition({ children: 'hello' as any }) as unknown as () => JSX.Element[];
      expect(result()).toEqual(['hello']);
    });
  });

  it('does NOT call enter hooks on initial mount when appear is false', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const onEnter = vi.fn();
      const onAfterEnter = vi.fn();
      Transition({
        children: 'hello' as any,
        onBeforeEnter,
        onEnter,
        onAfterEnter,
      });
      expect(onBeforeEnter).not.toHaveBeenCalled();
      expect(onEnter).not.toHaveBeenCalled();
      expect(onAfterEnter).not.toHaveBeenCalled();
    });
  });

  it('calls onBeforeEnter synchronously on initial mount when appear is true', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      Transition({
        children: 'hello' as any,
        appear: true,
        onBeforeEnter,
      });
      expect(onBeforeEnter).toHaveBeenCalledWith('hello');
    });
  });

  it('switches element in parallel mode: shows both during transition', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'parallel',
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      expect(result()).toEqual(['A']);

      setChild('B');
      // parallel: both A (exiting) and B (entering) visible simultaneously
      // B is the first item (entering), A is the second item (exiting)
      const rendered = result();
      expect(rendered).toContain('A');
      expect(rendered).toContain('B');

      // cleanup
      exitDone!();
    });
  });

  it('calls onBeforeExit synchronously when element changes', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onBeforeExit = vi.fn();
      Transition({
        get children() {
          return child() as any;
        },
        onBeforeExit,
      });

      setChild('B');
      expect(onBeforeExit).toHaveBeenCalledWith('A');
    });
  });

  it('calls onBeforeEnter synchronously when element changes', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onBeforeEnter = vi.fn();
      Transition({
        get children() {
          return child() as any;
        },
        onBeforeEnter,
      });

      setChild('B');
      expect(onBeforeEnter).toHaveBeenCalledWith('B');
    });
  });

  it('removes exiting element after onExit calls done', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'parallel',
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      setChild('B');
      // Both A and B visible while A exits
      expect(result()).toContain('A');
      expect(result()).toContain('B');

      // User finishes the exit animation
      exitDone!();
      // Now only B should be in the list
      expect(result()).toEqual(['B']);
    });
  });

  it('calls onAfterExit after done is called', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      Transition({
        get children() {
          return child() as any;
        },
        onExit: (_el, done) => {
          exitDone = done;
        },
        onAfterExit,
      });

      setChild('B');
      expect(onAfterExit).not.toHaveBeenCalled();
      exitDone!();
      expect(onAfterExit).toHaveBeenCalledWith('A');
    });
  });

  it('out-in mode: shows old element until exit done, then shows new', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      setChild('B');
      // Only old element shown while exiting
      expect(result()).toEqual(['A']);

      // Complete exit
      exitDone!();
      // Now only new element shown
      expect(result()).toEqual(['B']);
    });
  });

  it('in-out mode: shows new element first, then exits old after enter done', async () => {
    await root(async () => {
      const [child, setChild] = createState<string | null>('A');
      let enterDone: (() => void) | undefined;
      let exitDone: (() => void) | undefined;
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'in-out',
        onEnter: (_el, done) => {
          enterDone = done;
        },
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      setChild('B');
      // Microtask to let onEnter be called via queueMicrotask
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Both visible, B entering
      const rendered = result();
      expect(rendered).toContain('A');
      expect(rendered).toContain('B');

      // Complete enter of B - exit of A should start
      enterDone!();
      // A still visible while exiting
      expect(result()).toContain('A');
      expect(result()).toContain('B');

      // Complete exit of A
      exitDone!();
      // Only B remains
      expect(result()).toEqual(['B']);
    });
  });

  it('calls onAfterEnter only after done() is called', async () => {
    await root(async () => {
      const [child, setChild] = createState<string | null>('A');
      const onAfterEnter = vi.fn();
      let enterDone: (() => void) | undefined;
      Transition({
        get children() {
          return child() as any;
        },
        onEnter: (_el, done) => {
          enterDone = done;
        },
        onAfterEnter,
      });

      setChild('B');
      // Flush the queueMicrotask so onEnter is invoked
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(onAfterEnter).not.toHaveBeenCalled();
      enterDone!();
      expect(onAfterEnter).toHaveBeenCalledWith('B');
    });
  });

  it('calling enter done() twice does not invoke onAfterEnter twice', async () => {
    await root(async () => {
      const [child, setChild] = createState<string | null>('A');
      const onAfterEnter = vi.fn();
      let enterDone: (() => void) | undefined;
      Transition({
        get children() {
          return child() as any;
        },
        onEnter: (_el, done) => {
          enterDone = done;
        },
        onAfterEnter,
      });

      setChild('B');
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      enterDone!();
      enterDone!(); // second call should be a no-op
      expect(onAfterEnter).toHaveBeenCalledTimes(1);
    });
  });

  it('calling exit done() twice does not invoke onAfterExit twice', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      Transition({
        get children() {
          return child() as any;
        },
        onExit: (_el, done) => {
          exitDone = done;
        },
        onAfterExit,
      });

      setChild('B');
      exitDone!();
      exitDone!(); // second call should be a no-op
      expect(onAfterExit).toHaveBeenCalledTimes(1);
    });
  });

  it('out-in mode: stale exit callback is ignored when transition is interrupted', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const exitDones: Array<() => void> = [];
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDones.push(done);
        },
      }) as unknown as () => JSX.Element[];

      // A → B: A starts exiting
      setChild('B');
      expect(result()).toEqual(['A']);

      // B → C before A finishes: B starts exiting
      setChild('C');

      // Stale callback (A's exit) should be ignored
      exitDones[0]();
      expect(result()).not.toContain('A');

      // B's exit completes: C should be shown
      exitDones[1]();
      expect(result()).toEqual(['C']);
    });
  });

  it('returns empty array after element is set to null in out-in mode', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        get children() {
          return child() as any;
        },
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      setChild(null);
      exitDone!();
      expect(result()).toEqual([]);
    });
  });

  it('tracks reactive changes through children getter (signal)', () => {
    root(() => {
      const [child, setChild] = createState<string>('A');
      // Pass signal function directly as children — it is a 0-arg function so
      // Transition calls it inside the effect and MobX tracks the dependency.
      const result = Transition({ children: child as any }) as unknown as () => JSX.Element[];

      expect(result()).toEqual(['A']);
      setChild('B');
      expect(result()).toEqual(['B']);
    });
  });

  it('works with Show output as children (canonical usage)', () => {
    root(() => {
      const [condition, setCondition] = createState(true);
      const viewA = 'viewA';
      const viewB = 'viewB';

      // Show returns a reactive memo — pass it directly to Transition.
      const showResult = Show({
        get when() {
          return condition();
        },
        children: viewA as any,
        fallback: viewB as any,
      });

      let exitDone: (() => void) | undefined;
      const result = Transition({
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDone = done;
        },
        children: showResult as any,
      }) as unknown as () => JSX.Element[];

      // Initially showing viewA
      expect(result()).toEqual(['viewA']);

      // Condition becomes false → Show switches to viewB
      setCondition(false);
      // out-in: still showing viewA while it exits
      expect(result()).toEqual(['viewA']);

      // Exit completes → viewB is now shown
      exitDone!();
      expect(result()).toEqual(['viewB']);
    });
  });
});

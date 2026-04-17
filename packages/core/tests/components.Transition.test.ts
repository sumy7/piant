import { describe, expect, it, vi } from 'vitest';
import { Transition } from '../src/components/Transition';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('Transition', () => {
  it('returns empty array when each returns null', () => {
    root(() => {
      const result = Transition({ each: () => null });
      expect(result()).toEqual([]);
    });
  });

  it('returns single-element array on initial mount without appear', () => {
    root(() => {
      const result = Transition({ each: () => 'hello' as any });
      expect(result()).toEqual(['hello']);
    });
  });

  it('does NOT call enter hooks on initial mount when appear is false', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const onEnter = vi.fn();
      const onAfterEnter = vi.fn();
      Transition({
        each: () => 'hello' as any,
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
        each: () => 'hello' as any,
        appear: true,
        onBeforeEnter,
      });
      expect(onBeforeEnter).toHaveBeenCalledWith('hello');
    });
  });

  it('switches item in parallel mode: shows both during transition', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        each: child,
        mode: 'parallel',
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

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

  it('calls onBeforeExit synchronously when item changes', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onBeforeExit = vi.fn();
      Transition({
        each: child,
        onBeforeExit,
      });

      setChild('B');
      expect(onBeforeExit).toHaveBeenCalledWith('A');
    });
  });

  it('calls onBeforeEnter synchronously when item changes', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      const onBeforeEnter = vi.fn();
      Transition({
        each: child,
        onBeforeEnter,
      });

      setChild('B');
      expect(onBeforeEnter).toHaveBeenCalledWith('B');
    });
  });

  it('removes exiting item after onExit calls done', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        each: child,
        mode: 'parallel',
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

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
        each: child,
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

  it('out-in mode: shows old item until exit done, then shows new', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        each: child,
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      setChild('B');
      // Only old item shown while exiting
      expect(result()).toEqual(['A']);

      // Complete exit
      exitDone!();
      // Now only new item shown
      expect(result()).toEqual(['B']);
    });
  });

  it('in-out mode: shows new item first, then exits old after enter done', async () => {
    await root(async () => {
      const [child, setChild] = createState<string | null>('A');
      let enterDone: (() => void) | undefined;
      let exitDone: (() => void) | undefined;
      const result = Transition({
        each: child,
        mode: 'in-out',
        onEnter: (_el, done) => {
          enterDone = done;
        },
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

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
        each: child,
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
        each: child,
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
        each: child,
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
        each: child,
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDones.push(done);
        },
      });

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

  it('returns empty array after item is set to null in out-in mode', () => {
    root(() => {
      const [child, setChild] = createState<string | null>('A');
      let exitDone: (() => void) | undefined;
      const result = Transition({
        each: child,
        mode: 'out-in',
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      setChild(null);
      exitDone!();
      expect(result()).toEqual([]);
    });
  });

  it('tracks reactive changes through the each getter', () => {
    root(() => {
      const [child, setChild] = createState<string>('A');
      // Pass the getter directly (same as `each: () => child()`)
      const result = Transition({ each: child });

      expect(result()).toEqual(['A']);
      setChild('B');
      expect(result()).toEqual(['B']);
    });
  });
});

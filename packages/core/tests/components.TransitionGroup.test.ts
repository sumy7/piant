import { describe, expect, it, vi } from 'vitest';
import { TransitionGroup } from '../src/components/TransitionGroup';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('TransitionGroup', () => {
  it('renders null when each is empty', () => {
    root(() => {
      const result = TransitionGroup({
        each: [],
        children: (item: string) => item as any,
      });
      expect((result as any)()).toBeNull();
    });
  });

  it('renders a single item directly (not wrapped in array)', () => {
    root(() => {
      const result = TransitionGroup({
        each: ['A'],
        children: (item: string) => item as any,
      });
      expect((result as any)()).toBe('A');
    });
  });

  it('renders multiple items as an array', () => {
    root(() => {
      const result = TransitionGroup({
        each: ['A', 'B', 'C'],
        children: (item: string) => item as any,
      });
      const rendered = (result as any)();
      expect(Array.isArray(rendered)).toBe(true);
      expect(rendered).toEqual(['A', 'B', 'C']);
    });
  });

  it('does NOT call enter hooks on initial mount when appear is false', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const onEnter = vi.fn();
      TransitionGroup({
        each: ['A', 'B'],
        children: (item: string) => item as any,
        onBeforeEnter,
        onEnter,
      });
      expect(onBeforeEnter).not.toHaveBeenCalled();
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  it('calls onBeforeEnter for each item on initial mount when appear is true', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      TransitionGroup({
        each: ['A', 'B'],
        children: (item: string) => item as any,
        appear: true,
        onBeforeEnter,
      });
      expect(onBeforeEnter).toHaveBeenCalledTimes(2);
      expect(onBeforeEnter).toHaveBeenCalledWith('A');
      expect(onBeforeEnter).toHaveBeenCalledWith('B');
    });
  });

  it('calls onBeforeEnter when a new item is added', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const onBeforeEnter = vi.fn();
      TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onBeforeEnter,
      });

      setItems(['A', 'B', 'C']);
      expect(onBeforeEnter).toHaveBeenCalledTimes(1);
      expect(onBeforeEnter).toHaveBeenCalledWith('C');
    });
  });

  it('calls onBeforeExit when an item is removed', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const onBeforeExit = vi.fn();
      TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onBeforeExit,
      });

      setItems(['A', 'C']);
      expect(onBeforeExit).toHaveBeenCalledTimes(1);
      expect(onBeforeExit).toHaveBeenCalledWith('B');
    });
  });

  it('keeps exiting item visible until done() is called', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      setItems(['A']);
      // B should still be visible while exiting
      const rendered = (result as any)();
      expect(Array.isArray(rendered)).toBe(true);
      expect(rendered).toContain('A');
      expect(rendered).toContain('B');

      // Complete exit
      exitDone!();
      expect((result as any)()).toBe('A');
    });
  });

  it('calls onAfterExit after done() is called', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onExit: (_el, done) => {
          exitDone = done;
        },
        onAfterExit,
      });

      setItems(['A']);
      expect(onAfterExit).not.toHaveBeenCalled();
      exitDone!();
      expect(onAfterExit).toHaveBeenCalledWith('B');
    });
  });

  it('calls onAfterEnter only after done() is called', async () => {
    await root(async () => {
      const [items, setItems] = createState<string[]>(['A']);
      const onAfterEnter = vi.fn();
      let enterDone: (() => void) | undefined;
      TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onEnter: (_el, done) => {
          enterDone = done;
        },
        onAfterEnter,
      });

      setItems(['A', 'B']);
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(onAfterEnter).not.toHaveBeenCalled();
      enterDone!();
      expect(onAfterEnter).toHaveBeenCalledWith('B');
    });
  });

  it('calling exit done() twice fires onAfterExit only once', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onExit: (_el, done) => {
          exitDone = done;
        },
        onAfterExit,
      });

      setItems(['A']);
      exitDone!();
      exitDone!();
      expect(onAfterExit).toHaveBeenCalledTimes(1);
    });
  });

  it('stale exit does not remove a re-added item and onAfterExit fires for the exited element', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const exitDones: Array<() => void> = [];
      const onAfterExit = vi.fn();
      const result = TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onExit: (_el, done) => {
          exitDones.push(done);
        },
        onAfterExit,
      });

      // Remove B — starts exit
      setItems(['A']);
      // Re-add B before exit completes
      setItems(['A', 'B']);

      // Call old exit done — should not remove the new B
      exitDones[0]();

      const rendered = (result as any)();
      // New B should still be present (re-entered)
      expect(rendered).toContain('B');
      // onAfterExit fires for the old B element (it did exit), but the new B stays visible
      expect(onAfterExit).toHaveBeenCalledTimes(1);
      expect(onAfterExit).toHaveBeenCalledWith('B');
    });
  });

  it('multiple items can exit simultaneously', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const exitDones: Array<() => void> = [];
      const result = TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => item as any,
        onExit: (_el, done) => {
          exitDones.push(done);
        },
      });

      setItems([]);
      // All three should still be visible while exiting
      const rendered = (result as any)();
      expect(Array.isArray(rendered)).toBe(true);
      expect(rendered).toContain('A');
      expect(rendered).toContain('B');
      expect(rendered).toContain('C');

      // Complete exits one by one
      exitDones[0]();
      exitDones[1]();
      exitDones[2]();
      expect((result as any)()).toBeNull();
    });
  });

  it('renders each item with a stable element reference', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const createdEls: string[] = [];
      const result = TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => {
          const el = `el-${item}`;
          createdEls.push(el);
          return el as any;
        },
      });

      expect((result as any)()).toEqual(['el-A', 'el-B']);
      expect(createdEls).toEqual(['el-A', 'el-B']);

      // Update: add C, keep A and B
      setItems(['A', 'B', 'C']);
      // children should only have been called for C
      expect(createdEls).toEqual(['el-A', 'el-B', 'el-C']);
    });
  });

  it('element references remain stable after removing an item and updating remaining items', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const createdEls: string[] = [];
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        get each() {
          return items();
        },
        children: (item: string) => {
          const el = `el-${item}`;
          createdEls.push(el);
          return el as any;
        },
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      expect((result as any)()).toEqual(['el-A', 'el-B', 'el-C']);

      // Remove B — B stays visible while exiting
      setItems(['A', 'C']);
      const during = (result as any)();
      expect(during).toContain('el-A');
      expect(during).toContain('el-B'); // still exiting
      expect(during).toContain('el-C');
      // children should NOT have been called again for A or C
      expect(createdEls).toEqual(['el-A', 'el-B', 'el-C']);

      // Reorder remaining items
      setItems(['C', 'A']);
      // Still no new elements created
      expect(createdEls).toEqual(['el-A', 'el-B', 'el-C']);

      // Finish exit
      exitDone!();
      expect((result as any)()).toEqual(['el-C', 'el-A']);
    });
  });
});

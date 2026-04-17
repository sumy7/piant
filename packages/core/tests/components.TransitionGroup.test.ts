import { describe, expect, it, vi } from 'vitest';
import { TransitionGroup } from '../src/components/TransitionGroup';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('TransitionGroup', () => {
  it('returns empty array when each is empty', () => {
    root(() => {
      const result = TransitionGroup({ each: () => [] });
      expect(result()).toEqual([]);
    });
  });

  it('returns all initial items', () => {
    root(() => {
      const result = TransitionGroup({ each: () => ['A', 'B', 'C'] });
      expect(result()).toEqual(['A', 'B', 'C']);
    });
  });

  it('does NOT call enter hooks on initial mount when appear is false', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const onEnter = vi.fn();
      TransitionGroup({
        each: () => ['A', 'B'],
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
        each: () => ['A', 'B'],
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
        each: items,
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
        each: items,
        onBeforeExit,
      });

      setItems(['A', 'C']);
      expect(onBeforeExit).toHaveBeenCalledTimes(1);
      expect(onBeforeExit).toHaveBeenCalledWith('B');
    });
  });

  it('keeps exiting item in display list until done() is called', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        each: items,
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      setItems(['A']);
      // B should still be in the display list while exiting
      expect(result()).toContain('A');
      expect(result()).toContain('B');

      // Complete exit
      exitDone!();
      expect(result()).toEqual(['A']);
    });
  });

  it('calls onAfterExit after done() is called', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      TransitionGroup({
        each: items,
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
        each: items,
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
        each: items,
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

  it('stale exit does not remove a re-added item and onAfterExit fires for the exited item', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const exitDones: Array<() => void> = [];
      const onAfterExit = vi.fn();
      const result = TransitionGroup({
        each: items,
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

      // New B should still be present (re-entered)
      expect(result()).toContain('B');
      // onAfterExit fires for the old B item (it did exit), new B stays visible
      expect(onAfterExit).toHaveBeenCalledTimes(1);
      expect(onAfterExit).toHaveBeenCalledWith('B');
    });
  });

  it('multiple items can exit simultaneously', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const exitDones: Array<() => void> = [];
      const result = TransitionGroup({
        each: items,
        onExit: (_el, done) => {
          exitDones.push(done);
        },
      });

      setItems([]);
      // All three should still be in the display list while exiting
      expect(result()).toContain('A');
      expect(result()).toContain('B');
      expect(result()).toContain('C');

      // Complete exits one by one
      exitDones[0]();
      exitDones[1]();
      exitDones[2]();
      expect(result()).toEqual([]);
    });
  });

  it('does not re-process items that remain in the list', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const enterItems: string[] = [];
      const result = TransitionGroup({
        each: items,
        onBeforeEnter: (item) => enterItems.push(item),
      });

      expect(result()).toEqual(['A', 'B']);
      expect(enterItems).toEqual([]); // no appear

      // Add C — only C should trigger onBeforeEnter
      setItems(['A', 'B', 'C']);
      expect(enterItems).toEqual(['C']);
      // A and B unchanged
      expect(result()).toEqual(['A', 'B', 'C']);
    });
  });

  it('maintains item order matching the each getter', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        each: items,
        onExit: (_el, done) => {
          exitDone = done;
        },
      });

      // Remove B — B stays in display list while exiting (appended after active items)
      setItems(['A', 'C']);
      expect(result()).toEqual(['A', 'C', 'B']);

      // Reorder remaining active items
      setItems(['C', 'A']);
      expect(result()).toEqual(['C', 'A', 'B']); // B still exiting

      // Finish exit
      exitDone!();
      expect(result()).toEqual(['C', 'A']);
    });
  });
});

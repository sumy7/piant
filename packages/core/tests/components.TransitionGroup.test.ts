import { describe, expect, it, vi } from 'vitest';
import { TransitionGroup } from '../src/components/TransitionGroup';
import { memo, root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

/**
 * Simulate `For`'s reactive output: a 0-arg memo that returns the current items.
 * In real usage `For` uses mapArray (stable element refs per item). Here we use
 * string values as stand-in elements; distinct strings have distinct identities,
 * which is sufficient for testing TransitionGroup's diffing logic.
 */
function simFor(itemsGetter: () => string[]): () => string[] {
  return memo(() => itemsGetter()) as unknown as () => string[];
}

describe('TransitionGroup', () => {
  it('returns empty array when For output is empty', () => {
    root(() => {
      const forOutput = simFor(() => []);
      const result = TransitionGroup({
        children: forOutput as any,
      }) as unknown as () => JSX.Element[];
      expect(result()).toEqual([]);
    });
  });

  it('returns all initial elements from For output', () => {
    root(() => {
      const forOutput = simFor(() => ['A', 'B', 'C']);
      const result = TransitionGroup({
        children: forOutput as any,
      }) as unknown as () => JSX.Element[];
      expect(result()).toEqual(['A', 'B', 'C']);
    });
  });

  it('does NOT call enter hooks on initial mount when appear is false', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const onEnter = vi.fn();
      const forOutput = simFor(() => ['A', 'B']);
      TransitionGroup({
        children: forOutput as any,
        onBeforeEnter,
        onEnter,
      });
      expect(onBeforeEnter).not.toHaveBeenCalled();
      expect(onEnter).not.toHaveBeenCalled();
    });
  });

  it('calls onBeforeEnter for each element on initial mount when appear is true', () => {
    root(() => {
      const onBeforeEnter = vi.fn();
      const forOutput = simFor(() => ['A', 'B']);
      TransitionGroup({
        children: forOutput as any,
        appear: true,
        onBeforeEnter,
      });
      expect(onBeforeEnter).toHaveBeenCalledTimes(2);
      expect(onBeforeEnter).toHaveBeenCalledWith('A');
      expect(onBeforeEnter).toHaveBeenCalledWith('B');
    });
  });

  it('calls onBeforeEnter when a new element appears in For output', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const forOutput = simFor(() => items());
      const onBeforeEnter = vi.fn();
      TransitionGroup({
        children: forOutput as any,
        onBeforeEnter,
      });

      setItems(['A', 'B', 'C']);
      expect(onBeforeEnter).toHaveBeenCalledTimes(1);
      expect(onBeforeEnter).toHaveBeenCalledWith('C');
    });
  });

  it('calls onBeforeExit when an element disappears from For output', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const forOutput = simFor(() => items());
      const onBeforeExit = vi.fn();
      TransitionGroup({
        children: forOutput as any,
        onBeforeExit,
      });

      setItems(['A', 'C']);
      expect(onBeforeExit).toHaveBeenCalledTimes(1);
      expect(onBeforeExit).toHaveBeenCalledWith('B');
    });
  });

  it('keeps exiting element in display list until done() is called', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const forOutput = simFor(() => items());
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        children: forOutput as any,
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

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
      const forOutput = simFor(() => items());
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      TransitionGroup({
        children: forOutput as any,
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
      const forOutput = simFor(() => items());
      const onAfterEnter = vi.fn();
      let enterDone: (() => void) | undefined;
      TransitionGroup({
        children: forOutput as any,
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
      const forOutput = simFor(() => items());
      const onAfterExit = vi.fn();
      let exitDone: (() => void) | undefined;
      TransitionGroup({
        children: forOutput as any,
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

  it('stale exit does not duplicate a re-added element', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B']);
      const forOutput = simFor(() => items());
      const exitDones: Array<() => void> = [];
      const onAfterExit = vi.fn();
      const result = TransitionGroup({
        children: forOutput as any,
        onExit: (_el, done) => {
          exitDones.push(done);
        },
        onAfterExit,
      }) as unknown as () => JSX.Element[];

      // Remove B — starts exit
      setItems(['A']);
      // Re-add B before exit completes — B appears in For output again
      setItems(['A', 'B']);

      // Display should show B once (from current For output, not duplicated by exiting)
      const rendered = result();
      expect(rendered.filter((el) => el === 'B').length).toBe(1);

      // Old exit done — fires onAfterExit but does not remove B from display
      exitDones[0]();
      expect(onAfterExit).toHaveBeenCalledTimes(1);
      expect(onAfterExit).toHaveBeenCalledWith('B');
      // B still visible
      expect(result()).toContain('B');
    });
  });

  it('multiple elements can exit simultaneously', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const forOutput = simFor(() => items());
      const exitDones: Array<() => void> = [];
      const result = TransitionGroup({
        children: forOutput as any,
        onExit: (_el, done) => {
          exitDones.push(done);
        },
      }) as unknown as () => JSX.Element[];

      setItems([]);
      // All three still in display while exiting
      expect(result()).toContain('A');
      expect(result()).toContain('B');
      expect(result()).toContain('C');

      exitDones[0]();
      exitDones[1]();
      exitDones[2]();
      expect(result()).toEqual([]);
    });
  });

  it('maintains element order: exiting element stays at its original position', () => {
    root(() => {
      const [items, setItems] = createState<string[]>(['A', 'B', 'C']);
      const forOutput = simFor(() => items());
      let exitDone: (() => void) | undefined;
      const result = TransitionGroup({
        children: forOutput as any,
        onExit: (_el, done) => {
          exitDone = done;
        },
      }) as unknown as () => JSX.Element[];

      // Remove B — B stays at its original position between A and C
      setItems(['A', 'C']);
      expect(result()).toEqual(['A', 'B', 'C']);

      // Reorder active items — B still follows its anchor (A)
      setItems(['C', 'A']);
      expect(result()).toEqual(['C', 'A', 'B']); // B still exiting

      exitDone!();
      expect(result()).toEqual(['C', 'A']);
    });
  });

  it('passes actual For-rendered element objects to lifecycle hooks', () => {
    root(() => {
      // Simulate For creating distinct element objects per item
      const elA = { tag: 'A' };
      const elB = { tag: 'B' };
      const [elems, setElems] = createState<object[]>([elA, elB]);
      const forOutput = memo(() => elems()) as unknown as JSX.Element;

      const onBeforeEnter = vi.fn();
      const onBeforeExit = vi.fn();
      TransitionGroup({
        children: forOutput,
        appear: true,
        onBeforeEnter,
        onBeforeExit,
      });

      // appear: hooks receive the element objects
      expect(onBeforeEnter).toHaveBeenCalledWith(elA);
      expect(onBeforeEnter).toHaveBeenCalledWith(elB);

      const elC = { tag: 'C' };
      setElems([elA, elC]);
      expect(onBeforeExit).toHaveBeenCalledWith(elB);
      expect(onBeforeEnter).toHaveBeenCalledWith(elC);
    });
  });
});


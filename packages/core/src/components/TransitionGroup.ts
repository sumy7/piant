import { untracked } from 'mobx';
import { effect, memo } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';
import type { TransitionEvents } from './Transition';

export interface TransitionGroupProps<T> extends TransitionEvents {
  each: T[];
  children: (item: T) => JSX.Element;
  appear?: boolean;
}

/**
 * TransitionGroup manages enter/exit lifecycle hooks for a list of items.
 * Each item is rendered once via `children` and kept alive until its exit
 * animation completes. Items are tracked by referential identity.
 */
export function TransitionGroup<T>(props: TransitionGroupProps<T>): JSX.Element {
  type Entry = { item: T; el: JSX.Element; id: number };

  let nextId = 0;
  // Reactive list of all currently-displayed entries (active + exiting).
  const [displayList, setDisplayList] = createState<Entry[]>([]);
  // Maps each currently-active item to its entry (exiting items are removed here).
  const activeMap = new Map<T, Entry>();
  let prevItems: T[] = [];
  let initialized = false;

  const doEnter = (el: JSX.Element, onComplete?: () => void) => {
    props.onBeforeEnter?.(el);
    queueMicrotask(() => {
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        props.onAfterEnter?.(el);
        onComplete?.();
      };
      if (props.onEnter) {
        props.onEnter(el, done);
      } else {
        done();
      }
    });
  };

  const doExit = (el: JSX.Element, onDone: () => void) => {
    props.onBeforeExit?.(el);
    let called = false;
    const done = () => {
      if (called) return;
      called = true;
      props.onAfterExit?.(el);
      onDone();
    };
    if (props.onExit) {
      props.onExit(el, done);
    } else {
      done();
    }
  };

  effect(() => {
    const current = props.each ?? [];

    untracked(() => {
      if (!initialized) {
        initialized = true;
        const entries: Entry[] = current.map((item) => {
          const entry: Entry = { item, el: props.children(item), id: nextId++ };
          activeMap.set(item, entry);
          return entry;
        });
        setDisplayList(entries);
        if (props.appear) {
          for (const entry of entries) {
            doEnter(entry.el);
          }
        }
        prevItems = [...current];
        return;
      }

      const prevSet = new Set(prevItems);
      const currentSet = new Set(current);

      const added = current.filter((item) => !prevSet.has(item));
      const removed = prevItems.filter((item) => !currentSet.has(item));

      // Capture entries for removed items before modifying activeMap.
      const removedEntries = removed.map((item) => activeMap.get(item)).filter(Boolean) as Entry[];

      for (const item of removed) {
        activeMap.delete(item);
      }

      // Create entries for newly added items.
      const addedEntries: Entry[] = added.map((item) => {
        const entry: Entry = { item, el: props.children(item), id: nextId++ };
        activeMap.set(item, entry);
        return entry;
      });

      // Rebuild display list:
      //   • active items in their current order
      //   • still-exiting entries from previous transitions appended at the end
      setDisplayList((prev) => {
        const activeIds = new Set([...activeMap.values()].map((e) => e.id));
        const stillExiting = prev.filter((e) => !activeIds.has(e.id));
        const activeEntries = current.map((item) => activeMap.get(item)!);
        return [...activeEntries, ...stillExiting];
      });

      // Trigger enter animations for new items.
      for (const entry of addedEntries) {
        doEnter(entry.el);
      }

      // Trigger exit animations for removed items; remove from display when done.
      for (const entry of removedEntries) {
        const exitId = entry.id;
        doExit(entry.el, () => {
          setDisplayList((prev) => prev.filter((e) => e.id !== exitId));
        });
      }

      prevItems = [...current];
    });
  });

  return memo(() => {
    const list = displayList();
    if (list.length === 0) return null;
    if (list.length === 1) return list[0].el;
    return list.map((e) => e.el);
  }) as JSX.Element;
}

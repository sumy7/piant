import { untracked } from 'mobx';
import type { Getter } from '../reactivity';
import { effect, memo } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';
import type { TransitionEvents } from './Transition';

export interface TransitionGroupProps<T> extends TransitionEvents {
  appear?: boolean;
  /**
   * A reactive getter returning the current list of items.
   * Pass a getter from `createState` directly (`each: mySignal`) or wrap an
   * expression (`each: () => list()`). TransitionGroup tracks additions and
   * removals through this getter, keeping removed items in the display list
   * until their exit completes.
   * Use `For` to render the returned display list.
   */
  each: Getter<T[]>;
}

/**
 * Manages enter/exit lifecycle hooks for a list of items.
 * Returns a reactive `Getter<T[]>` of items currently on screen
 * (active items + items whose exit animations are still running).
 * Compose with `For` to render the display list.
 */
export function TransitionGroup<T>(props: TransitionGroupProps<T>): Getter<T[]> {
  type Entry = { item: T; id: number };

  let nextId = 0;
  // Reactive list of all currently-displayed entries (active + exiting).
  const [displayList, setDisplayList] = createState<Entry[]>([]);
  // Maps each currently-active item to its entry (exiting items are removed here).
  const activeMap = new Map<T, Entry>();
  let prevItems: T[] = [];
  let initialized = false;

  const doEnter = (item: T, onComplete?: () => void) => {
    props.onBeforeEnter?.(item);
    queueMicrotask(() => {
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        props.onAfterEnter?.(item);
        onComplete?.();
      };
      if (props.onEnter) {
        props.onEnter(item, done);
      } else {
        done();
      }
    });
  };

  const doExit = (item: T, onDone: () => void) => {
    props.onBeforeExit?.(item);
    let called = false;
    const done = () => {
      if (called) return;
      called = true;
      props.onAfterExit?.(item);
      onDone();
    };
    if (props.onExit) {
      props.onExit(item, done);
    } else {
      done();
    }
  };

  effect(() => {
    // props.each() is a reactive getter — MobX tracks the dependency here.
    const current = props.each() ?? [];

    untracked(() => {
      if (!initialized) {
        initialized = true;
        const entries: Entry[] = current.map((item) => {
          const entry: Entry = { item, id: nextId++ };
          activeMap.set(item, entry);
          return entry;
        });
        setDisplayList(entries);
        if (props.appear) {
          for (const entry of entries) {
            doEnter(entry.item);
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
        const entry: Entry = { item, id: nextId++ };
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
        doEnter(entry.item);
      }

      // Trigger exit animations for removed items; remove from display when done.
      for (const entry of removedEntries) {
        const exitId = entry.id;
        doExit(entry.item, () => {
          setDisplayList((prev) => prev.filter((e) => e.id !== exitId));
        });
      }

      prevItems = [...current];
    });
  });

  // Derive T[] from internal Entry[] — items only, no internal bookkeeping IDs.
  // Use For to render this list in your component.
  return memo(() => displayList().map((e) => e.item));
}

import { untracked } from 'mobx';
import { effect, memo } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';
import type { TransitionEvents } from './Transition';

export interface TransitionGroupProps<T> extends TransitionEvents {
  /**
   * The reactive list of items. Use the getter pattern (`get each() { return list(); }`)
   * or pass a `createState` signal directly so MobX tracks changes.
   * Mirrors `For`'s `each` prop — use `TransitionGroup` in place of `For` when
   * per-item enter/exit lifecycle hooks are needed.
   */
  each: T[];
  /**
   * Render function called **once per item** when it first enters the list.
   * The returned element is reused until the item's exit animation completes.
   * Lifecycle hooks (`onEnter`, `onExit`, etc.) receive this rendered element,
   * enabling direct canvas animation (e.g. `gsap.to(el, { alpha: 1 })`).
   *
   * Same signature as `For`'s `children` prop (without the index parameter).
   */
  children: (item: T) => JSX.Element;
  appear?: boolean;
}

/**
 * Coordinates enter/exit lifecycle hooks for a list of items.
 *
 * Use in place of `For` when per-item transition animations are needed.
 * Items are tracked by referential identity; each item's element is created
 * once (via `children(item)`) and reused until its exit animation completes.
 * Lifecycle hooks receive the **rendered element**, enabling direct canvas
 * animation without additional mapping.
 *
 * Returns a `JSX.Element` (reactive array) of currently-displayed elements
 * (active items + items whose exit animations are still running).
 *
 * @example
 * ```ts
 * return TransitionGroup({
 *   get each() { return cards(); },
 *   children: (card) => CardView({ card }),
 *   onBeforeEnter: (el) => { el.alpha = 0; },
 *   onEnter: (el, done) => gsap.to(el, { alpha: 1, onComplete: done }),
 *   onExit:  (el, done) => gsap.to(el, { alpha: 0, onComplete: done }),
 * });
 * ```
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
    // props.each is accessed here so MobX tracks the reactive dependency when
    // callers use the getter pattern: `get each() { return list(); }`.
    const current = props.each ?? [];

    untracked(() => {
      if (!initialized) {
        initialized = true;
        const entries: Entry[] = current.map((item) => {
          const el = props.children(item);
          const entry: Entry = { item, el, id: nextId++ };
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
        const el = props.children(item);
        const entry: Entry = { item, el, id: nextId++ };
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

  // Derive JSX.Element[] from internal Entry[] — elements only, no internal
  // bookkeeping IDs. The renderer handles arrays natively.
  return memo(() => displayList().map((e) => e.el)) as unknown as JSX.Element;
}

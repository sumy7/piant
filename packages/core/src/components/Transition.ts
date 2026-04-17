import { untracked } from 'mobx';
import type { Getter } from '../reactivity';
import { effect } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';

export interface TransitionEvents {
  onBeforeEnter?: (el: any) => void;
  onEnter?: (el: any, done: () => void) => void;
  onAfterEnter?: (el: any) => void;
  onBeforeExit?: (el: any) => void;
  onExit?: (el: any, done: () => void) => void;
  onAfterExit?: (el: any) => void;
}

export interface TransitionProps<T = any> extends TransitionEvents {
  mode?: 'out-in' | 'in-out' | 'parallel';
  appear?: boolean;
  /**
   * A reactive getter returning the current item (or null).
   * Pass a getter from `createState` directly (`each: mySignal`) or wrap an
   * expression (`each: () => state()`). Transition tracks changes through this
   * getter and fires lifecycle hooks whenever the returned value changes reference.
   * Use `Show` or `For` to render the returned display list.
   */
  each: Getter<T | null>;
}

/**
 * Manages enter/exit lifecycle hooks for a single switching item.
 * Returns a reactive `Getter<T[]>` representing the items currently on screen
 * (at most 2: the entering item and/or the leaving item).
 * Compose with `Show` or `For` to render the display list.
 */
export function Transition<T = any>(props: TransitionProps<T>): Getter<T[]> {
  const [items, setItems] = createState<T[]>([]);
  let initialized = false;
  let mainEl: T | null = null;
  // Monotonically increasing token; incremented on every new transition so that
  // async completion callbacks can detect they have been superseded.
  let token = 0;

  const doEnter = (el: T, onComplete?: () => void) => {
    props.onBeforeEnter?.(el);
    queueMicrotask(() => {
      // Guard against double-invocation by the consumer.
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

  const doExit = (el: T, onDone: () => void) => {
    props.onBeforeExit?.(el);
    // Guard against double-invocation by the consumer.
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
    // props.each() is a reactive getter — MobX tracks the dependency here.
    const child = props.each();

    untracked(() => {
      if (!initialized) {
        initialized = true;
        mainEl = child;
        if (child != null) {
          setItems([child]);
          if (props.appear) {
            doEnter(child);
          }
        }
        return;
      }

      // Use Object.is for referential identity: the same item reference
      // means the item has not changed, so no transition should occur.
      if (Object.is(child, mainEl)) return;

      const prev = mainEl;
      mainEl = child;
      const mode = props.mode ?? 'parallel';
      // Capture current token before async ops; callbacks compare against it
      // to detect whether a newer transition has superseded this one.
      const currentToken = ++token;

      if (mode === 'out-in') {
        if (prev != null) {
          setItems([prev]);
          doExit(prev, () => {
            // Skip if a newer transition started while we were waiting.
            if (token !== currentToken) return;
            const next = mainEl;
            setItems(next != null ? [next] : []);
            if (next != null) doEnter(next);
          });
        } else {
          setItems(child != null ? [child] : []);
          if (child != null) doEnter(child);
        }
      } else if (mode === 'in-out') {
        if (child != null) {
          const snapshot = prev;
          const enterToken = currentToken;
          const combined: T[] = [child];
          if (snapshot != null) combined.push(snapshot);
          setItems(combined);
          doEnter(child, () => {
            // Skip exit phase if a newer transition superseded this one.
            if (token !== enterToken) return;
            if (snapshot != null) {
              doExit(snapshot, () => {
                setItems((cur) => cur.filter((i) => i !== snapshot));
              });
            }
          });
        } else {
          if (prev != null) {
            setItems([prev]);
            doExit(prev, () => setItems([]));
          } else {
            setItems([]);
          }
        }
      } else {
        // parallel mode
        const snapshot = prev;
        const newItems: T[] = [];
        if (child != null) newItems.push(child);
        if (snapshot != null) newItems.push(snapshot);
        setItems(newItems);
        if (child != null) doEnter(child);
        if (snapshot != null) {
          doExit(snapshot, () => {
            setItems((cur) => cur.filter((i) => i !== snapshot));
          });
        }
      }
    });
  });

  // Return the reactive display list directly.
  // Use Show or For to render this in your component.
  return items;
}

import { untracked } from 'mobx';
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

export interface TransitionProps extends TransitionEvents {
  mode?: 'out-in' | 'in-out' | 'parallel';
  appear?: boolean;
  /**
   * The element to transition. Typically the output of a `Show` component
   * (a reactive memo) so that Transition intercepts content switching.
   * 0-arg functions (memos) are called inside the reactive effect and their
   * dependencies tracked automatically.
   *
   * @example
   * ```ts
   * // Wrap Show — el in lifecycle hooks is the actual rendered element
   * Transition({
   *   mode: 'out-in',
   *   onEnter: (el, done) => animate(el, done),
   *   onExit:  (el, done) => animate(el, done),
   *   children: Show({ when: condition, children: viewA, fallback: viewB }),
   * });
   * ```
   */
  children?: JSX.Element;
}

/** Normalize "nothing" values (null / false / empty-array) to null. */
function toEl(raw: unknown): JSX.Element | null {
  if (raw == null || raw === false) return null;
  if (Array.isArray(raw) && raw.length === 0) return null;
  return raw as JSX.Element;
}

/**
 * Coordinates enter/exit lifecycle hooks for a single switching element.
 *
 * Use with `Show` — pass Show's output as `children` so Transition intercepts
 * content switching and fires enter/exit hooks on the actual rendered elements.
 *
 * Returns a `JSX.Element` (reactive array) representing the elements currently
 * on screen (at most 2: the entering element and/or the leaving element).
 * The renderer handles the array — no extra `For` call is needed.
 *
 * @example
 * ```ts
 * const viewA = MyViewA({});
 * const viewB = MyViewB({});
 *
 * return Transition({
 *   mode: 'out-in',
 *   onBeforeEnter: (el) => { el.alpha = 0; },
 *   onEnter: (el, done) => gsap.to(el, { alpha: 1, onComplete: done }),
 *   onExit:  (el, done) => gsap.to(el, { alpha: 0, onComplete: done }),
 *   children: Show({ when: condition, children: viewA, fallback: viewB }),
 * });
 * ```
 */
export function Transition(props: TransitionProps): JSX.Element {
  const [displayItems, setDisplayItems] = createState<JSX.Element[]>([]);
  let initialized = false;
  let mainEl: JSX.Element | null = null;
  // Monotonically increasing token; incremented on every new transition so that
  // async completion callbacks can detect they have been superseded.
  let token = 0;

  const doEnter = (el: JSX.Element, onComplete?: () => void) => {
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

  const doExit = (el: JSX.Element, onDone: () => void) => {
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
    // Resolve children:
    //   • 0-arg functions (memos / signals, e.g. Show's output) are called so
    //     MobX tracks the reactive dependency and re-runs on change.
    //   • Getter properties on props are read here and also tracked by MobX.
    //   • Static elements are used as-is.
    const raw = props.children ?? null;
    const resolved =
      typeof raw === 'function' && (raw as (...args: unknown[]) => unknown).length === 0
        ? (raw as () => unknown)()
        : raw;
    const child = toEl(resolved);

    untracked(() => {
      if (!initialized) {
        initialized = true;
        mainEl = child;
        if (child != null) {
          setDisplayItems([child]);
          if (props.appear) {
            doEnter(child);
          }
        }
        return;
      }

      // Use Object.is for referential identity: the same element reference
      // means the content has not changed, so no transition should occur.
      if (Object.is(child, mainEl)) return;

      const prev = mainEl;
      mainEl = child;
      const mode = props.mode ?? 'parallel';
      // Capture current token before async ops; callbacks compare against it
      // to detect whether a newer transition has superseded this one.
      const currentToken = ++token;

      if (mode === 'out-in') {
        if (prev != null) {
          setDisplayItems([prev]);
          doExit(prev, () => {
            // Skip if a newer transition started while we were waiting.
            if (token !== currentToken) return;
            const next = mainEl;
            setDisplayItems(next != null ? [next] : []);
            if (next != null) doEnter(next);
          });
        } else {
          setDisplayItems(child != null ? [child] : []);
          if (child != null) doEnter(child);
        }
      } else if (mode === 'in-out') {
        if (child != null) {
          const snapshot = prev;
          const enterToken = currentToken;
          const combined: JSX.Element[] = [child];
          if (snapshot != null) combined.push(snapshot);
          setDisplayItems(combined);
          doEnter(child, () => {
            // Skip exit phase if a newer transition superseded this one.
            if (token !== enterToken) return;
            if (snapshot != null) {
              doExit(snapshot, () => {
                setDisplayItems((cur) => cur.filter((i) => i !== snapshot));
              });
            }
          });
        } else {
          if (prev != null) {
            setDisplayItems([prev]);
            doExit(prev, () => setDisplayItems([]));
          } else {
            setDisplayItems([]);
          }
        }
      } else {
        // parallel mode
        const snapshot = prev;
        const newItems: JSX.Element[] = [];
        if (child != null) newItems.push(child);
        if (snapshot != null) newItems.push(snapshot);
        setDisplayItems(newItems);
        if (child != null) doEnter(child);
        if (snapshot != null) {
          doExit(snapshot, () => {
            setDisplayItems((cur) => cur.filter((i) => i !== snapshot));
          });
        }
      }
    });
  });

  // Return the reactive display list as JSX.Element.
  // The renderer handles arrays natively — during transitions up to two elements
  // (entering + leaving) are rendered simultaneously.
  return displayItems as unknown as JSX.Element;
}

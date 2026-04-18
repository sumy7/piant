import { untracked } from 'mobx';
import { effect, memo } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';
import type { TransitionEvents } from './Transition';

export interface TransitionGroupProps extends TransitionEvents {
  appear?: boolean;
  /**
   * Must be the output of a `For` or `Index` component.
   * `TransitionGroup` tracks element additions and removals from the
   * `For`/`Index` reactive output, fires lifecycle hooks, and keeps exiting
   * elements rendered until their animation (`done()`) completes.
   *
   * @example
   * ```ts
   * TransitionGroup({
   *   onBeforeEnter: (el) => { el.alpha = 0; },
   *   onEnter: (el, done) => gsap.to(el, { alpha: 1, onComplete: done }),
   *   onExit:  (el, done) => gsap.to(el, { alpha: 0, onComplete: done }),
   *   children: For({
   *     get each() { return items(); },
   *     children: (item) => ItemView({ item }),
   *   }),
   * });
   * ```
   */
  children?: JSX.Element;
}

/** Flatten a raw JSX value into a concrete element array. */
function resolveElements(raw: unknown): JSX.Element[] {
  if (raw == null || typeof raw === 'boolean') return [];
  if (
    typeof raw === 'function' &&
    (raw as (...args: unknown[]) => unknown).length === 0
  ) {
    return resolveElements((raw as () => unknown)());
  }
  if (Array.isArray(raw)) {
    const elements: JSX.Element[] = [];
    for (const item of raw as unknown[]) {
      for (const el of resolveElements(item)) {
        elements.push(el);
      }
    }
    return elements;
  }
  return [raw as JSX.Element];
}

/**
 * Wraps a `For` or `Index` component and manages enter/exit lifecycle hooks
 * for each item's rendered element.
 *
 * Pass the output of `For` (or `Index`) as `children`. `TransitionGroup`
 * intercepts element additions and removals from that reactive list, fires
 * enter/exit hooks on the actual rendered elements (e.g. Pixi containers),
 * and keeps exiting elements rendered until their `done()` is called.
 *
 * @example
 * ```ts
 * return TransitionGroup({
 *   onBeforeEnter: (el) => { el.alpha = 0; },
 *   onEnter: (el, done) => gsap.to(el, { alpha: 1, onComplete: done }),
 *   onExit:  (el, done) => gsap.to(el, { alpha: 0, onComplete: done }),
 *   children: For({
 *     get each() { return cards(); },
 *     children: (card) => CardView({ card }),
 *   }),
 * });
 * ```
 */
export function TransitionGroup(props: TransitionGroupProps): JSX.Element {
  type ExitEntry = { el: JSX.Element; id: number };

  let nextId = 0;
  // Still-exiting elements — removed from For's list but kept for animation.
  const [exitingEntries, setExitingEntries] = createState<ExitEntry[]>([]);
  let prevElements: JSX.Element[] = [];
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
    // Read For/Index output — MobX tracks the reactive dependency here.
    // For/Index return a 0-arg memo function; resolveElements unwraps it.
    const currentElements = resolveElements(props.children ?? null);

    untracked(() => {
      if (!initialized) {
        initialized = true;
        if (props.appear) {
          for (const el of currentElements) doEnter(el);
        }
        prevElements = [...currentElements];
        return;
      }

      const prevSet = new Set(prevElements);
      const currentSet = new Set(currentElements);

      const added = currentElements.filter((el) => !prevSet.has(el));
      const removed = prevElements.filter((el) => !currentSet.has(el));

      // Find elements already being exited so we don't start a duplicate exit.
      const exitingEls = new Set(exitingEntries().map((e) => e.el));

      const newExiting: ExitEntry[] = removed
        .filter((el) => !exitingEls.has(el))
        .map((el) => ({ el, id: nextId++ }));

      if (newExiting.length > 0) {
        setExitingEntries((cur) => [...cur, ...newExiting]);
        for (const entry of newExiting) {
          const exitId = entry.id;
          doExit(entry.el, () => {
            // Remove by id so that a re-added element with the same reference
            // is not accidentally removed from the display.
            setExitingEntries((cur) => cur.filter((e) => e.id !== exitId));
          });
        }
      }

      // Trigger enter hooks for newly added elements.
      for (const el of added) {
        doEnter(el);
      }

      prevElements = [...currentElements];
    });
  });

  // Return merged output: For/Index current elements + still-exiting elements.
  // Elements that have been re-added to For's list are not duplicated.
  return memo(() => {
    const current = resolveElements(props.children ?? null);
    const currentSet = new Set(current);
    const exiting = exitingEntries()
      .map((e) => e.el)
      .filter((el) => !currentSet.has(el));
    return [...current, ...exiting];
  }) as unknown as JSX.Element;
}


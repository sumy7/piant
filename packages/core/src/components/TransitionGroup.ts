import { untracked } from 'mobx';
import { effect } from '../reactivity/effects';
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
  // Explicit display list: active elements in their current order, with
  // exiting elements interleaved at their original positions.
  const [displayList, setDisplayList] = createState<JSX.Element[]>([]);
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
        setDisplayList([...currentElements]);
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
            setExitingEntries((cur) => cur.filter((e) => e.id !== exitId));
            // Only remove from display if the element is no longer active in
            // For's output. If it was re-added before the animation finished,
            // it should remain visible.
            const isActive = resolveElements(props.children ?? null).some(
              (el) => Object.is(el, entry.el),
            );
            if (!isActive) {
              setDisplayList((cur) => cur.filter((el) => el !== entry.el));
            }
          });
        }
      }

      // Rebuild the display list so that:
      //  1. Active elements appear in the order given by currentElements.
      //  2. Exiting elements stay at their original positions (relative to the
      //     active element that preceded them in the previous display list).
      // Elements that are re-active (in both currentSet and exitingEls) are
      // treated purely as active and are NOT included in allExiting.
      const allExiting = new Set(
        [...exitingEls, ...newExiting.map((e) => e.el)].filter(
          (el) => !currentSet.has(el),
        ),
      );

      if (allExiting.size === 0) {
        setDisplayList([...currentElements]);
      } else {
        const prevDisplay = displayList();

        // For each exiting element, find the last active element that appeared
        // before it in prevDisplay ("insert-after anchor"). If none exists, the
        // element goes to the front of the list.
        const noAnchor: JSX.Element[] = [];
        const anchoredAfter = new Map<JSX.Element, JSX.Element>();

        for (const exitEl of allExiting) {
          const prevIdx = prevDisplay.indexOf(exitEl);
          let insertAfter: JSX.Element | null = null;
          for (let i = prevIdx - 1; i >= 0; i--) {
            if (currentSet.has(prevDisplay[i])) {
              insertAfter = prevDisplay[i];
              break;
            }
          }
          if (insertAfter === null) {
            noAnchor.push(exitEl);
          } else {
            anchoredAfter.set(exitEl, insertAfter);
          }
        }

        // Start with active elements in their current order.
        const result: JSX.Element[] = [...currentElements];

        // Insert anchored exiting elements immediately after their anchor.
        for (const [exitEl, anchor] of anchoredAfter.entries()) {
          const anchorIdx = result.indexOf(anchor);
          result.splice(
            anchorIdx === -1 ? result.length : anchorIdx + 1,
            0,
            exitEl,
          );
        }

        // Insert no-anchor exiting elements at the beginning, preserving their
        // relative order (process in reverse so unshift keeps them in order).
        for (let i = noAnchor.length - 1; i >= 0; i--) {
          result.unshift(noAnchor[i]);
        }

        setDisplayList(result);
      }

      // Trigger enter hooks for newly added elements.
      for (const el of added) {
        doEnter(el);
      }

      prevElements = [...currentElements];
    });
  });

  // Return the explicit display list as a reactive JSX.Element.
  // The renderer reads this getter and reconciles the DOM on each change.
  return displayList as unknown as JSX.Element;
}


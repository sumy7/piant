import {
  createEffect,
  createState,
  type Getter,
  onCleanup,
  type PNode,
  untrack,
} from '@piant/core';
import { getFocusScope } from '../../primitives/focusScope';
import {
  createOverlayAnchor,
  type OverlayAnchor,
} from '../../primitives/overlayAnchor';

export interface AnchoredTrigger {
  node: PNode;
  element: HTMLElement;
  anchor: OverlayAnchor;
  available: Getter<boolean>;
  refresh(): void;
  invalidate(): void;
  containsEvent(event?: Event): boolean;
}

/** One current Button trigger, including its geometry and semantic proxy. */
export function createTriggerSlot(onUnavailable: () => void) {
  const focus = getFocusScope();
  const [revision, setRevision] = createState(0);
  let current: AnchoredTrigger | undefined;
  return {
    current: () => {
      revision();
      return current;
    },
    bind(node: PNode, unavailable: () => boolean): AnchoredTrigger {
      if (current) throw new Error('An anchored popup supports one Trigger.');
      const entry = focus.entries.find((entry) => entry.node === node);
      if (!entry)
        throw new Error('An anchored popup requires a focusable Button.');
      const anchor = createOverlayAnchor(node);
      const [available, setAvailable] = createState(false);
      let disposed = false;
      const valid = () =>
        !disposed && !unavailable() && anchor.available && entry.available();
      const binding: AnchoredTrigger = {
        node,
        element: entry.binding.element,
        anchor,
        available: () => available() && valid(),
        refresh() {
          if (disposed) return;
          const next = valid();
          const previous = available();
          setAvailable(next);
          if (previous && !next) onUnavailable();
        },
        invalidate() {
          if (!disposed && available()) {
            setAvailable(false);
            onUnavailable();
          }
        },
        containsEvent(event) {
          if (!event) return false;
          if (
            event.target instanceof Node &&
            entry.binding.element.contains(event.target)
          )
            return true;
          if (!('clientX' in event) || !('clientY' in event)) return false;
          const pointer = event as MouseEvent;
          const rect = anchor.element.getBoundingClientRect();
          return (
            pointer.clientX >= rect.left &&
            pointer.clientX <= rect.right &&
            pointer.clientY >= rect.top &&
            pointer.clientY <= rect.bottom
          );
        },
      };
      current = binding;
      setRevision((value) => value + 1);
      const stop = anchor.observe(() => untrack(binding.refresh));
      createEffect(() => {
        void unavailable();
        void focus.focused();
        untrack(binding.refresh);
      });
      onCleanup(() => {
        disposed = true;
        stop();
        if (current === binding) {
          current = undefined;
          setRevision((value) => value + 1);
          onUnavailable();
        }
      });
      return binding;
    },
  };
}

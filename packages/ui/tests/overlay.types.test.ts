import type { Getter, PNode } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  computeOverlayPosition,
  createOverlay,
  createOverlayAnchor,
  type OverlayAnchor,
  type OverlayDismissReason,
  OverlayHost,
  type OverlayOptions,
  type OverlayPlacement,
  type OverlayPosition,
  type OverlayState,
} from '../dist/index.js';

it('exports complete overlay, anchor and positioning contracts', () => {
  const check = (node: PNode, element: HTMLElement, state: OverlayState) => {
    const anchor: OverlayAnchor = createOverlayAnchor(node);
    expectTypeOf(anchor.element).toEqualTypeOf<HTMLElement>();
    expectTypeOf(anchor.available).toEqualTypeOf<boolean>();
    expectTypeOf(anchor.observe(() => {})).toEqualTypeOf<() => void>();
    expectTypeOf(state.open).toEqualTypeOf<Getter<boolean>>();
    expectTypeOf(state.ready()).toEqualTypeOf<boolean>();
    expectTypeOf(state.error()).toEqualTypeOf<unknown>();
    expectTypeOf(state.position()).toEqualTypeOf<OverlayPosition | undefined>();
    expectTypeOf(state.element()).toEqualTypeOf<HTMLElement | undefined>();
    OverlayHost({ target: element });
    OverlayHost({});
    const options: OverlayOptions = {
      width: 200,
      height: 100,
      anchor,
      open: false,
      defaultOpen: true,
      modal: true,
      outsidePointer: 'block',
      placement: 'right-end',
      gap: 4,
      padding: 8,
      flip: true,
      shift: true,
      autoFocus: true,
      restoreFocus: true,
      dismissOnEscape: true,
      onDismiss(reason, event) {
        expectTypeOf(reason).toEqualTypeOf<OverlayDismissReason>();
        expectTypeOf(event).toEqualTypeOf<Event | undefined>();
        return false;
      },
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
      children(overlay) {
        expectTypeOf(overlay).toEqualTypeOf<OverlayState>();
      },
    };
    createOverlay(options);
    createOverlay({ ...options, anchor: element });
    // @ts-expect-error Surface dimensions are required.
    createOverlay({ children: () => undefined });
    // @ts-expect-error Outside behavior uses the documented policy union.
    createOverlay({ ...options, outsidePointer: 'close-all' });
    // @ts-expect-error Placement does not accept arbitrary strings.
    const invalid: OverlayPlacement = 'diagonal';
    void invalid;
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expectTypeOf(
      computeOverlayPosition(rect, rect, rect),
    ).toEqualTypeOf<OverlayPosition>();
  };
  expectTypeOf(check).toBeFunction();
});

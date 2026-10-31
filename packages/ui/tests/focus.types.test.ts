import type { DOMElementBinding, PNode } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  createFocusable,
  type FocusableState,
  type UIFocusScope,
} from '../dist/index.js';

it('exports focus handles and keeps native disabled ownership on Input', () => {
  const check = (
    node: PNode,
    binding: DOMElementBinding,
    state: FocusableState,
    scope: UIFocusScope,
  ) => {
    createFocusable(node, {
      name: 'Canvas action',
      disabled: false,
      onActivate(event, target) {
        expectTypeOf(event).toEqualTypeOf<MouseEvent>();
        expectTypeOf(target).toEqualTypeOf<PNode>();
      },
    });
    createFocusable(node, { name: 'Native input', domElement: binding });
    // @ts-expect-error Native disabled state belongs to Input.disabled.
    createFocusable(node, {
      name: 'Native',
      domElement: binding,
      disabled: true,
    });
    // @ts-expect-error Every registration requires an accessible name.
    createFocusable(node, {});
    expectTypeOf(state.focus()).toEqualTypeOf<boolean>();
    expectTypeOf(state.focusVisible()).toEqualTypeOf<boolean>();
    expectTypeOf(scope.focused()).toEqualTypeOf<HTMLElement | null>();
  };
  expectTypeOf(check).toBeFunction();
});

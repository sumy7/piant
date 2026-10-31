import type { PixiEventHandler, PNode } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  createControllableState,
  createPressable,
  type PressableState,
} from '../dist/index.js';

it('exports typed state setters and pointer callbacks through the public root', () => {
  const [checked, setChecked] = createControllableState({
    defaultValue: false,
  });
  expectTypeOf(checked()).toEqualTypeOf<boolean>();
  expectTypeOf(setChecked(true)).toEqualTypeOf<boolean>();
  const errors = (node: PNode, state: PressableState) => {
    const onPress: PixiEventHandler<PNode, 'pointerup'> = (event, target) => {
      expectTypeOf(event.pointerId).toBeNumber();
      expectTypeOf(target).toEqualTypeOf<PNode>();
    };
    createPressable(node, { onPress });
    // @ts-expect-error State values cannot change type through the setter.
    setChecked('yes');
    // @ts-expect-error Every uncontrolled state has an explicit initial fallback.
    createControllableState({ value: 1 });
    // @ts-expect-error A disabled flag is boolean, not a string.
    createPressable(node, { disabled: 'true' });
    // @ts-expect-error Callers cannot replace state accessors.
    state.pressed = () => true;
  };
  expectTypeOf(errors).toBeFunction();
});

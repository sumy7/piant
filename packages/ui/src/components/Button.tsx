import type { View } from '@piant/core';
import { type ButtonOptions, createButton } from './internal/createButton';

export type {
  ButtonIconContext,
  ButtonPressEvent,
  ButtonSize,
  ButtonVariant,
} from './internal/createButton';

export type ButtonProps = ButtonOptions &
  (
    | { children: string | number; name?: string }
    | { children?: Parameters<typeof View>[0]['children']; name: string }
  );

/** A named Canvas button; custom content requires an explicit accessible name. */
export function Button(props: ButtonProps): ReturnType<typeof View> {
  return createButton(props, false);
}

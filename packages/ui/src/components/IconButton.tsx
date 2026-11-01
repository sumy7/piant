import type { View } from '@piant/core';
import { type ButtonOptions, createButton } from './internal/createButton';

export type IconButtonProps = Omit<ButtonOptions, 'textStyle' | 'icon'> & {
  name: string;
  icon: NonNullable<ButtonOptions['icon']>;
};

/** An icon-only button with a required accessible name and a square default box. */
export function IconButton(props: IconButtonProps): ReturnType<typeof View> {
  return createButton(props, true);
}

import type { View } from '@piant/core';
import {
  type CheckableOptions,
  createCheckable,
} from './internal/createCheckable';

export type ToggleSwitchProps = CheckableOptions<boolean>;

/** A labelled boolean switch with the same controlled state contract as Checkbox. */
export function ToggleSwitch(
  props: ToggleSwitchProps,
): ReturnType<typeof View> {
  return createCheckable(props, 'switch');
}

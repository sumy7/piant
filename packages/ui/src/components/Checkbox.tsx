import type { View } from '@piant/core';
import {
  type CheckableOptions,
  createCheckable,
} from './internal/createCheckable';

export type CheckboxProps = CheckableOptions<boolean | 'mixed'>;

/** A labelled checkbox; activating mixed requests true. */
export function Checkbox(props: CheckboxProps): ReturnType<typeof View> {
  return createCheckable(props, 'checkbox');
}

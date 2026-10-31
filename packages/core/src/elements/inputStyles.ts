import type { ViewStyles } from './layout/viewStyles';
import type { TextLayoutStyle } from './text/types';

/** Native input typography in logical pixels, composed with Yoga/Canvas styles. */
export type InputStyles = ViewStyles &
  Partial<
    Pick<
      TextLayoutStyle,
      | 'fontFamily'
      | 'fontSize'
      | 'fontWeight'
      | 'fontStyle'
      | 'lineHeight'
      | 'letterSpacing'
      | 'color'
    >
  > & {
    caretColor?: string;
    textAlign?: 'left' | 'right' | 'center' | 'start' | 'end';
  };

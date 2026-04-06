import type { ViewStyles } from '../layout/viewStyles';
import type { TextLayoutStyle } from './index';

export type TextStyles = ViewStyles & Partial<TextLayoutStyle>;

export const DEFAULT_BLOCK_PROPS: TextStyles = {
  boxSizing: 'border-box',
};

export const DEFAULT_INLINE_PROPS: TextStyles = {
  fontSize: 16,
  color: '#000000',
  lineHeight: 20,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  letterSpacing: 0,
  textTransform: 'none',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  textAlign: 'left',
};

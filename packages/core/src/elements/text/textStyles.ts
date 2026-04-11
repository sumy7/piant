import type { ViewStyles } from '../layout/viewStyles';
import type { TextLayoutStyle } from './index';

/**
 * Full style capability set for text-rendering components.
 * Combines layout (`ViewStyles`) with optional text-specific properties
 * (`TextLayoutStyle`).
 */
export type TextStyles = ViewStyles & Partial<TextLayoutStyle>;

/**
 * Primary public style type for the `Text` component (and similar text-rendering
 * components such as `TextView`).
 *
 * - `TextStyles` describes the **full style capability set** — all layout,
 *   visual, and text-specific properties that are accepted.
 * - `TextViewStyles` is a **semantic alias** intended for component prop
 *   declarations: when typing a `style` prop for a text component, prefer
 *   `TextViewStyles` to make the intent explicit at the call site.
 *
 * Both types are identical; `TextViewStyles` is purely a semantic alias.
 */
export type TextViewStyles = TextStyles;

export const DEFAULT_BLOCK_PROPS: TextStyles = {
  boxSizing: 'border-box',
};

export const DEFAULT_INLINE_PROPS: TextStyles = {
  fontSize: 16,
  color: '#000000',
  lineHeight: 20,
  verticalAlign: 'baseline',
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  letterSpacing: 0,
  textTransform: 'none',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  textAlign: 'left',
};

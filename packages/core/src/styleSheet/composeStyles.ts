import type { ViewStyles } from '../elements/layout/viewStyles';

export default function composeStyles(
  style1?: Record<string, ViewStyles>,
  style2?: Record<string, ViewStyles>,
):
  | Record<string, ViewStyles>
  | Record<string, ViewStyles>[]
  | ViewStyles
  | undefined {
  if (!style1) {
    return style2;
  }
  if (!style2) {
    return style1;
  }
  return [style1, style2];
}

import {
  CustomView,
  Image,
  type StyleValue,
  type ViewStyles,
} from '@piant/core';
import { useUITheme } from '../theme/UIProvider';
import { displaySemantics } from './internal/displaySemantics';
import { nonnegative } from './internal/motion';

type Draw = NonNullable<Parameters<typeof CustomView>[0]['onDraw']>;
export type IconDraw = (...args: [...Parameters<Draw>, color: string]) => void;
type IconBase = {
  /** Square default size in logical pixels; style width/height may override it. */
  size?: number;
  style?: StyleValue<ViewStyles>;
  label?: string;
};
export type IconProps = IconBase &
  (
    | {
        src: Parameters<typeof Image>[0]['src'];
        draw?: never;
        color?: never;
        ref?: Parameters<typeof Image>[0]['ref'];
      }
    | {
        draw: IconDraw;
        src?: never;
        color?: string;
        ref?: Parameters<typeof CustomView>[0]['ref'];
      }
  );

/** Mode is fixed at creation. Assets stay caller-owned; drawing belongs to this node. */
export function Icon(
  props: IconProps,
): ReturnType<typeof Image> | ReturnType<typeof CustomView> {
  const theme = useUITheme();
  const style = () => [
    {
      width: nonnegative(props.size ?? 24, 24),
      height: nonnegative(props.size ?? 24, 24),
      flexShrink: 0,
    },
    props.style,
  ];
  const node =
    props.src !== undefined
      ? Image({
          ref: props.ref as Parameters<typeof Image>[0]['ref'],
          get src() {
            return props.src as Parameters<typeof Image>[0]['src'];
          },
          get style(): StyleValue<ViewStyles> {
            return style();
          },
        })
      : CustomView({
          ref: props.ref as Parameters<typeof CustomView>[0]['ref'],
          get style(): StyleValue<ViewStyles> {
            return style();
          },
          onDraw(graphics, width, height) {
            if (graphics.destroyed) return;
            graphics.clear();
            props.draw?.(
              graphics,
              width,
              height,
              props.color ?? theme().colors.text,
            );
          },
        });
  displaySemantics(node, () => ({ role: 'img', 'aria-label': props.label }));
  return node;
}

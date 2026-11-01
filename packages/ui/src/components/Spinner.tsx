import { CustomView, type StyleValue, type ViewStyles } from '@piant/core';
import { useUITheme } from '../theme/UIProvider';
import { displaySemantics } from './internal/displaySemantics';
import { motionPhase, nonnegative } from './internal/motion';

export interface SpinnerProps {
  size?: number;
  thickness?: number;
  color?: string;
  /** An optional non-focusable status name. Omit for decorative loading feedback. */
  label?: string;
  active?: boolean;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof CustomView>[0]['ref'];
}

export function Spinner(props: SpinnerProps): ReturnType<typeof CustomView> {
  const theme = useUITheme();
  let phase = () => 0;
  const node = CustomView({
    ref: props.ref,
    get style(): StyleValue<ViewStyles> {
      return [
        {
          width: nonnegative(props.size ?? theme().typography.lineHeight),
          height: nonnegative(props.size ?? theme().typography.lineHeight),
          flexShrink: 0,
        },
        props.style,
      ];
    },
    onDraw(graphics, width, height) {
      if (graphics.destroyed) return;
      const side = Math.min(width, height);
      const thickness = Math.min(side / 2, nonnegative(props.thickness ?? 2));
      const start = phase() * Math.PI * 2 - Math.PI / 2;
      graphics.clear();
      if (side <= 0 || thickness <= 0) return;
      graphics
        .arc(
          width / 2,
          height / 2,
          (side - thickness) / 2,
          start,
          start + Math.PI * 1.5,
        )
        .stroke({
          width: thickness,
          color: props.color ?? theme().colors.primary,
          cap: 'round',
        });
    },
  });
  phase = motionPhase(node, () =>
    props.active === false || theme().reducedMotion
      ? 0
      : theme().motion.slow * 4,
  );
  displaySemantics(node, () => ({ role: 'status', 'aria-label': props.label }));
  return node;
}

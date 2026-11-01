import { CustomView, type StyleValue, type ViewStyles } from '@piant/core';
import { useUITheme } from '../theme/UIProvider';
import { displaySemantics } from './internal/displaySemantics';
import { motionPhase, nonnegative } from './internal/motion';

export interface ProgressBarProps {
  min?: number;
  max?: number;
  value?: number;
  indeterminate?: boolean;
  thickness?: number;
  label?: string;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof CustomView>[0]['ref'];
}

export function ProgressBar(
  props: ProgressBarProps,
): ReturnType<typeof CustomView> {
  const theme = useUITheme();
  const range = () => {
    const min = Number.isFinite(props.min) ? (props.min as number) : 0;
    const max = Number.isFinite(props.max) ? (props.max as number) : 100;
    const input = props.value ?? 0;
    const value = Number.isFinite(input) ? input : min;
    const now = max > min ? Math.max(min, Math.min(max, value)) : min;
    const span = max - min;
    const ratio =
      max <= min
        ? 0
        : Number.isFinite(span)
          ? (now - min) / span
          : (now / 2 - min / 2) / (max / 2 - min / 2);
    return { min, max, now, ratio };
  };
  let phase = () => 0;
  const node = CustomView({
    ref: props.ref,
    get style(): StyleValue<ViewStyles> {
      return [
        {
          width: '100%',
          height: nonnegative(props.thickness ?? 6),
          flexShrink: 0,
        },
        props.style,
      ];
    },
    onDraw(graphics, width, height) {
      if (graphics.destroyed) return;
      const current = range();
      const band = props.indeterminate ? width / 3 : width * current.ratio;
      const x = props.indeterminate
        ? ((width - band) * (1 - Math.cos(phase() * Math.PI * 2))) / 2
        : 0;
      graphics.clear();
      if (width <= 0 || height <= 0) return;
      graphics
        .roundRect(0, 0, width, height, height / 2)
        .fill(theme().colors.surfaceRaised);
      if (band > 0)
        graphics
          .roundRect(x, 0, band, height, Math.min(height / 2, band / 2))
          .fill(theme().colors.primary);
    },
  });
  phase = motionPhase(node, () =>
    !props.indeterminate || theme().reducedMotion ? 0 : theme().motion.slow * 4,
  );
  displaySemantics(node, () => {
    const current = range();
    const valid = current.max > current.min;
    return {
      role: 'progressbar',
      'aria-label': props.label,
      'aria-valuemin': valid ? current.min : 0,
      'aria-valuemax': valid ? current.max : 100,
      'aria-valuenow': props.indeterminate
        ? undefined
        : valid
          ? current.now
          : 0,
    };
  });
  return node;
}

import { View, type ViewStyles } from '@piant/core';
import { useUITheme } from '../theme/UIProvider';

export interface SeparatorProps extends Pick<
  Parameters<typeof View>[0],
  'ref' | 'style'
> {
  orientation?: 'horizontal' | 'vertical';
  /** Finite nonnegative logical pixels. Invalid values resolve to 1. */
  thickness?: number;
  /** Horizontal width or vertical height; vertical defaults to cross-axis stretch. */
  length?: ViewStyles['width'];
}

/** Decorative rule with no keyboard stop. Caller style overrides geometry/colors. */
export function Separator(props: SeparatorProps): ReturnType<typeof View> {
  const theme = useUITheme();
  const thickness = () => {
    const value = props.thickness ?? 1;
    return Number.isFinite(value) && value >= 0 ? value : 1;
  };
  const geometry = (): ViewStyles =>
    props.orientation === 'vertical'
      ? { width: thickness(), height: props.length, alignSelf: 'stretch' }
      : { height: thickness(), width: props.length ?? '100%' };
  return (
    <View
      ref={(node) => props.ref?.(node)}
      style={[
        {
          ...geometry(),
          flexShrink: 0,
          backgroundColor: theme().colors.border,
        },
        props.style,
      ]}
    />
  );
}

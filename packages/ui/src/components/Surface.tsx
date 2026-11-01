import { View } from '@piant/core';
import type { ThemeTokens } from '../theme/tokens';
import { useUITheme } from '../theme/UIProvider';

export interface SurfaceProps extends Pick<
  Parameters<typeof View>[0],
  'children' | 'ref' | 'style'
> {
  tone?: 'surface' | 'raised' | 'canvas';
  padding?: number | keyof ThemeTokens['spacing'];
  radius?: number | keyof ThemeTokens['radius'];
  bordered?: boolean;
}

/** A themed View. Caller style overrides defaults; overflow remains visible. */
export function Surface(props: SurfaceProps): ReturnType<typeof View> {
  const theme = useUITheme();
  const background = () => {
    const colors = theme().colors;
    return props.tone === 'raised'
      ? colors.surfaceRaised
      : props.tone === 'canvas'
        ? colors.canvas
        : colors.surface;
  };
  return (
    <View
      ref={(node) => props.ref?.(node)}
      style={[
        {
          backgroundColor: background(),
          borderColor: theme().colors.border,
          borderWidth: props.bordered ? 1 : 0,
          borderRadius:
            typeof props.radius === 'number'
              ? props.radius
              : theme().radius[props.radius ?? 'md'],
          padding:
            typeof props.padding === 'number'
              ? props.padding
              : theme().spacing[props.padding ?? 'md'],
          minWidth: 0,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

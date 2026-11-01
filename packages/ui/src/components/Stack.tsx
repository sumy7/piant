import { View, type ViewStyles } from '@piant/core';
import type { ThemeTokens } from '../theme/tokens';
import { useUITheme } from '../theme/UIProvider';

export interface StackProps extends Pick<
  Parameters<typeof View>[0],
  'children' | 'ref' | 'style'
> {
  direction?: ViewStyles['flexDirection'];
  /** Logical pixels or a density-aware spacing token. Defaults to md. */
  gap?: number | keyof ThemeTokens['spacing'];
  align?: ViewStyles['alignItems'];
  justify?: ViewStyles['justifyContent'];
  wrap?: boolean;
}

/** A single View flex container. Caller style overrides all layout defaults. */
export function Stack(props: StackProps): ReturnType<typeof View> {
  const theme = useUITheme();
  return (
    <View
      ref={(node) => props.ref?.(node)}
      style={[
        {
          flexDirection: props.direction ?? 'column',
          gap:
            typeof props.gap === 'number'
              ? props.gap
              : theme().spacing[props.gap ?? 'md'],
          alignItems: props.align ?? 'stretch',
          justifyContent: props.justify ?? 'flex-start',
          flexWrap: props.wrap ? 'wrap' : 'nowrap',
          minWidth: 0,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

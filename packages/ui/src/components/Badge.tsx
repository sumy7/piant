import { Text, type TextProps, View } from '@piant/core';
import { useUITheme } from '../theme/UIProvider';

export interface BadgeProps extends Pick<
  Parameters<typeof View>[0],
  'ref' | 'style'
> {
  children?: string | number;
  tone?: 'neutral' | 'primary' | 'danger';
  /** Overrides the measured label's typography and truncation defaults. */
  textStyle?: TextProps['style'];
}

/** A padded pill with a core Text label, truncated to one line when constrained. */
export function Badge(props: BadgeProps): ReturnType<typeof View> {
  const theme = useUITheme();
  const colors = () => {
    const palette = theme().colors;
    switch (props.tone) {
      case 'primary':
        return { backgroundColor: palette.primary, color: palette.onPrimary };
      case 'danger':
        return { backgroundColor: palette.danger, color: palette.onDanger };
      default:
        return { backgroundColor: palette.surfaceRaised, color: palette.text };
    }
  };
  const label = () => props.children ?? '';
  return (
    <View
      ref={(node) => props.ref?.(node)}
      style={[
        {
          backgroundColor: colors().backgroundColor,
          paddingBlock: theme().spacing.xs,
          paddingInline: theme().spacing.sm,
          borderRadius: theme().radius.pill,
          alignSelf: 'flex-start',
          maxWidth: '100%',
          minWidth: 0,
          flexShrink: 1,
          overflow: 'hidden',
        },
        props.style,
      ]}
    >
      <Text
        style={[
          {
            color: colors().color,
            fontFamily: theme().typography.fontFamily,
            fontSize: theme().typography.smallFontSize,
            lineHeight: theme().typography.smallLineHeight,
            minWidth: 0,
            flexShrink: 1,
            whiteSpace: 'nowrap',
            lineClamp: 1,
            textOverflow: 'ellipsis',
          },
          props.textStyle,
        ]}
      >
        {label()}
      </Text>
    </View>
  );
}

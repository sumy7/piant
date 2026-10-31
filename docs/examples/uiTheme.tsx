import { createState, Text, View } from '@piant/core';
import { UIProvider, useUITheme } from '@piant/ui';

function Content(props: { toggle: () => void }) {
  const theme = useUITheme();
  const label = () =>
    `${theme().colorMode} / ${theme().density} / ${theme().typography.fontSize}px`;
  return (
    <View
      style={{
        padding: theme().spacing.md,
        backgroundColor: theme().colors.canvas,
        width: '100%',
      }}
    >
      <Text
        style={{
          fontFamily: theme().typography.fontFamily,
          fontSize: theme().typography.fontSize,
          lineHeight: theme().typography.lineHeight,
          color: theme().colors.text,
        }}
      >
        {label()}
      </Text>
      <View
        onClick={props.toggle}
        style={{
          marginTop: theme().spacing.sm,
          padding: theme().spacing.sm,
          borderRadius: theme().radius.md,
          backgroundColor: theme().colors.primary,
        }}
      >
        <Text
          style={{
            color: theme().colors.onPrimary,
            fontSize: theme().typography.fontSize,
            lineHeight: theme().typography.lineHeight,
          }}
        >
          切换明暗、密度和字号
        </Text>
      </View>
    </View>
  );
}

export default function UIThemeExample() {
  const [large, setLarge] = createState(false);
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
    >
      {() => <Content toggle={() => setLarge((value) => !value)} />}
    </UIProvider>
  );
}

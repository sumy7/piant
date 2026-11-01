import { createState, Text, View } from '@piant/core';
import { Stack, Surface, UIProvider, useUITheme } from '@piant/ui';

function Preview(props: { toggle: () => void }) {
  const theme = useUITheme();
  const label = () =>
    `${theme().colorMode} / ${theme().density}；点击切换主题、密度与字号`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <View onClick={props.toggle} style={{ padding: theme().spacing.sm }}>
        <Text
          style={{
            color: theme().colors.text,
            fontSize: theme().typography.fontSize,
            lineHeight: theme().typography.lineHeight,
          }}
        >
          {label()}
        </Text>
      </View>
      <Stack gap="sm">
        <Surface bordered>
          <Text style={{ color: theme().colors.text }}>
            surface：带边框的内容区域
          </Text>
        </Surface>
        <Surface tone="raised" radius="lg">
          <Text style={{ color: theme().colors.text }}>raised：层次与圆角</Text>
        </Surface>
      </Stack>
    </Surface>
  );
}

export default function UISurfaceExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider
      colorMode={dark() ? 'dark' : 'light'}
      density={dark() ? 'compact' : 'comfortable'}
      fontScale={dark() ? 2 : 1}
    >
      {() => <Preview toggle={() => setDark((value) => !value)} />}
    </UIProvider>
  );
}

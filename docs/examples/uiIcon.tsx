import { createState, Text, View } from '@piant/core';
import { Icon, Stack, Surface, UIProvider, useUITheme } from '@piant/ui';

function Preview() {
  const theme = useUITheme();
  const [large, setLarge] = createState(false);
  const label = () => (large() ? '48px；点击缩小' : '24px；点击放大');
  return (
    <Surface style={{ width: '100%', height: '100%' }}>
      <View onClick={() => setLarge((value) => !value)} style={{ padding: 8 }}>
        <Text>{label()}</Text>
      </View>
      <Stack direction="row" align="center">
        <Icon
          size={large() ? 48 : 24}
          color={theme().colors.primary}
          label="勾选图标"
          draw={(graphics, width, height, color) => {
            graphics
              .moveTo(width * 0.15, height * 0.5)
              .lineTo(width * 0.4, height * 0.75)
              .lineTo(width * 0.85, height * 0.2)
              .stroke({ color, width: Math.min(width, height) / 10 });
          }}
        />
        <Icon
          size={large() ? 48 : 24}
          color={theme().colors.danger}
          label="菱形图标"
          draw={(graphics, width, height, color) => {
            graphics
              .poly([
                width / 2,
                0,
                width,
                height / 2,
                width / 2,
                height,
                0,
                height / 2,
              ])
              .fill(color);
          }}
        />
      </Stack>
    </Surface>
  );
}

export default function UIIconExample() {
  return <UIProvider>{() => <Preview />}</UIProvider>;
}

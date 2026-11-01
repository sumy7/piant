import { createState, Text, View } from '@piant/core';
import { Badge, Stack, Surface, UIProvider, useUITheme } from '@piant/ui';

function Preview(props: { toggle: () => void }) {
  const theme = useUITheme();
  const [count, setCount] = createState(9);
  const countLabel = () => `通知 ${count()}`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <View onClick={props.toggle} style={{ padding: 8 }}>
        <Text style={{ color: theme().colors.text }}>
          点击切换明暗、密度与 200% 字号
        </Text>
      </View>
      <View
        onClick={() => setCount((value) => value + 10)}
        style={{ padding: 8 }}
      >
        <Text style={{ color: theme().colors.text }}>点击增加通知数量</Text>
      </View>
      <Stack direction="row" align="flex-start" wrap gap="sm">
        <Badge>默认</Badge>
        <Badge tone="primary">{countLabel()}</Badge>
        <Badge tone="danger" style={{ maxWidth: 120 }}>
          需要检查的较长状态文字
        </Badge>
      </Stack>
    </Surface>
  );
}

export default function UIBadgeExample() {
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

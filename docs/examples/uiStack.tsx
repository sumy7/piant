import { createState, Text, View } from '@piant/core';
import { Stack, Surface, UIProvider } from '@piant/ui';

export default function UIStackExample() {
  const [row, setRow] = createState(true);
  const label = () =>
    row() ? '横向排列；点击切换为纵向' : '纵向排列；点击切换为横向';
  return (
    <UIProvider>
      {() => (
        <Surface style={{ width: '100%', height: '100%' }}>
          <View
            onClick={() => setRow((value) => !value)}
            style={{ padding: 8 }}
          >
            <Text>{label()}</Text>
          </View>
          <Stack
            direction={row() ? 'row' : 'column'}
            gap="sm"
            wrap
            style={{ width: '100%' }}
          >
            <Surface tone="raised" padding="sm">
              <Text>第一项</Text>
            </Surface>
            <Surface tone="raised" padding="sm">
              <Text>第二项</Text>
            </Surface>
            <Surface tone="raised" padding="sm">
              <Text>第三项</Text>
            </Surface>
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

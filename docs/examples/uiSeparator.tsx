import { createState, Text, View } from '@piant/core';
import { Separator, Stack, Surface, UIProvider } from '@piant/ui';

export default function UISeparatorExample() {
  const [vertical, setVertical] = createState(false);
  const label = () =>
    vertical() ? '纵向分隔；点击切换' : '横向分隔；点击切换';
  return (
    <UIProvider>
      {() => (
        <Surface style={{ width: '100%', height: '100%' }}>
          <View
            onClick={() => setVertical((value) => !value)}
            style={{ padding: 8 }}
          >
            <Text>{label()}</Text>
          </View>
          <Stack
            direction={vertical() ? 'row' : 'column'}
            style={{ width: '100%', height: 140 }}
          >
            <Text>区域 A</Text>
            <Separator
              orientation={vertical() ? 'vertical' : 'horizontal'}
              thickness={2}
            />
            <Text>区域 B</Text>
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

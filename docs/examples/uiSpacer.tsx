import { createState } from '@piant/core';
import { Badge, Button, Spacer, Stack, Surface, UIProvider } from '@piant/ui';

export default function UISpacerExample() {
  const [size, setSize] = createState(20);
  const label = () => `固定间距 ${size()}px；点击增加`;
  return (
    <UIProvider>
      {() => (
        <Surface style={{ width: '100%', height: '100%' }}>
          <Stack gap="md" style={{ width: '100%' }}>
            <Button
              variant="secondary"
              onPress={() =>
                setSize((previous) => (previous >= 100 ? 0 : previous + 20))
              }
            >
              {label()}
            </Button>
            <Stack
              direction="row"
              align="center"
              gap={0}
              style={{ width: '100%', minHeight: 44 }}
            >
              <Badge>A</Badge>
              <Spacer size={size()} />
              <Badge>B</Badge>
            </Stack>
            <Stack
              direction="row"
              align="center"
              gap={0}
              style={{ width: '100%', minHeight: 44 }}
            >
              <Badge>左侧</Badge>
              <Spacer />
              <Badge>右侧</Badge>
            </Stack>
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

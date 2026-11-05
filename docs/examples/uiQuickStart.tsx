import { createState } from '@piant/core';
import { Button, Stack, Surface, UIProvider } from '@piant/ui';

export default function App() {
  const [saved, setSaved] = createState(false);
  const label = () => (saved() ? '已保存' : '保存设置');

  return (
    <UIProvider>
      {() => (
        <Surface bordered style={{ width: '100%', height: '100%' }}>
          <Stack direction="row" align="center" justify="center" wrap>
            <Button onPress={() => setSaved(true)}>{label()}</Button>
            <Button variant="secondary" onPress={() => setSaved(false)}>
              重置
            </Button>
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

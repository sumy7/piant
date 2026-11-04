import { createState, Show } from '@piant/core';
import { Button, Stack, UIProvider } from '@piant/ui';
import { ToolPanel } from '../../examples/ui-gallery/src/ToolPanel';

export default function UIToolPanelExample() {
  const [dark, setDark] = createState(false);
  const [mounted, setMounted] = createState(true);
  const [narrow, setNarrow] = createState(false);
  const mountLabel = () => (mounted() ? '卸载工具面板' : '重新挂载工具面板');
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
          <Stack direction="row" wrap gap="sm">
            <Button size="sm" onPress={() => setDark((v) => !v)}>
              切换工具面板外观
            </Button>
            <Button size="sm" onPress={() => setNarrow((v) => !v)}>
              切换工具面板宽度
            </Button>
            <Button size="sm" onPress={() => setMounted((v) => !v)}>
              {mountLabel()}
            </Button>
          </Stack>
          <Show when={mounted()}>
            {() => (
              <Stack style={{ width: narrow() ? 300 : '100%', flexGrow: 1 }}>
                <ToolPanel
                  name="示例"
                  colorMode={dark() ? 'dark' : 'light'}
                  density={dark() ? 'compact' : 'comfortable'}
                  fontScale={dark() ? 2 : 1}
                />
              </Stack>
            )}
          </Show>
        </Stack>
      )}
    </UIProvider>
  );
}

import { createState, Show } from '@piant/core';
import { Button, Stack, UIProvider } from '@piant/ui';
import { ColorEditorPanel } from '../../examples/ui-gallery/src/ColorEditorPanel';
export default function UIColorPickerExample() {
  const [large, setLarge] = createState(false),
    [mounted, setMounted] = createState(true);
  const mountLabel = () => (mounted() ? '卸载颜色编辑器' : '重挂载颜色编辑器');
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
          <Stack direction="row" wrap gap="sm">
            <Button size="sm" onPress={() => setLarge((v) => !v)}>
              切换颜色编辑器外观
            </Button>
            <Button size="sm" onPress={() => setMounted((v) => !v)}>
              {mountLabel()}
            </Button>
          </Stack>
          <Show when={mounted()}>
            {() => (
              <ColorEditorPanel
                name="示例"
                colorMode={large() ? 'dark' : 'light'}
                density={large() ? 'compact' : 'comfortable'}
                fontScale={large() ? 2 : 1}
              />
            )}
          </Show>
        </Stack>
      )}
    </UIProvider>
  );
}

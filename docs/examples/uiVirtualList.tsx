import { createState, Show } from '@piant/core';
import { Button, Stack, UIProvider } from '@piant/ui';
import { CollectionPanel } from '../../examples/ui-gallery/src/CollectionPanel';
export default function UIVirtualListExample() {
  const [large, setLarge] = createState(false);
  const [mounted, setMounted] = createState(true);
  const mountLabel = () => (mounted() ? '卸载虚拟列表' : '重挂载虚拟列表');
  return (
    <UIProvider>
      {() => (
        <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
          <Stack direction="row" wrap gap="sm">
            <Button size="sm" onPress={() => setLarge((v) => !v)}>
              切换列表外观
            </Button>
            <Button size="sm" onPress={() => setMounted((v) => !v)}>
              {mountLabel()}
            </Button>
          </Stack>
          <Show when={mounted()}>
            {() => (
              <CollectionPanel
                name="示例列表"
                kind="list"
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

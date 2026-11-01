import { createState } from '@piant/core';
import { Button, Stack, Surface, UIProvider } from '@piant/ui';
import { SettingsPanel } from '../../examples/ui-gallery/src/SettingsPanel';

export default function UIGalleryExample() {
  const [large, setLarge] = createState(false);
  const [reduced, setReduced] = createState(false);
  const appearanceLabel = () =>
    large() ? '恢复默认外观' : '深色 / 紧凑 / 200%';
  const motionLabel = () => (reduced() ? '允许动画' : '减少动画');
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
      reducedMotion={reduced()}
    >
      {() => (
        <Stack gap="sm" style={{ width: '100%', height: '100%' }}>
          <Surface tone="canvas" padding="sm" style={{ width: '100%' }}>
            <Stack direction="row" wrap gap="sm">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setLarge((previous) => !previous)}
              >
                {appearanceLabel()}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setReduced((previous) => !previous)}
              >
                {motionLabel()}
              </Button>
            </Stack>
          </Surface>
          <SettingsPanel
            title="设置预览"
            colorMode={large() ? 'dark' : 'light'}
            density={large() ? 'compact' : 'comfortable'}
            fontScale={large() ? 2 : 1}
            reducedMotion={reduced()}
          />
        </Stack>
      )}
    </UIProvider>
  );
}

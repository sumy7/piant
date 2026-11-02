import { createState, Show, Text, View } from '@piant/core';
import { Button, Stack, Surface, UIProvider, useUITheme } from '@piant/ui';
import { OverlayWorkflow } from '../../examples/ui-gallery/src/OverlayWorkflow';

export default function UIOverlayWorkflowExample() {
  const [mounted, setMounted] = createState(true);
  const [large, setLarge] = createState(false);
  const [reduced, setReduced] = createState(false);
  const mountLabel = () => (mounted() ? '卸载组合场景' : '重新挂载组合场景');
  const appearanceLabel = () =>
    large() ? '恢复组合场景外观' : '切换组合场景外观';
  const motionLabel = () =>
    reduced() ? '允许组合场景动画' : '减少组合场景动画';
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
      reducedMotion={reduced()}
      focusScope="isolate"
    >
      {() => {
        const theme = useUITheme();
        return (
          <Surface
            tone="canvas"
            padding="sm"
            style={{ width: '100%', height: '100%' }}
          >
            <Stack
              gap="sm"
              style={{ width: '100%', height: '100%', minHeight: 0 }}
            >
              <Stack
                direction="row"
                wrap
                gap="sm"
                style={{ flexShrink: 0, minHeight: 36 }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setMounted((next) => !next)}
                >
                  {mountLabel()}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setLarge((next) => !next)}
                >
                  {appearanceLabel()}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setReduced((next) => !next)}
                >
                  {motionLabel()}
                </Button>
              </Stack>
              <Show
                when={mounted()}
                fallback={
                  <Text
                    style={{
                      color: theme().colors.text,
                      fontSize: theme().typography.fontSize,
                    }}
                  >
                    工作流已卸载，重新挂载会创建独立的新状态。
                  </Text>
                }
              >
                {(_mounted) => (
                  <View
                    style={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      width: '100%',
                    }}
                  >
                    <OverlayWorkflow
                      name="示例"
                      colorMode={large() ? 'dark' : 'light'}
                      density={large() ? 'compact' : 'comfortable'}
                      fontScale={large() ? 2 : 1}
                      reducedMotion={reduced()}
                    />
                  </View>
                )}
              </Show>
            </Stack>
          </Surface>
        );
      }}
    </UIProvider>
  );
}

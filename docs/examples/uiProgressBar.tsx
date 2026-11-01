import { createState, Text, View } from '@piant/core';
import { ProgressBar, Stack, Surface, UIProvider } from '@piant/ui';

export default function UIProgressBarExample() {
  const [value, setValue] = createState(35);
  const [indeterminate, setIndeterminate] = createState(false);
  const [reduced, setReduced] = createState(false);
  const valueLabel = () => `value=${value()}；点击加 25（超过 max 后归零）`;
  const modeLabel = () =>
    indeterminate()
      ? '不确定进度；点击切换为确定'
      : '确定进度；点击切换为不确定';
  const motionLabel = () =>
    reduced() ? '减少动画：开；点击关闭' : '减少动画：关；点击开启';
  return (
    <UIProvider reducedMotion={reduced()}>
      {() => (
        <Surface style={{ width: '100%', height: '100%' }}>
          <Stack gap="sm">
            <View
              onClick={() =>
                setValue((previous) => (previous >= 100 ? 0 : previous + 25))
              }
              style={{ padding: 8 }}
            >
              <Text>{valueLabel()}</Text>
            </View>
            <View
              onClick={() => setIndeterminate((previous) => !previous)}
              style={{ padding: 8 }}
            >
              <Text>{modeLabel()}</Text>
            </View>
            <View
              onClick={() => setReduced((previous) => !previous)}
              style={{ padding: 8 }}
            >
              <Text>{motionLabel()}</Text>
            </View>
            <ProgressBar
              value={value()}
              indeterminate={indeterminate()}
              label="下载进度"
              style={{ width: '100%' }}
            />
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

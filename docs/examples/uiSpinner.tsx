import { createState, Text, View } from '@piant/core';
import { Spinner, Stack, Surface, UIProvider } from '@piant/ui';

export default function UISpinnerExample() {
  const [active, setActive] = createState(true);
  const [reduced, setReduced] = createState(false);
  const activeLabel = () =>
    active() ? '正在旋转；点击暂停' : '已暂停；点击继续';
  const motionLabel = () =>
    reduced() ? '减少动画：开；点击关闭' : '减少动画：关；点击开启';
  return (
    <UIProvider reducedMotion={reduced()}>
      {() => (
        <Surface style={{ width: '100%', height: '100%' }}>
          <Stack gap="sm">
            <View
              onClick={() => setActive((previous) => !previous)}
              style={{ padding: 8 }}
            >
              <Text>{activeLabel()}</Text>
            </View>
            <View
              onClick={() => setReduced((previous) => !previous)}
              style={{ padding: 8 }}
            >
              <Text>{motionLabel()}</Text>
            </View>
            <Stack direction="row" align="center">
              <Spinner active={active()} label="正在加载" />
              <Spinner active={active()} size={40} thickness={4} />
              <Spinner active={active()} size={64} thickness={6} />
            </Stack>
          </Stack>
        </Surface>
      )}
    </UIProvider>
  );
}

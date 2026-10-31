import { createState, Text, View } from '@piant/core';
import {
  createControllableState,
  createPressable,
  type PressableState,
} from '@piant/ui';

export default function UIPressableExample() {
  const [disabled, setDisabled] = createState(false);
  const [value, setValue] = createControllableState({ defaultValue: false });
  const [press, setPress] = createState<PressableState>();
  const label = () =>
    `选中：${value()}；悬停：${press()?.hovered() ?? false}；按下：${press()?.pressed() ?? false}`;
  return (
    <View style={{ padding: 16, width: '100%' }}>
      <View
        ref={(node) => {
          setPress(
            createPressable(node, {
              get disabled() {
                return disabled();
              },
              onPress: () => setValue((previous) => !previous),
            }),
          );
        }}
        style={{
          padding: 16,
          borderRadius: 8,
          backgroundColor: disabled()
            ? '#64748b'
            : (press()?.pressed() ?? false)
              ? '#1e3a8a'
              : (press()?.hovered() ?? false)
                ? '#2563eb'
                : '#1d4ed8',
        }}
      >
        {() => (
          <Text style={{ color: '#ffffff', fontSize: 16, lineHeight: 24 }}>
            {label()}
          </Text>
        )}
      </View>
      <View
        style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#e2e8f0',
          borderRadius: 8,
        }}
        onClick={() => setDisabled((previous) => !previous)}
      >
        <Text style={{ color: '#0f172a', fontSize: 16 }}>切换禁用</Text>
      </View>
    </View>
  );
}

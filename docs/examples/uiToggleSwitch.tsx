import { createState, Text } from '@piant/core';
import {
  Button,
  Stack,
  Surface,
  ToggleSwitch,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [checked, setChecked] = createState(false);
  const [disabled, setDisabled] = createState(false);
  const status = () => (checked() ? '自动保存已开启' : '自动保存已关闭');
  const disabledLabel = () => (disabled() ? '启用开关' : '禁用开关');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md" style={{ width: '100%' }}>
        <ToggleSwitch
          label="自动保存"
          description="受控开关；名称不随开关状态变化。"
          checked={checked()}
          onCheckedChange={setChecked}
          disabled={disabled()}
        />
        <ToggleSwitch
          label="显示网格"
          defaultChecked
          description="非受控开关，初始为开启。"
        />
        <Text
          style={{
            color: theme().colors.text,
            fontSize: theme().typography.fontSize,
            lineHeight: theme().typography.lineHeight,
          }}
        >
          {status()}
        </Text>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => setDisabled((previous) => !previous)}
        >
          {disabledLabel()}
        </Button>
        <Button variant="ghost" onPress={props.toggleTheme}>
          切换主题、密度与字号
        </Button>
      </Stack>
    </Surface>
  );
}

export default function UIToggleSwitchExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider
      colorMode={dark() ? 'dark' : 'light'}
      density={dark() ? 'compact' : 'comfortable'}
      fontScale={dark() ? 2 : 1}
    >
      {() => <Preview toggleTheme={() => setDark((previous) => !previous)} />}
    </UIProvider>
  );
}

import { createState, Text } from '@piant/core';
import {
  Button,
  Slider,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [value, setValue] = createState(0.2);
  const [changes, setChanges] = createState(0);
  const [rtl, setRtl] = createState(false);
  const [disabled, setDisabled] = createState(false);
  const [verticalDefault, setVerticalDefault] = createState(4);
  const [verticalValue, setVerticalValue] = createState(4);
  const [verticalChanges, setVerticalChanges] = createState(0);
  const valueText = (next: number) => `${next.toFixed(1)} 倍`;
  const horizontalStatus = () =>
    `受控值：${value().toFixed(1)}；变更通知：${changes()} 次`;
  const verticalStatus = () =>
    `纵向非受控值：${verticalValue()}；变更通知：${verticalChanges()} 次`;
  const directionLabel = () => (rtl() ? '切换为 LTR' : '切换为 RTL');
  const disabledLabel = () => (disabled() ? '启用受控滑块' : '禁用受控滑块');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          拖动轨道或 Tab 聚焦后使用方向键、Home / End。
        </Text>
        <Slider
          name="播放速度"
          description="从负一到一，步长为零点一。"
          min={-1}
          max={1}
          step={0.1}
          value={value()}
          valueText={valueText}
          dir={rtl() ? 'rtl' : 'ltr'}
          disabled={disabled()}
          onValueChange={(next) => {
            setValue(next);
            setChanges((count) => count + 1);
          }}
          style={{ width: '100%' }}
        />
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          {horizontalStatus()}
        </Text>
        <Stack direction="row" gap="sm" wrap>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setRtl((next) => !next)}
          >
            {directionLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((next) => !next)}
          >
            {disabledLabel()}
          </Button>
          <Button size="sm" variant="secondary" onPress={props.toggleTheme}>
            切换滑块主题
          </Button>
          <Button size="sm" variant="secondary" onPress={() => setValue(0)}>
            父级设为零
          </Button>
        </Stack>
        <Stack direction="row" gap="lg" align="center">
          <Slider
            name="纵向音量"
            orientation="vertical"
            min={0}
            max={10}
            step={2}
            defaultValue={verticalDefault()}
            valueText={(next) => `${next} 格`}
            onValueChange={(next) => {
              setVerticalValue(next);
              setVerticalChanges((count) => count + 1);
            }}
            style={{ height: 180 }}
          />
          <Stack gap="sm" style={{ flex: 1 }}>
            <Text style={{ color: theme().colors.text, fontSize: 14 }}>
              {verticalStatus()}
            </Text>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setVerticalDefault(8)}
            >
              修改纵向初值
            </Button>
            <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
              修改 defaultValue 不重置已创建的非受控值。
            </Text>
          </Stack>
        </Stack>
        <Slider
          name="禁用滑块"
          defaultValue={35}
          disabled
          style={{ width: '100%' }}
        />
      </Stack>
    </Surface>
  );
}

export default function UISliderExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => <Preview toggleTheme={() => setDark((next) => !next)} />}
    </UIProvider>
  );
}

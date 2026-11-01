import { createState, Text } from '@piant/core';
import {
  Button,
  Checkbox,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [checked, setChecked] = createState<boolean | 'mixed'>('mixed');
  const [disabled, setDisabled] = createState(false);
  const [initialChecked, setInitialChecked] = createState(true);
  const status = () => `受控状态：${checked()}`;
  const disabledLabel = () => (disabled() ? '启用复选框' : '禁用复选框');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md" style={{ width: '100%' }}>
        <Checkbox
          label="包含全部图层"
          description="mixed 表示部分图层已选中。"
          checked={checked()}
          onCheckedChange={setChecked}
          disabled={disabled()}
        />
        <Checkbox
          label="保留导出记录"
          defaultChecked={initialChecked()}
          description="非受控初值，之后由组件持有。"
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
        <Stack direction="row" wrap gap="sm">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setChecked('mixed')}
          >
            设为部分选中
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((previous) => !previous)}
          >
            {disabledLabel()}
          </Button>
        </Stack>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setInitialChecked(false)}
        >
          修改初始选中值
        </Button>
        <Button variant="ghost" onPress={props.toggleTheme}>
          切换主题、密度与字号
        </Button>
      </Stack>
    </Surface>
  );
}

export default function UICheckboxExample() {
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

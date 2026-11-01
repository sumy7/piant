import { createState, Text } from '@piant/core';
import {
  Button,
  RadioGroup,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [initialValue, setInitialValue] = createState('balanced');
  const [value, setValue] = createState('balanced');
  const [showBalanced, setShowBalanced] = createState(true);
  const [disabled, setDisabled] = createState(false);
  const [horizontal, setHorizontal] = createState(false);
  const options = () => [
    { value: 'fast', label: '快速', description: '较小文件。' },
    ...(showBalanced()
      ? [{ value: 'balanced', label: '均衡', description: '默认推荐设置。' }]
      : []),
    { value: 'quality', label: '高质量', description: '保留更多细节。' },
    { value: 'experimental', label: '实验模式', disabled: true },
  ];
  const status = () => `当前值：${value()}`;
  const optionLabel = () => (showBalanced() ? '移除均衡选项' : '恢复均衡选项');
  const disabledLabel = () => (disabled() ? '启用选项组' : '禁用选项组');
  const orientationLabel = () =>
    horizontal() ? '改为纵向排列' : '改为横向排列';
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="sm" style={{ width: '100%' }}>
        <RadioGroup
          label="导出质量"
          description="方向键移动并选择；移除当前值不会自动改选。"
          defaultValue={initialValue()}
          onValueChange={setValue}
          options={options()}
          disabled={disabled()}
          orientation={horizontal() ? 'horizontal' : 'vertical'}
          style={{ width: '100%' }}
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
            onPress={() => setShowBalanced((previous) => !previous)}
          >
            {optionLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((previous) => !previous)}
          >
            {disabledLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setHorizontal((previous) => !previous)}
          >
            {orientationLabel()}
          </Button>
        </Stack>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setInitialValue('quality')}
        >
          修改默认质量
        </Button>
        <Button variant="ghost" onPress={props.toggleTheme}>
          切换主题、密度与字号
        </Button>
      </Stack>
    </Surface>
  );
}

export default function UIRadioGroupExample() {
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

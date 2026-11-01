import { createState, type PInput, Text } from '@piant/core';
import {
  Button,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [value, setValue] = createState('');
  const [readOnly, setReadOnly] = createState(false);
  const [disabled, setDisabled] = createState(false);
  const [inputCount, setInputCount] = createState(0);
  const [submitCount, setSubmitCount] = createState(0);
  const [composing, setComposing] = createState(false);
  let field: PInput | undefined;
  const status = () =>
    `${value().length} 个字符；input ${inputCount()} 次；提交 ${submitCount()} 次`;
  const compositionStatus = () =>
    composing() ? '正在合成输入' : '未在合成输入';
  const readOnlyLabel = () => (readOnly() ? '允许编辑' : '设为只读');
  const disabledLabel = () => (disabled() ? '启用输入' : '禁用输入');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="sm" style={{ width: '100%' }}>
        <TextField
          ref={(node) => {
            field = node;
          }}
          type="password"
          name="password"
          aria-label="密码"
          placeholder="输入密码（受控）"
          autoComplete="new-password"
          value={value()}
          onValueChange={setValue}
          onInput={() => setInputCount((count) => count + 1)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setSubmitCount((count) => count + 1);
          }}
          readOnly={readOnly()}
          disabled={disabled()}
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
        <Text
          style={{
            color: theme().colors.textMuted,
            fontSize: theme().typography.smallFontSize,
            lineHeight: theme().typography.smallLineHeight,
          }}
        >
          {compositionStatus()}
        </Text>
        <Stack direction="row" wrap gap="sm">
          <Button size="sm" variant="secondary" onPress={() => field?.focus()}>
            聚焦密码
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setReadOnly((previous) => !previous)}
          >
            {readOnlyLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((previous) => !previous)}
          >
            {disabledLabel()}
          </Button>
        </Stack>
        <Button variant="ghost" onPress={props.toggleTheme}>
          切换主题、密度与字号
        </Button>
      </Stack>
    </Surface>
  );
}

export default function UITextFieldExample() {
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

import { createState, Text } from '@piant/core';
import {
  Button,
  Field,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview() {
  const theme = useUITheme();
  const [initialValue, setInitialValue] = createState('Piant');
  const [value, setValue] = createState('Piant');
  const [error, setError] = createState<string>();
  const currentValue = () => `最近输入：${value()}`;
  const validate = () =>
    setError(value().length < 3 ? '名称至少需要 3 个字符。' : undefined);
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md" style={{ width: '100%' }}>
        <Field
          label="显示名称"
          description="用于公开资料；至少 3 个字符。"
          error={error()}
          required
          style={{ width: '100%' }}
        >
          {() => (
            <TextField
              name="displayName"
              defaultValue={initialValue()}
              placeholder="输入公开名称（非受控）"
              minLength={3}
              maxLength={40}
              autoComplete="nickname"
              onValueChange={setValue}
              style={{ width: '100%' }}
            />
          )}
        </Field>
        <Text
          style={{
            color: theme().colors.text,
            fontSize: theme().typography.fontSize,
            lineHeight: theme().typography.lineHeight,
          }}
        >
          {currentValue()}
        </Text>
        <Stack direction="row" wrap gap="sm">
          <Button variant="secondary" onPress={validate}>
            校验名称
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setInitialValue('新的默认值')}
          >
            修改 defaultValue
          </Button>
          <Button variant="ghost" onPress={() => setError(undefined)}>
            清除错误
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

export default function UIFieldExample() {
  return <UIProvider>{() => <Preview />}</UIProvider>;
}

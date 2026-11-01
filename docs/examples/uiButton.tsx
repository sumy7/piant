import { createState, Text } from '@piant/core';
import {
  Button,
  Icon,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [count, setCount] = createState(0);
  const [disabled, setDisabled] = createState(false);
  const [loading, setLoading] = createState(false);
  const countLabel = () => `执行操作 ${count()}`;
  const disabledLabel = () => (disabled() ? '恢复主按钮' : '禁用主按钮');
  const loadingLabel = () => (loading() ? '结束加载' : '开始加载');
  const themeLabel = () =>
    `${theme().colorMode} / ${theme().density}；切换主题与字号`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="sm">
        <Button
          onPress={() => setCount((value) => value + 1)}
          disabled={disabled()}
          loading={loading()}
          icon={(context) => (
            <Icon
              size={context.size()}
              color={context.color()}
              draw={(graphics, width, height, color) => {
                graphics
                  .moveTo(width * 0.2, height / 2)
                  .lineTo(width * 0.45, height * 0.75)
                  .lineTo(width * 0.8, height * 0.2)
                  .stroke({ color, width: 2 });
              }}
            />
          )}
        >
          {countLabel()}
        </Button>
        <Stack direction="row" wrap gap="sm">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((value) => !value)}
          >
            {disabledLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setLoading((value) => !value)}
          >
            {loadingLabel()}
          </Button>
        </Stack>
        <Button variant="ghost" onPress={props.toggleTheme}>
          {themeLabel()}
        </Button>
        <Text
          style={{
            color: theme().colors.textMuted,
            fontSize: theme().typography.smallFontSize,
            lineHeight: theme().typography.smallLineHeight,
          }}
        >
          用 Tab 聚焦，再按 Enter 或 Space；禁用与加载期间不执行操作。
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UIButtonExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider
      colorMode={dark() ? 'dark' : 'light'}
      density={dark() ? 'compact' : 'comfortable'}
      fontScale={dark() ? 2 : 1}
    >
      {() => <Preview toggleTheme={() => setDark((value) => !value)} />}
    </UIProvider>
  );
}

import { createState, Text } from '@piant/core';
import {
  Button,
  Icon,
  IconButton,
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
  const countLabel = () => `已刷新 ${count()} 次`;
  const disabledLabel = () => (disabled() ? '恢复刷新按钮' : '禁用刷新按钮');
  const loadingLabel = () => (loading() ? '结束加载' : '开始加载');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="sm">
        <Stack direction="row" align="center" wrap>
          <IconButton
            name="刷新预览"
            size="lg"
            disabled={disabled()}
            loading={loading()}
            onPress={() => setCount((value) => value + 1)}
            icon={(context) => (
              <Icon
                size={context.size()}
                color={context.color()}
                draw={(graphics, width, height, color) => {
                  const side = Math.min(width, height);
                  graphics
                    .arc(
                      width / 2,
                      height / 2,
                      side * 0.32,
                      Math.PI * 0.2,
                      Math.PI * 1.9,
                    )
                    .stroke({ color, width: 2 });
                  graphics
                    .moveTo(width * 0.83, height * 0.2)
                    .lineTo(width * 0.83, height * 0.48)
                    .lineTo(width * 0.55, height * 0.48)
                    .stroke({ color, width: 2 });
                }}
              />
            )}
          />
          <Text
            style={{
              color: theme().colors.text,
              fontSize: theme().typography.fontSize,
              lineHeight: theme().typography.lineHeight,
            }}
          >
            {countLabel()}
          </Text>
        </Stack>
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
          切换主题、密度与 200% 字号
        </Button>
      </Stack>
    </Surface>
  );
}

export default function UIIconButtonExample() {
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

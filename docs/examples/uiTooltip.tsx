import { createState, Text, View } from '@piant/core';
import {
  Button,
  OverlayHost,
  Stack,
  Surface,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [saved, setSaved] = createState(0);
  const [expanded, setExpanded] = createState(false);
  const [requests, setRequests] = createState(0);
  const [open, setOpen] = createState(false);
  const help = () =>
    expanded()
      ? '保存当前草稿，不会发布项目。提示内容可通过悬停或键盘焦点阅读，Escape 可关闭；需要操作的帮助内容请使用 Popover。'
      : '保存当前草稿，不会发布项目。';
  const status = () =>
    `保存 ${saved()} 次；提示打开：${open()}；状态请求 ${requests()} 次`;
  const detailsLabel = () =>
    expanded() ? '使用简短 Tooltip' : '使用较长 Tooltip';
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          鼠标停留后显示，键盘聚焦立即显示。可移入提示继续阅读；Escape 关闭。
        </Text>
        <Tooltip
          open={open()}
          onOpenChange={(next) => {
            setRequests((count) => count + 1);
            setOpen(next);
          }}
        >
          {() => (
            <View>
              <TooltipTrigger onPress={() => setSaved((count) => count + 1)}>
                保存带提示的草稿
              </TooltipTrigger>
              <TooltipContent width={300} placement="bottom-start">
                {help()}
              </TooltipContent>
            </View>
          )}
        </Tooltip>
        <Stack direction="row" gap="sm" wrap>
          <Button
            variant="secondary"
            onPress={() => setExpanded((value) => !value)}
          >
            {detailsLabel()}
          </Button>
          <Button variant="secondary" onPress={props.toggleTheme}>
            切换 Tooltip 主题
          </Button>
        </Stack>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          {status()}
        </Text>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          触摸点击只执行保存，不要求先悬停。必要信息应直接可见或提供可点击的帮助入口。
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UITooltipExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => (
        <OverlayHost>
          {() => <Preview toggleTheme={() => setDark((value) => !value)} />}
        </OverlayHost>
      )}
    </UIProvider>
  );
}

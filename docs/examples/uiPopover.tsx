import { createState, Show, Text, View } from '@piant/core';
import {
  Button,
  Checkbox,
  OverlayHost,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [open, setOpen] = createState(false);
  const [rejectClose, setRejectClose] = createState(false);
  const [showTrigger, setShowTrigger] = createState(true);
  const [backgroundActions, setBackgroundActions] = createState(0);
  const [requests, setRequests] = createState(0);
  let input: HTMLElement | undefined;
  const status = () =>
    `打开：${open()}；状态请求 ${requests()} 次；背景操作 ${backgroundActions()} 次`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          Popover 不限制背景操作。打开后编辑输入，尝试 Tab 离开与嵌套关闭。
        </Text>
        <TextField aria-label="Popover 背景输入" defaultValue="背景仍可编辑" />
        <Popover
          open={open()}
          onOpenChange={(next) => {
            setRequests((count) => count + 1);
            if (next || !rejectClose()) setOpen(next);
          }}
        >
          {() => (
            <View>
              <Show when={showTrigger()}>
                {(_visible) => (
                  <PopoverTrigger>编辑 Popover 备注</PopoverTrigger>
                )}
              </Show>
              <PopoverContent
                name="编辑项目备注"
                width={360}
                height={340}
                initialFocus={() => input}
                placement="bottom-start"
                actions={() => (
                  <Stack direction="row" gap="sm" wrap>
                    <Button variant="secondary" onPress={props.toggleTheme}>
                      切换 Popover 主题
                    </Button>
                    <PopoverClose>完成 Popover 编辑</PopoverClose>
                  </Stack>
                )}
              >
                {() => (
                  <Stack gap="md">
                    <TextField
                      aria-label="Popover 备注草稿"
                      defaultValue="输入一段中文备注"
                      ref={(node) => {
                        input = node.element;
                      }}
                    />
                    <Checkbox
                      label="拒绝 Popover 关闭请求"
                      checked={rejectClose()}
                      onCheckedChange={(next) => setRejectClose(next === true)}
                    />
                    <Popover>
                      {() => (
                        <View>
                          <PopoverTrigger variant="secondary">
                            打开嵌套 Popover
                          </PopoverTrigger>
                          <PopoverContent
                            name="嵌套备注帮助"
                            width={280}
                            height={200}
                            actions={() => (
                              <PopoverClose>关闭嵌套 Popover</PopoverClose>
                            )}
                          >
                            {() => (
                              <TextField
                                aria-label="嵌套 Popover 草稿"
                                defaultValue="Escape 先关闭当前层"
                              />
                            )}
                          </PopoverContent>
                        </View>
                      )}
                    </Popover>
                    <Button
                      variant="ghost"
                      onPress={() => setShowTrigger(false)}
                    >
                      移除 Popover 触发器
                    </Button>
                  </Stack>
                )}
              </PopoverContent>
            </View>
          )}
        </Popover>
        <Button
          variant="secondary"
          onPress={() => setBackgroundActions((count) => count + 1)}
        >
          Popover 后续背景操作
        </Button>
        <Button variant="ghost" onPress={() => setShowTrigger(true)}>
          恢复 Popover 触发器
        </Button>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          {status()}
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UIPopoverExample() {
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

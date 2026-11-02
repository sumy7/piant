import { createState, Show, Text, View } from '@piant/core';
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  OverlayHost,
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
  const [requests, setRequests] = createState(0);
  let input: HTMLElement | undefined;
  const status = () => `打开：${open()}；状态请求：${requests()} 次`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          编辑弹窗草稿、打开嵌套弹窗，使用 Tab 和 Escape，再检查焦点恢复。
        </Text>
        <TextField
          aria-label="Dialog 背景输入"
          defaultValue="打开弹窗后不能编辑我"
        />
        <Dialog
          open={open()}
          onOpenChange={(next) => {
            setRequests((count) => count + 1);
            if (next || !rejectClose()) setOpen(next);
          }}
        >
          {() => (
            <View>
              <Show when={showTrigger()}>
                {(_visible) => <DialogTrigger>编辑个人资料</DialogTrigger>}
              </Show>
              <DialogContent
                width={440}
                height={420}
                initialFocus={() => input}
                actions={() => (
                  <Stack direction="row" gap="sm" wrap>
                    <Button variant="secondary" onPress={props.toggleTheme}>
                      切换 Dialog 主题
                    </Button>
                    <DialogClose variant="secondary">取消编辑</DialogClose>
                    <DialogClose>保存并关闭</DialogClose>
                  </Stack>
                )}
              >
                {() => (
                  <Stack gap="md">
                    <DialogTitle>编辑个人资料</DialogTitle>
                    <DialogDescription>
                      关闭会释放本次草稿。Enter 在输入框中不会自动保存。
                    </DialogDescription>
                    <TextField
                      aria-label="Dialog 个人名称"
                      defaultValue="输入中文姓名"
                      ref={(node) => {
                        input = node.element;
                      }}
                    />
                    <Checkbox
                      label="拒绝关闭请求"
                      checked={rejectClose()}
                      onCheckedChange={(next) => setRejectClose(next === true)}
                    />
                    <Dialog>
                      {() => (
                        <View>
                          <DialogTrigger variant="secondary">
                            打开嵌套 Dialog
                          </DialogTrigger>
                          <DialogContent
                            width={320}
                            height={240}
                            actions={() => (
                              <DialogClose>关闭嵌套 Dialog</DialogClose>
                            )}
                          >
                            {() => (
                              <Stack gap="md">
                                <DialogTitle>嵌套说明</DialogTitle>
                                <DialogDescription>
                                  Escape
                                  只关闭最上层，焦点返回父弹窗的触发按钮。
                                </DialogDescription>
                                <TextField
                                  aria-label="嵌套 Dialog 草稿"
                                  defaultValue="子层输入"
                                />
                              </Stack>
                            )}
                          </DialogContent>
                        </View>
                      )}
                    </Dialog>
                    <Button
                      variant="ghost"
                      onPress={() => setShowTrigger(false)}
                    >
                      移除 Dialog 触发器
                    </Button>
                  </Stack>
                )}
              </DialogContent>
            </View>
          )}
        </Dialog>
        <Button variant="secondary" onPress={() => setShowTrigger(true)}>
          恢复 Dialog 触发器
        </Button>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          {status()}
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UIDialogExample() {
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

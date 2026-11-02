import { createState, Text, View } from '@piant/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  OverlayHost,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview() {
  const theme = useUITheme();
  const [open, setOpen] = createState(false);
  const [phrase, setPhrase] = createState('');
  const [confirmed, setConfirmed] = createState(0);
  const [message, setMessage] = createState('尚未确认删除');
  const status = () => `${message()}；确认动作 ${confirmed()} 次`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          打开时先聚焦取消。点击遮罩保持打开；Escape 关闭且不会删除。
        </Text>
        <TextField aria-label="AlertDialog 背景输入" defaultValue="背景内容" />
        <AlertDialog
          open={open()}
          onOpenChange={(next) => {
            if (next) setPhrase('');
            setOpen(next);
          }}
        >
          {() => (
            <View>
              <AlertDialogTrigger variant="danger">
                删除示例项目
              </AlertDialogTrigger>
              <AlertDialogContent
                width={440}
                height={340}
                actions={() => (
                  <Stack direction="row" gap="sm" wrap>
                    <AlertDialogCancel variant="secondary">
                      取消删除
                    </AlertDialogCancel>
                    <AlertDialogConfirm
                      variant="danger"
                      onPress={(event) => {
                        if (phrase() !== '删除') {
                          event.preventDefault();
                          setMessage('请输入“删除”后再明确确认');
                          return;
                        }
                        setConfirmed((count) => count + 1);
                        setMessage('已执行本地示例确认');
                      }}
                    >
                      确认删除
                    </AlertDialogConfirm>
                  </Stack>
                )}
              >
                {() => (
                  <Stack gap="md">
                    <AlertDialogTitle>确认删除示例项目？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作仅增加示例计数。请输入“删除”，再激活确认按钮。
                    </AlertDialogDescription>
                    <TextField
                      aria-label="AlertDialog 删除口令"
                      value={phrase()}
                      onValueChange={setPhrase}
                      placeholder="输入：删除"
                    />
                  </Stack>
                )}
              </AlertDialogContent>
            </View>
          )}
        </AlertDialog>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          {status()}
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UIAlertDialogExample() {
  return (
    <UIProvider>
      {() => <OverlayHost>{() => <Preview />}</OverlayHost>}
    </UIProvider>
  );
}

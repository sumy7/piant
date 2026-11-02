import { createState, ScrollView, Text, View } from '@piant/core';
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuTrigger,
  OverlayHost,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [open, setOpen] = createState(false);
  const [rejectClose, setRejectClose] = createState(false);
  const [actions, setActions] = createState(0);
  const [lastAction, setLastAction] = createState('尚未执行');
  const [backgroundActions, setBackgroundActions] = createState(0);
  const items = [
    { value: 'rename', label: 'Rename 重命名' },
    { value: 'duplicate', label: 'Duplicate 复制' },
    { value: 'export', label: 'Export 导出（不可用）', disabled: true },
    { value: 'archive', label: 'Archive 归档' },
  ];
  const act = (value: string) => {
    setActions((count) => count + 1);
    setLastAction(value);
  };
  const status = () =>
    `Menu 打开：${open()}；动作 ${actions()} 次：${lastAction()}；背景操作 ${backgroundActions()} 次`;
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <ScrollView style={{ width: '100%', height: '100%' }}>
        <Stack gap="md">
          <Text
            style={{
              color: theme().colors.text,
              fontSize: theme().typography.fontSize,
            }}
          >
            方向键浏览，Enter / Space 执行动作；禁用项可被发现但不能执行。
          </Text>
          <Menu
            label="项目操作"
            items={items}
            open={open()}
            onOpenChange={(next) => {
              if (next || !rejectClose()) setOpen(next);
            }}
            onAction={act}
          >
            {() => (
              <View>
                <MenuTrigger>打开项目操作</MenuTrigger>
                <MenuContent width={280} height={280} />
              </View>
            )}
          </Menu>
          <Button
            variant="secondary"
            onPress={() => setBackgroundActions((count) => count + 1)}
          >
            Menu 后续背景操作
          </Button>
          <Checkbox
            label="拒绝 Menu 关闭请求"
            checked={rejectClose()}
            onCheckedChange={(next) => setRejectClose(next === true)}
          />
          <Dialog>
            {() => (
              <View>
                <DialogTrigger variant="secondary">
                  打开含 Menu 的 Dialog
                </DialogTrigger>
                <DialogContent
                  width={400}
                  height={320}
                  actions={() => (
                    <DialogClose>关闭 Menu 示例 Dialog</DialogClose>
                  )}
                >
                  {() => (
                    <Stack gap="md">
                      <DialogTitle>弹窗中的项目菜单</DialogTitle>
                      <Menu label="弹窗项目操作" items={items} onAction={act}>
                        {() => (
                          <View>
                            <MenuTrigger>弹窗内打开 Menu</MenuTrigger>
                            <MenuContent width={280} height={260} />
                          </View>
                        )}
                      </Menu>
                    </Stack>
                  )}
                </DialogContent>
              </View>
            )}
          </Dialog>
          <Button variant="ghost" onPress={props.toggleTheme}>
            切换 Menu 主题、密度与字号
          </Button>
          <Text
            style={{
              color: theme().colors.textMuted,
              fontSize: theme().typography.fontSize,
            }}
          >
            {status()}
          </Text>
        </Stack>
      </ScrollView>
    </Surface>
  );
}

export default function UIMenuExample() {
  const [large, setLarge] = createState(false);
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
    >
      {() => (
        <OverlayHost>
          {() => <Preview toggleTheme={() => setLarge((value) => !value)} />}
        </OverlayHost>
      )}
    </UIProvider>
  );
}

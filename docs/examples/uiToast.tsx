import { createState, ScrollView, Show, Text } from '@piant/core';
import {
  Button,
  Stack,
  Surface,
  ToastProvider,
  ToastViewport,
  UIProvider,
  useToast,
  useUITheme,
} from '@piant/ui';

function Preview() {
  const toast = useToast();
  const theme = useUITheme();
  const [rejected, setRejected] = createState(0);
  const [actions, setActions] = createState(0);
  const [lastDismiss, setLastDismiss] = createState('无');
  const [saved, setSaved] = createState('尚未保存');
  const [updateResult, setUpdateResult] = createState('尚未更新');
  let sequence = 0;
  let uploadVersion = 0;
  const reportDismiss = (id: string) => (reason: string) =>
    setLastDismiss(`${id}:${reason}`);
  const record = (id: string | undefined) => {
    if (id === undefined) setRejected((count) => count + 1);
  };
  const stats = () =>
    `全部 ${toast.items().length}；可见 ${toast.visible().length}；排队 ${toast.queuedCount()}；拒绝 ${rejected()}；恢复 ${actions()} 次`;
  const result = () =>
    `保存结果：${saved()}；最近关闭：${lastDismiss()}；局部更新：${updateResult()}`;
  return (
    <Stack gap="md">
      <Text
        style={{
          color: theme().colors.text,
          fontSize: theme().typography.fontSize,
        }}
      >
        默认通知持续显示。每次批量加入 5 条，最多保留 6 条、显示 3
        条；关闭后按顺序补位。
      </Text>
      <Stack direction="row" gap="sm" wrap>
        <Button
          onPress={() => {
            for (let i = 0; i < 5; i++) {
              const id = `batch-${++sequence}`;
              record(
                toast.show({
                  id,
                  title: `排队通知 ${sequence}`,
                  description: '这条通知没有自动关闭时间。',
                  onDismiss: reportDismiss(id),
                }),
              );
            }
          }}
        >
          加入 5 条 Toast
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            record(
              toast.show({
                id: 'upload',
                title: `上传任务 ${++uploadVersion}`,
                description: '相同 ID 完整替换内容，保留原队列位置。',
                onDismiss: reportDismiss('upload'),
              }),
            )
          }
        >
          创建或替换上传 Toast
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            const updated = toast.update('upload', {
              description: '进度已更新，标题与队列顺序保持。',
            });
            setUpdateResult(updated ? '成功' : '没有上传通知');
          }}
        >
          局部更新上传 Toast
        </Button>
      </Stack>
      <Stack direction="row" gap="sm" wrap>
        <Button
          variant="secondary"
          onPress={() =>
            record(
              toast.show({
                id: 'recover',
                title: '草稿可恢复',
                description: '此操作持续可用，直到明确操作或关闭。',
                duration: 0,
                action: {
                  label: '恢复草稿',
                  onAction: () => setActions((count) => count + 1),
                },
                onDismiss: reportDismiss('recover'),
              }),
            )
          }
        >
          加入持久操作 Toast
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            setSaved('草稿已保存');
            record(
              toast.show({
                id: 'finite',
                title: '草稿已保存',
                description: '4 秒后关闭，保存结果也保留在示例文字中。',
                duration: 4000,
                onDismiss: reportDismiss('finite'),
              }),
            );
          }}
        >
          加入短暂 Toast
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            record(
              toast.show({
                id: 'important',
                title: '连接已断开',
                description: '这是一条持续显示的重要提醒示例。',
                priority: 'assertive',
                onDismiss: reportDismiss('important'),
              }),
            )
          }
        >
          加入重要提醒 Toast
        </Button>
        <Button variant="ghost" onPress={() => toast.dismissAll()}>
          清空 Toast
        </Button>
      </Stack>
      <Text
        style={{
          color: theme().colors.text,
          fontSize: theme().typography.fontSize,
        }}
      >
        {stats()}
      </Text>
      <Text
        style={{
          color: theme().colors.textMuted,
          fontSize: theme().typography.fontSize,
        }}
      >
        {result()}
      </Text>
      <ToastViewport
        label="示例通知"
        dismissLabel="关闭通知"
        style={{ width: '100%', height: 320 }}
      />
    </Stack>
  );
}

export default function UIToastExample() {
  const [mounted, setMounted] = createState(true);
  const [large, setLarge] = createState(false);
  const mountLabel = () =>
    mounted() ? '卸载 ToastProvider' : '重新挂载 ToastProvider';
  return (
    <UIProvider
      colorMode={large() ? 'dark' : 'light'}
      density={large() ? 'compact' : 'comfortable'}
      fontScale={large() ? 2 : 1}
    >
      {() => (
        <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
          <ScrollView style={{ width: '100%', height: '100%' }}>
            <Stack gap="md">
              <Stack direction="row" gap="sm" wrap>
                <Button
                  variant="secondary"
                  onPress={() => setMounted((value) => !value)}
                >
                  {mountLabel()}
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => setLarge((value) => !value)}
                >
                  切换 Toast 主题、密度与字号
                </Button>
              </Stack>
              <Show when={mounted()}>
                {(_mounted) => (
                  <ToastProvider maxVisible={3} maxToasts={6}>
                    {() => <Preview />}
                  </ToastProvider>
                )}
              </Show>
            </Stack>
          </ScrollView>
        </Surface>
      )}
    </UIProvider>
  );
}

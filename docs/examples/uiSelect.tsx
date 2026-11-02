import { createState, ScrollView, Text, View } from '@piant/core';
import {
  Button,
  Checkbox,
  OverlayHost,
  Select,
  SelectContent,
  SelectTrigger,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [value, setValue] = createState<string | null>('team');
  const [open, setOpen] = createState(false);
  const [rejectValue, setRejectValue] = createState(false);
  const [rejectClose, setRejectClose] = createState(false);
  const [showTeam, setShowTeam] = createState(true);
  const [empty, setEmpty] = createState(false);
  const [valueRequests, setValueRequests] = createState(0);
  const [backgroundActions, setBackgroundActions] = createState(0);
  const options = () =>
    empty()
      ? []
      : [
          ...(showTeam() ? [{ value: 'team', label: 'Team 团队' }] : []),
          { value: 'private', label: 'Private 私密' },
          { value: 'public', label: 'Public 公开' },
          {
            value: 'archived',
            label: 'Archived 已归档（不可用）',
            disabled: true,
          },
        ];
  const status = () =>
    `Select 值：${value() ?? '无'}；打开：${open()}；值请求 ${valueRequests()} 次；背景操作 ${backgroundActions()} 次`;
  const teamLabel = () => (showTeam() ? '移除 Team 选项' : '恢复 Team 选项');
  const emptyLabel = () => (empty() ? '恢复 Select 选项' : '清空 Select 选项');
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
            打开后方向键只预览，Enter / Space 提交；Escape 或 Tab 取消本次预览。
          </Text>
          <Select
            label="项目可见性"
            options={options()}
            value={value()}
            onValueChange={(next) => {
              setValueRequests((count) => count + 1);
              if (!rejectValue()) setValue(next);
            }}
            open={open()}
            onOpenChange={(next) => {
              if (next || !rejectClose()) setOpen(next);
            }}
            placeholder="请选择可见性"
          >
            {() => (
              <View>
                <SelectTrigger />
                <SelectContent width={320} height={280} />
              </View>
            )}
          </Select>
          <Button
            variant="secondary"
            onPress={() => setBackgroundActions((count) => count + 1)}
          >
            Select 后续背景操作
          </Button>
          <Stack direction="row" gap="sm" wrap>
            <Checkbox
              label="拒绝 Select 值更新"
              checked={rejectValue()}
              onCheckedChange={(next) => setRejectValue(next === true)}
            />
            <Checkbox
              label="拒绝 Select 关闭请求"
              checked={rejectClose()}
              onCheckedChange={(next) => setRejectClose(next === true)}
            />
          </Stack>
          <Stack direction="row" gap="sm" wrap>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setShowTeam((next) => !next)}
            >
              {teamLabel()}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setEmpty((next) => !next)}
            >
              {emptyLabel()}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setValue('team')}
            >
              重置 Select 值
            </Button>
          </Stack>
          <Button variant="ghost" onPress={props.toggleTheme}>
            切换 Select 主题、密度与字号
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

export default function UISelectExample() {
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

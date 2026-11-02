import { createState, onCleanup, Text, untrack } from '@piant/core';
import {
  Button,
  Stack,
  Surface,
  Tabs,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Panel(props: {
  name: string;
  created: () => void;
  disposed: () => void;
}) {
  untrack(props.created);
  onCleanup(props.disposed);
  return (
    <TextField
      aria-label={`${props.name}草稿`}
      defaultValue={`${props.name}初始内容`}
    />
  );
}

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [value, setValue] = createState<string | null>('profile');
  const [manual, setManual] = createState(false);
  const [reverse, setReverse] = createState(false);
  const [advanced, setAdvanced] = createState(true);
  const [disabled, setDisabled] = createState(false);
  const [created, setCreated] = createState(0);
  const [disposed, setDisposed] = createState(0);
  const panel = (name: string) => () => (
    <Panel
      name={name}
      created={() => setCreated((count) => count + 1)}
      disposed={() => setDisposed((count) => count + 1)}
    />
  );
  const items = [
    { value: 'profile', label: '资料', children: panel('资料') },
    { value: 'preferences', label: '偏好', children: panel('偏好') },
    {
      value: 'advanced',
      label: '高级',
      get disabled() {
        return disabled();
      },
      children: panel('高级'),
    },
  ];
  const visibleItems = () => {
    const current = advanced() ? items : items.slice(0, 2);
    return reverse() ? [...current].reverse() : current;
  };
  const status = () =>
    `选中值：${value() ?? '无'}；面板创建 ${created()} 次，释放 ${disposed()} 次`;
  const modeLabel = () => (manual() ? '改为自动激活' : '改为手动激活');
  const advancedLabel = () => (advanced() ? '移除高级页' : '恢复高级页');
  const disabledLabel = () => (disabled() ? '启用高级页' : '禁用高级页');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          方向键切换标签；手动模式下按 Enter / Space 打开聚焦页。lazy
          保留已打开草稿。
        </Text>
        <Tabs
          label="个人设置"
          items={visibleItems()}
          value={value()}
          onValueChange={setValue}
          activationMode={manual() ? 'manual' : 'automatic'}
          mountStrategy="lazy"
          style={{ width: '100%' }}
        />
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          {status()}
        </Text>
        <Stack direction="row" gap="sm" wrap>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setManual((next) => !next)}
          >
            {modeLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setReverse((next) => !next)}
          >
            反转标签顺序
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setAdvanced((next) => !next)}
          >
            {advancedLabel()}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((next) => !next)}
          >
            {disabledLabel()}
          </Button>
          <Button size="sm" variant="secondary" onPress={props.toggleTheme}>
            切换标签主题
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

export default function UITabsExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => <Preview toggleTheme={() => setDark((next) => !next)} />}
    </UIProvider>
  );
}

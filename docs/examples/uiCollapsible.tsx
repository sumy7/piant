import { createState, onCleanup, Text, untrack } from '@piant/core';
import {
  Button,
  Collapsible,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Draft(props: {
  name: string;
  created: () => void;
  disposed: () => void;
}) {
  untrack(props.created);
  onCleanup(props.disposed);
  return (
    <TextField
      aria-label={props.name}
      defaultValue="编辑这段草稿，再折叠和展开"
    />
  );
}

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [disabled, setDisabled] = createState(false);
  const [created, setCreated] = createState(0);
  const [disposed, setDisposed] = createState(0);
  const content = (name: string) => () => (
    <Draft
      name={name}
      created={() => setCreated((count) => count + 1)}
      disposed={() => setDisposed((count) => count + 1)}
    />
  );
  const status = () => `内容创建 ${created()} 次，释放 ${disposed()} 次`;
  const disabledLabel = () => (disabled() ? '启用保留面板' : '禁用保留面板');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          关闭 lazy 面板保留编辑值；关闭 unmount
          面板释放内容，再打开从初始值创建。
        </Text>
        <Collapsible
          label="保留编辑内容"
          defaultOpen
          disabled={disabled()}
          mountStrategy="lazy"
        >
          {content('保留草稿')}
        </Collapsible>
        <Collapsible label="关闭释放内容" defaultOpen mountStrategy="unmount">
          {content('释放草稿')}
        </Collapsible>
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          {status()}
        </Text>
        <Stack direction="row" gap="sm" wrap>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setDisabled((next) => !next)}
          >
            {disabledLabel()}
          </Button>
          <Button size="sm" variant="secondary" onPress={props.toggleTheme}>
            切换折叠主题
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

export default function UICollapsibleExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => <Preview toggleTheme={() => setDark((next) => !next)} />}
    </UIProvider>
  );
}

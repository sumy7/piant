import { createState, Text } from '@piant/core';
import {
  Accordion,
  Button,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [single, setSingle] = createState<string | null>('account');
  const [multiple, setMultiple] = createState<readonly string[]>(['display']);
  const [disabled, setDisabled] = createState(false);
  const [reverse, setReverse] = createState(false);
  const singleItems = [
    {
      value: 'account',
      label: '账户设置',
      children: () => (
        <TextField aria-label="单开账户草稿" defaultValue="账户内容" />
      ),
    },
    {
      value: 'display',
      label: '显示设置',
      get disabled() {
        return disabled();
      },
      children: () => (
        <TextField aria-label="单开显示草稿" defaultValue="显示内容" />
      ),
    },
  ];
  const multipleItems = [
    {
      value: 'display',
      label: '画面选项',
      children: () => (
        <TextField aria-label="多开画面草稿" defaultValue="画面内容" />
      ),
    },
    {
      value: 'sound',
      label: '声音选项',
      children: () => (
        <TextField aria-label="多开声音草稿" defaultValue="声音内容" />
      ),
    },
  ];
  const ordered = () => (reverse() ? [...singleItems].reverse() : singleItems);
  const status = () =>
    `单开：${single() ?? '全部关闭'}；多开：${multiple().join('、') || '全部关闭'}`;
  const disabledLabel = () => (disabled() ? '启用显示设置' : '禁用显示设置');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          各标题都可 Tab 聚焦；上下键及 Home / End 导航，Enter / Space
          展开。keepMounted 在关闭时保留草稿。
        </Text>
        <Accordion
          type="single"
          items={ordered()}
          value={single()}
          onValueChange={setSingle}
          collapsible
          mountStrategy="keepMounted"
        />
        <Accordion
          type="multiple"
          items={multipleItems}
          value={multiple()}
          onValueChange={setMultiple}
          mountStrategy="keepMounted"
        />
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
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setReverse((next) => !next)}
          >
            反转单开标题顺序
          </Button>
          <Button size="sm" variant="secondary" onPress={props.toggleTheme}>
            切换手风琴主题
          </Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

export default function UIAccordionExample() {
  const [dark, setDark] = createState(false);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => <Preview toggleTheme={() => setDark((next) => !next)} />}
    </UIProvider>
  );
}

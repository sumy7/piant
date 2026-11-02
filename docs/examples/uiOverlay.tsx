import { createState, Text, View } from '@piant/core';
import {
  Button,
  createOverlay,
  createOverlayAnchor,
  type OverlayAnchor,
  OverlayHost,
  type OverlayState,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function NestedContent(props: { overlay: OverlayState }) {
  const theme = useUITheme();
  return (
    <Surface bordered style={{ width: '100%', height: '100%' }}>
      <Stack gap="sm">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          嵌套浮层保留主题与焦点作用域。
        </Text>
        <Button onPress={() => props.overlay.setOpen(false)}>关闭嵌套</Button>
      </Stack>
    </Surface>
  );
}

function ModalContent(props: {
  overlay: OverlayState;
  toggleTheme: () => void;
}) {
  const theme = useUITheme();
  const [anchor, setAnchor] = createState<OverlayAnchor>();
  const nested = createOverlay({
    get anchor() {
      return anchor();
    },
    width: 280,
    height: 140,
    autoFocus: true,
    children: (overlay) => <NestedContent overlay={overlay} />,
  });
  return (
    <Surface bordered style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 18 }}>
          带原生输入的模态宿主
        </Text>
        <TextField aria-label="浮层名称" defaultValue="在这里输入中文" />
        <View ref={(node) => setAnchor(createOverlayAnchor(node))}>
          <Button onPress={() => nested.setOpen(true)}>打开嵌套浮层</Button>
        </View>
        <Stack direction="row" gap="sm" wrap>
          <Button variant="secondary" onPress={props.toggleTheme}>
            切换浮层主题
          </Button>
          <Button onPress={() => props.overlay.setOpen(false)}>关闭模态</Button>
        </Stack>
      </Stack>
    </Surface>
  );
}

function Preview(props: { toggleTheme: () => void }) {
  const theme = useUITheme();
  const [anchor, setAnchor] = createState<OverlayAnchor>();
  const [message, setMessage] = createState('点击按钮打开浮层。');
  const anchored = createOverlay({
    get anchor() {
      return anchor();
    },
    width: 300,
    height: 164,
    placement: 'bottom-start',
    autoFocus: true,
    onDismiss: (reason) => {
      setMessage(`锚定浮层关闭：${reason}`);
    },
    onError: (error) => setMessage(String(error)),
    children: (overlay) => (
      <Surface bordered style={{ width: '100%', height: '100%' }}>
        <Stack gap="sm">
          <Text style={{ color: theme().colors.text, fontSize: 14 }}>
            这个面板逃离祖先裁剪，并覆盖下方原生输入。
          </Text>
          <Button onPress={() => overlay.setOpen(false)}>关闭锚定浮层</Button>
        </Stack>
      </Surface>
    ),
  });
  const modal = createOverlay({
    width: 360,
    height: 264,
    modal: true,
    outsidePointer: 'block',
    onError: (error) => setMessage(String(error)),
    children: (overlay) => (
      <ModalContent overlay={overlay} toggleTheme={props.toggleTheme} />
    ),
  });
  const status = () => {
    const placement = anchored.position()?.placement;
    return placement ? `当前方向：${placement}` : message();
  };
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 14 }}>
          浮层打开后可滚动页面；Esc 只关闭当前实例最上层。
        </Text>
        <View style={{ width: 260, height: 48, overflow: 'hidden' }}>
          <View ref={(node) => setAnchor(createOverlayAnchor(node))}>
            <Button onPress={() => anchored.setOpen(true)}>打开锚定浮层</Button>
          </View>
        </View>
        <TextField aria-label="背景名称" defaultValue="背景原生输入" />
        <Stack direction="row" gap="sm" wrap>
          <Button onPress={() => modal.setOpen(true)}>打开模态宿主</Button>
          <Button variant="secondary" onPress={props.toggleTheme}>
            切换主题
          </Button>
        </Stack>
        <Text style={{ color: theme().colors.textMuted, fontSize: 14 }}>
          {status()}
        </Text>
      </Stack>
    </Surface>
  );
}

export default function UIOverlayExample() {
  const [dark, setDark] = createState(false);
  const toggleTheme = () => setDark((value) => !value);
  return (
    <UIProvider colorMode={dark() ? 'dark' : 'light'}>
      {() => (
        <OverlayHost>{() => <Preview toggleTheme={toggleTheme} />}</OverlayHost>
      )}
    </UIProvider>
  );
}

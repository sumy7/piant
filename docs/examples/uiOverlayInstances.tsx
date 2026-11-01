import {
  attachDOMElement,
  createState,
  type MountedApp,
  mount,
  onCleanup,
  onMount,
  Show,
  Text,
  View,
} from '@piant/core';
import {
  Button,
  createOverlay,
  OverlayHost,
  Stack,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

function InstanceContent(props: { name: string }) {
  const theme = useUITheme();
  const [count, setCount] = createState(0);
  const modal = createOverlay({
    width: 260,
    height: 176,
    modal: true,
    children: (overlay) => (
      <Surface bordered style={{ width: '100%', height: '100%' }}>
        <Stack gap="sm">
          <Text style={{ color: theme().colors.text, fontSize: 14 }}>
            {props.name}
          </Text>
          <TextField
            aria-label={`${props.name}浮层输入`}
            defaultValue="独立输入"
          />
          <Button onPress={() => overlay.setOpen(false)}>关闭此实例浮层</Button>
        </Stack>
      </Surface>
    ),
  });
  const label = () => `${props.name}：计数 ${count()}`;
  return (
    <Surface tone="canvas" bordered style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ color: theme().colors.text, fontSize: 16 }}>
          {label()}
        </Text>
        <TextField
          aria-label={`${props.name}背景输入`}
          defaultValue={props.name}
        />
        <Button onPress={() => modal.setOpen(true)}>打开此实例模态</Button>
        <Button
          variant="secondary"
          onPress={() => setCount((value) => value + 1)}
        >
          增加此实例计数
        </Button>
      </Stack>
    </Surface>
  );
}

function MountedInstance(props: { name: string; dark?: boolean }) {
  const target = document.createElement('div');
  const controller = new AbortController();
  const [error, setError] = createState('');
  let instance: MountedApp | undefined;
  onMount(() => {
    void mount(
      () => (
        <UIProvider colorMode={props.dark ? 'dark' : 'light'} focusScope="isolate">
          {() => (
            <OverlayHost>
              {() => <InstanceContent name={props.name} />}
            </OverlayHost>
          )}
        </UIProvider>
      ),
      target,
      { signal: controller.signal },
    )
      .then((value) => {
        if (controller.signal.aborted) value.destroy();
        else instance = value;
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(String(cause));
      });
  });
  onCleanup(() => {
    controller.abort();
    instance?.destroy();
  });
  return (
    <View style={{ width: 300, height: 270 }}>
      <View
        ref={(node) => attachDOMElement(node, target)}
        style={{ width: 300, height: 250 }}
      />
      <Text style={{ fontSize: 12, color: '#b91c1c' }}>{error()}</Text>
    </View>
  );
}

function Preview() {
  const [right, setRight] = createState(true);
  const toggle = () => setRight((value) => !value);
  const action = () => (right() ? '卸载右侧实例' : '重挂载右侧实例');
  return (
    <Surface tone="canvas" style={{ width: '100%', height: '100%' }}>
      <Stack gap="md">
        <Text style={{ fontSize: 14, color: '#0f172a' }}>
          左侧模态打开时，右侧计数和输入仍可操作。分别测试 Esc 与卸载。
        </Text>
        <Button variant="secondary" onPress={toggle}>
          {action()}
        </Button>
        <Stack direction="row" gap="sm" wrap>
          <MountedInstance name="左侧 Canvas" />
          <Show when={right()}>
            {() => <MountedInstance name="右侧 Canvas" dark />}
          </Show>
        </Stack>
      </Stack>
    </Surface>
  );
}

export default function UIOverlayInstancesExample() {
  return <UIProvider>{() => <Preview />}</UIProvider>;
}

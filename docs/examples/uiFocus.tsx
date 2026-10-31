import { createState, Input, Text, View } from '@piant/core';
import {
  createFocusable,
  createPressable,
  createRovingFocusGroup,
  UIProvider,
  useUIFocus,
} from '@piant/ui';

interface FocusButtonProps {
  name: string;
  disabled?: boolean;
  group?: ReturnType<typeof createRovingFocusGroup>;
  onActivate: () => void;
}

function FocusButton(props: FocusButtonProps) {
  const [focus, setFocus] = createState<ReturnType<typeof createFocusable>>();
  const [press, setPress] = createState<ReturnType<typeof createPressable>>();
  const label = () => props.name;
  const activate = () => props.onActivate();
  return (
    <View
      ref={(node) => {
        setFocus(
          createFocusable(node, {
            get name() {
              return props.name;
            },
            get disabled() {
              return props.disabled;
            },
            group: props.group,
            onActivate: activate,
          }),
        );
        setPress(
          createPressable(node, {
            get disabled() {
              return props.disabled;
            },
            onPress: activate,
          }),
        );
      }}
      style={{
        padding: 12,
        borderWidth: 3,
        borderColor: focus()?.focusVisible() ? '#fbbf24' : 'transparent',
        borderRadius: 8,
        backgroundColor: props.disabled
          ? '#64748b'
          : press()?.pressed() || focus()?.pressed()
            ? '#1e3a8a'
            : '#1d4ed8',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 16, lineHeight: 24 }}>
        {label()}
      </Text>
    </View>
  );
}

function FocusContent() {
  const scope = useUIFocus();
  const [count, setCount] = createState(0);
  const [disabled, setDisabled] = createState(false);
  const [last, setLast] = createState('尚未操作');
  const [inputFocus, setInputFocus] =
    createState<ReturnType<typeof createFocusable>>();
  const group = createRovingFocusGroup({
    role: 'toolbar',
    name: '计数操作',
    orientation: 'horizontal',
    loop: true,
  });
  const change = (delta: number, action: string) => {
    setCount((previous) => previous + delta);
    setLast(action);
  };
  const status = () =>
    `计数：${count()}；最近动作：${last()}；焦点：${scope.focused()?.getAttribute('aria-label') ?? '无'}`;
  return (
    <View style={{ padding: 16, width: '100%' }}>
      <Text style={{ color: '#0f172a', fontSize: 16, lineHeight: 24 }}>
        Tab 切换控件；Enter/Space 激活；操作组内使用左右箭头和 Home/End。
      </Text>
      <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
        <FocusButton
          name="增加计数"
          disabled={disabled()}
          onActivate={() => change(1, '增加计数')}
        />
        <FocusButton
          name="切换首项禁用"
          onActivate={() => setDisabled((previous) => !previous)}
        />
        <FocusButton name="聚焦首项" onActivate={() => scope.focusFirst()} />
      </View>
      <Input
        defaultValue="在这里编辑，验证原生输入"
        ref={(node) => {
          setInputFocus(
            createFocusable(node, {
              name: '示例名称',
              description: '可编辑文本。Tab 离开输入框，文字编辑保持原生行为。',
              domElement: node.domElement,
            }),
          );
        }}
        style={{
          width: 360,
          height: 40,
          marginTop: 16,
          backgroundColor: '#f1f5f9',
          borderWidth: 3,
          borderColor: inputFocus()?.focusVisible() ? '#fbbf24' : '#64748b',
          borderRadius: 4,
        }}
      />
      <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
        <FocusButton
          name="组内加一"
          group={group}
          onActivate={() => change(1, '组内加一')}
        />
        <FocusButton
          name="组内禁用项"
          group={group}
          disabled
          onActivate={() => change(100, '不应触发')}
        />
        <FocusButton
          name="组内减一"
          group={group}
          onActivate={() => change(-1, '组内减一')}
        />
      </View>
      <Text
        style={{
          marginTop: 16,
          color: '#0f172a',
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {status()}
      </Text>
    </View>
  );
}

export default function UIFocusExample() {
  return <UIProvider>{() => <FocusContent />}</UIProvider>;
}

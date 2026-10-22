import {
  type AnimationGroup,
  animate,
  bindAnimation,
  drag,
  fade,
  hover,
  press,
  scale,
  sequence,
  stagger,
} from '@piant/animation';
import {
  createState,
  onCleanup,
  type PNode,
  Show,
  Text,
  Transition,
  View,
} from '@piant/core';

const label = { color: '#e2e8f0', fontSize: 14 } as const;
const button = {
  padding: 10,
  borderRadius: 8,
  backgroundColor: '#4f46e5',
} as const;
const square = {
  width: 52,
  height: 44,
  borderRadius: 8,
  backgroundColor: '#14b8a6',
} as const;

export function WorkflowDemo() {
  const [expanded, setExpanded] = createState(false);
  const [visible, setVisible] = createState(true);
  const nodes: PNode[] = [];
  let group: AnimationGroup | undefined;
  onCleanup(() => group?.cancel());
  const replay = () => {
    group?.cancel();
    group = sequence([
      () =>
        stagger(
          nodes.map(
            (node) => () =>
              animate(node, [{ y: 0 }, { y: -25 }], {
                duration: 300,
                fill: 'forwards',
              }),
          ),
          150,
        ),
      () =>
        stagger(
          nodes.map(
            (node) => () =>
              animate(node, [{ y: -25 }, { y: 0 }], {
                duration: 300,
                fill: 'forwards',
              }),
          ),
          150,
        ),
    ]);
  };
  return (
    <View style={{ width: '100%', padding: 24, gap: 18 }}>
      <Text style={label}>状态目标与预设（快速点击可中断反转）</Text>
      <View style={button} onClick={() => setExpanded((value) => !value)}>
        <Text style={label}>切换目标</Text>
      </View>
      <View style={{ height: 58 }}>
        <View
          style={square}
          ref={(node) => {
            bindAnimation(
              node,
              () => ({ x: expanded() ? 180 : 0, scale: expanded() ? 1.2 : 1 }),
              { duration: 500 },
            );
          }}
        />
      </View>
      <View style={button} onClick={() => setVisible((value) => !value)}>
        <Text style={label}>切换 fade 卡片</Text>
      </View>
      <View style={{ height: 50 }}>
        {Transition({
          ...fade({ duration: 350 }),
          children: Show({
            get when() {
              return visible();
            },
            children: (_value) => <View style={square} />,
          }),
        })}
      </View>
      <Text style={label}>Sequence + stagger</Text>
      <View style={{ flexDirection: 'row', gap: 20, paddingTop: 30 }}>
        {[0, 1, 2].map((index) => (
          <View
            style={square}
            ref={(node) => {
              nodes[index] = node;
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={button} onClick={replay}>
          <Text style={label}>运行编排</Text>
        </View>
        <View style={button} onClick={() => group?.cancel()}>
          <Text style={label}>取消</Text>
        </View>
      </View>
      <Text style={label}>Hover / press / drag</Text>
      <View style={{ flexDirection: 'row', gap: 30 }}>
        <View
          style={button}
          ref={(node) => {
            hover(node, { scale: 1.12 });
          }}
        >
          <Text style={label}>Hover</Text>
        </View>
        <View
          style={button}
          ref={(node) => {
            press(node, { scale: 0.8 });
          }}
        >
          <Text style={label}>Press</Text>
        </View>
        <View
          style={button}
          ref={(node) => {
            drag(node, {
              returnToOrigin: true,
              bounds: { minX: -30, maxX: 60 },
            });
          }}
        >
          <Text style={label}>Drag</Text>
        </View>
      </View>
      <View style={{ height: 50 }}>
        {Transition({
          ...scale({ from: 0.6, duration: 400 }),
          appear: true,
          children: <View style={square} />,
        })}
      </View>
    </View>
  );
}

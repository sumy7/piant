import { bindAnimation, fade, scale, slide } from '@piant/animation';
import { createState, Show, Text, Transition, View } from '@piant/core';

const button = {
  padding: 10,
  borderRadius: 8,
  backgroundColor: '#4f46e5',
} as const;
const label = { color: '#ffffff', fontSize: 14 } as const;
const square = {
  width: 54,
  height: 44,
  borderRadius: 8,
  backgroundColor: '#14b8a6',
} as const;

export default function AnimationState() {
  const [expanded, setExpanded] = createState(false);
  const presets = [
    { title: 'fade', hooks: fade({ duration: 500 }) },
    { title: 'slide', hooks: slide({ x: 50, y: 0, duration: 500 }) },
    { title: 'scale', hooks: scale({ from: 0.3, duration: 500 }) },
  ];

  return (
    <View style={{ width: '100%', height: '100%', padding: 16, gap: 12 }}>
      <View style={button} onClick={() => setExpanded((value) => !value)}>
        <Text style={label}>切换目标（可快速反转）</Text>
      </View>
      <View style={{ height: 55, paddingTop: 5 }}>
        <View
          style={square}
          ref={(node) => {
            bindAnimation(
              node,
              () =>
                expanded()
                  ? { x: 140, alpha: 0.45, scale: 1.15 }
                  : { x: 0, alpha: 1, scale: 1 },
              { duration: 650, easing: 'ease-in-out' },
            );
          }}
        />
      </View>
      {presets.map(({ title, hooks }) => {
        const [visible, setVisible] = createState(true);
        return (
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              alignItems: 'center',
              height: 50,
            }}
          >
            <View
              style={{ ...button, width: 110 }}
              onClick={() => setVisible((value) => !value)}
            >
              <Text style={label}>{title}</Text>
            </View>
            {Transition({
              ...hooks,
              appear: true,
              children: Show({
                get when() {
                  return visible();
                },
                children: (_value) => <View style={square} />,
              }),
            })}
          </View>
        );
      })}
    </View>
  );
}

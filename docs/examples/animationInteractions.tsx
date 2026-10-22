import { drag, hover, press } from '@piant/animation';
import { createState, Text, View } from '@piant/core';

export default function AnimationInteractions() {
  const [clicks, setClicks] = createState(0);
  const clickLabel = () => `业务点击次数：${clicks()}`;
  const card = {
    width: 100,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  const text = { color: '#ffffff', fontSize: 14 } as const;
  return (
    <View style={{ width: '100%', height: '100%', padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 30 }}>
        <View
          style={card}
          ref={(node) => {
            hover(node, { scale: 1.12 }, { duration: 180 });
          }}
        >
          <Text style={text}>Hover</Text>
        </View>
        <View
          style={card}
          onClick={() => setClicks((value) => value + 1)}
          ref={(node) => {
            press(node, { scale: 0.85, alpha: 0.6 }, { duration: 160 });
          }}
        >
          <Text style={text}>Press</Text>
        </View>
      </View>
      <Text style={{ color: '#171717', fontSize: 14 }}>{clickLabel}</Text>
      <View
        style={{
          width: 260,
          height: 90,
          padding: 10,
          backgroundColor: '#e2e8f0',
        }}
        ref={(node) => {
          // Deliberately transformed parent: drag still uses local coordinates.
          node._view.scale.set(0.9);
          node._view.rotation = 0.04;
        }}
      >
        <View
          style={{ ...card, width: 85, height: 50, backgroundColor: '#0d9488' }}
          ref={(node) => {
            drag(node, {
              bounds: { minX: 0, maxX: 155, minY: 0, maxY: 20 },
              returnToOrigin: true,
              duration: 300,
            });
          }}
        >
          <Text style={text}>Drag</Text>
        </View>
      </View>
    </View>
  );
}

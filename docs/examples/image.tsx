import { createState, Image, onCleanup, Text, View } from '@piant/core';
import { Graphics } from 'pixi.js';

export default function App() {
  const modes = ['contain', 'cover', 'fill', 'none'] as const;
  const [index, setIndex] = createState(0);
  const mode = () => modes[index()];
  const label = () => `objectFit: ${mode()}`;
  // 固定的 240 × 120 图形：圆形与两侧色块使裁剪和拉伸容易辨认。
  const picture = new Graphics()
    .rect(0, 0, 240, 120)
    .fill('#c7d2fe')
    .rect(0, 0, 40, 120)
    .fill('#4f46e5')
    .rect(200, 0, 40, 120)
    .fill('#f97316')
    .circle(120, 60, 44)
    .fill('#ffffff')
    .circle(120, 60, 22)
    .fill('#14b8a6');
  onCleanup(() => picture.destroy());

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <Image
        src={picture}
        style={{
          width: 168,
          height: 140,
          backgroundColor: '#e2e8f0',
          borderRadius: 10,
          objectFit: mode(),
          overflow: 'hidden',
        }}
      />
      <Text style={{ color: '#0f172a', fontSize: 16 }}>{label()}</Text>
      <View
        style={{
          width: 168,
          height: 40,
          borderRadius: 8,
          backgroundColor: '#4f46e5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setIndex((value) => (value + 1) % modes.length)}
      >
        <Text style={{ color: '#ffffff', fontSize: 16 }}>切换适配方式</Text>
      </View>
    </View>
  );
}

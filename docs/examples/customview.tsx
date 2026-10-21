import { CustomView, createState, Text, View } from '@piant/core';

export default function App() {
  const [progress, setProgress] = createState(0.25);
  const label = () => `绘制进度：${Math.round(progress() * 100)}%`;
  const advance = () => setProgress((value) => (value >= 1 ? 0 : value + 0.25));

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <Text style={{ color: '#0f172a', fontSize: 18 }}>{label()}</Text>
      <CustomView
        style={{ width: '100%', maxWidth: 280, height: 64 }}
        onClick={advance}
        onDraw={(graphics, width, height) => {
          const value = progress();
          graphics.clear();
          if (width <= 0 || height <= 0) return;
          graphics.roundRect(0, 0, width, height, 12).fill('#e2e8f0');
          if (value > 0) {
            graphics.roundRect(0, 0, width * value, height, 12).fill('#4f46e5');
          }
        }}
      />
      <View
        style={{
          width: 168,
          height: 40,
          borderRadius: 8,
          backgroundColor: '#4f46e5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={advance}
      >
        <Text style={{ color: '#ffffff', fontSize: 16 }}>增加 25% / 重置</Text>
      </View>
    </View>
  );
}

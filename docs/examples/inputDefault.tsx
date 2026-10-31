import { createState, Input, Text, View } from '@piant/core';

export default function App() {
  const [value, setValue] = createState('初始内容');
  const label = () => `最近输入：${value()}`;

  return (
    <View style={{ width: '100%', height: '100%', padding: 20, gap: 16 }}>
      <Input
        defaultValue="初始内容"
        aria-label="非受控输入"
        onInput={(nextValue) => setValue(nextValue)}
        style={{
          width: '100%',
          height: 40,
          padding: 8,
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontSize: 16,
        }}
      />
      <Text style={{ color: '#0f172a', fontSize: 16 }}>{label()}</Text>
    </View>
  );
}

import { createState, Input, Text, View } from '@piant/core';

export default function App() {
  const [value, setValue] = createState('初始内容');
  const label = () => `最近输入：${value()}`;

  return (
    <View style={{ width: '100%', height: '100%', padding: 20, gap: 16 }}>
      <Input
        defaultValue="初始内容"
        onInput={(nextValue) => setValue(nextValue)}
        style={{ width: '100%', height: 40, backgroundColor: '#ffffff' }}
        ref={(node) => {
          node._inputElement.setAttribute('aria-label', '非受控输入');
          node._inputElement.style.color = '#0f172a';
          node._inputElement.style.fontSize = '16px';
        }}
      />
      <Text style={{ color: '#0f172a', fontSize: 16 }}>{label()}</Text>
    </View>
  );
}

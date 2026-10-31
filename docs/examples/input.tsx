import { createState, Input, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    padding: 20,
    gap: 12,
  },
  input: {
    width: '100%',
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  text: { color: '#0f172a', fontSize: 16 },
  button: {
    width: 160,
    height: 40,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function App() {
  const [value, setValue] = createState('Piant');
  const [lastChange, setLastChange] = createState('尚未提交');
  const [focused, setFocused] = createState(false);
  let inputElement: HTMLInputElement | undefined;
  const valueLabel = () => `当前值：${value()}`;
  const changeLabel = () => `上次 change：${lastChange()}`;
  const focusLabel = () => (focused() ? '输入框已聚焦' : '输入框未聚焦');

  return (
    <View style={styles.container}>
      <Input
        style={styles.input}
        value={value()}
        placeholder="输入名称"
        onInput={(nextValue) => setValue(nextValue)}
        onChange={(nextValue) => setLastChange(nextValue)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        ref={(node) => {
          inputElement = node.element;
          inputElement.setAttribute('aria-label', '名称');
          inputElement.style.color = '#0f172a';
          inputElement.style.fontSize = '16px';
        }}
      />
      <Text style={styles.text}>{valueLabel()}</Text>
      <Text style={styles.text}>{changeLabel()}</Text>
      <Text style={styles.text}>{focusLabel()}</Text>
      <View
        style={styles.button}
        onClick={() => {
          setValue('');
          inputElement?.focus();
        }}
      >
        <Text style={styles.text}>清空并聚焦</Text>
      </View>
    </View>
  );
}

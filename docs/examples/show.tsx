import { createState, Show, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  text: { color: '#171717', fontSize: 18 },
  button: {
    width: 144,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
});

export default function App() {
  const [visible, setVisible] = createState(true);
  const buttonLabel = () => (visible() ? '隐藏内容' : '显示内容');

  return (
    <View style={styles.container}>
      <Show
        when={visible()}
        fallback={<Text style={styles.text}>内容已隐藏（fallback）</Text>}
      >
        <Text style={styles.text}>你好，Piant！</Text>
      </Show>
      <View style={styles.button} onClick={() => setVisible((value) => !value)}>
        <Text style={styles.buttonText}>{buttonLabel()}</Text>
      </View>
    </View>
  );
}

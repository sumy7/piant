import { createMemo, createState, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
  const [count, setCount] = createState(0);
  const doubled = createMemo(() => count() * 2);
  const countLabel = () => `计数：${count()}`;
  const doubledLabel = () => `派生值（× 2）：${doubled()}`;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{countLabel()}</Text>
      <Text style={styles.text}>{doubledLabel()}</Text>
      <View
        style={styles.button}
        onClick={() => setCount((value) => value + 1)}
      >
        <Text style={styles.buttonText}>点击 +1</Text>
      </View>
    </View>
  );
}

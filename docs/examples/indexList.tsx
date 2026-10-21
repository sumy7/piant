import { createState, Index, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#4f46e5' },
  buttonText: { color: '#ffffff', fontSize: 16 },
  row: { width: 220, padding: 10, borderRadius: 8, backgroundColor: '#e0e7ff' },
  text: { color: '#1e293b', fontSize: 16 },
});

export default function App() {
  const [values, setValues] = createState([10, 20, 30]);
  return (
    <View style={styles.root}>
      <View
        style={styles.button}
        onClick={() => setValues((items) => items.map((value) => value + 1))}
      >
        <Text style={styles.buttonText}>每个位置 +1</Text>
      </View>
      <Index each={values()}>
        {(item, index) => {
          const label = () => `位置 ${index + 1}：${item()}`;
          return (
            <View style={styles.row}>
              <Text style={styles.text}>{label()}</Text>
            </View>
          );
        }}
      </Index>
    </View>
  );
}

import { createState, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    width: 184,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
  layout: {
    width: 224,
    height: 176,
    padding: 12,
    gap: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 44,
    height: 44,
    backgroundColor: '#4f46e5',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function App() {
  const [direction, setDirection] = createState<'row' | 'column'>('row');
  const buttonLabel = () => `当前方向：${direction()}`;
  const toggleDirection = () =>
    setDirection((value) => (value === 'row' ? 'column' : 'row'));

  return (
    <View style={styles.container}>
      <View style={styles.button} onClick={toggleDirection}>
        <Text style={styles.buttonText}>{buttonLabel()}</Text>
      </View>
      <View style={[styles.layout, { flexDirection: direction() }]}>
        <View style={styles.box}>
          <Text style={styles.buttonText}>1</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.buttonText}>2</Text>
        </View>
        <View style={styles.box}>
          <Text style={styles.buttonText}>3</Text>
        </View>
      </View>
    </View>
  );
}

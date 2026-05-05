import { StyleSheet, Text, View } from '@piant/core';
import { Clock } from './Clock';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
});

export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clock</Text>
      <Clock />
    </View>
  );
}

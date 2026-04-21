import { StyleSheet, View, Text, createState } from '@piant/core';

export function App() {
  const [count, setCount] = createState(0);

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      width: 160,
      height: 48,
      backgroundColor: '#5548e8',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      color: 'white',
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.button} onClick={() => setCount(count() + 1)}>
        <Text style={styles.text}>点击了 {count()} 次</Text>
      </View>
    </View>
  );
}

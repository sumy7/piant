import { StyleSheet, Text, View } from '@piant/core';
import { createStore } from '@piant/store';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controls: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  button: {
    width: 64,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 20 },
  text: { color: '#171717', fontSize: 18 },
});

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export default function App() {
  // 每个示例实例创建自己的 store，两个子组件共享这一份状态。
  const useCounterStore = createStore<CounterState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }));

  function Counter() {
    const store = useCounterStore();
    const label = () => `计数：${store.count}`;
    return (
      <View style={styles.controls}>
        <View style={styles.button} onClick={store.decrement}>
          <Text style={styles.buttonText}>−</Text>
        </View>
        <Text style={styles.text}>{label()}</Text>
        <View style={styles.button} onClick={store.increment}>
          <Text style={styles.buttonText}>+</Text>
        </View>
      </View>
    );
  }

  function StatusBar() {
    const store = useCounterStore();
    const label = () => `另一个组件读到：${store.count}`;
    return <Text style={styles.text}>{label()}</Text>;
  }

  return (
    <View style={styles.container}>
      <Counter />
      <StatusBar />
    </View>
  );
}

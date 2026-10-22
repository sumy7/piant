import {
  createState,
  For,
  onCleanup,
  StyleSheet,
  Text,
  View,
} from '@piant/core';
import { createStore, createStoreHistory } from '@piant/store';

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', padding: 16, gap: 12 },
  controls: { flexDirection: 'row', gap: 8 },
  button: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 14 },
  text: { color: '#0f172a', fontSize: 16 },
  entries: { gap: 6 },
  entry: { padding: 8, borderRadius: 6, backgroundColor: '#e2e8f0' },
  selected: { backgroundColor: '#c7d2fe' },
});

interface CounterState {
  count: number;
  increment: () => void;
}

export default function App() {
  const useCounter = createStore<CounterState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));
  const history = createStoreHistory(useCounter, {
    enabled: true,
    name: '在线计数器',
    maxEntries: 5,
  })!;
  const [snapshot, setSnapshot] = createState(history.snapshot());
  const unsubscribe = history.subscribe(() => setSnapshot(history.snapshot()));
  onCleanup(() => {
    unsubscribe();
    history.dispose();
  });
  const store = useCounter();
  const countLabel = () => `当前计数：${store.count}`;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.button} onClick={store.increment}>
          <Text style={styles.buttonText}>增加计数</Text>
        </View>
        <View style={styles.button} onClick={() => history.clear()}>
          <Text style={styles.buttonText}>清空历史</Text>
        </View>
      </View>
      <Text style={styles.text}>{countLabel()}</Text>
      <View style={styles.entries}>
        <For each={[...snapshot().entries]}>
          {(entry) => {
            const label = () => {
              const count = (entry.state as { count: number }).count;
              const current =
                entry.id === snapshot().currentId ? '（当前）' : '';
              return `记录 ${entry.id}：${count} ${current}`;
            };
            return (
              <View
                style={[
                  styles.entry,
                  entry.id === snapshot().currentId && styles.selected,
                ]}
                onClick={() => history.restore(entry.id)}
              >
                <Text style={styles.text}>{label()}</Text>
              </View>
            );
          }}
        </For>
      </View>
    </View>
  );
}

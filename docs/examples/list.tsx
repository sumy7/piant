import { createState, For, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controls: { flexDirection: 'row', gap: 8 },
  button: {
    width: 100,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
  list: { width: 208, height: 144, gap: 8, justifyContent: 'center' },
  text: { color: '#171717', fontSize: 16 },
});

export default function App() {
  const [items, setItems] = createState(['项目 1', '项目 2']);
  let nextId = 3;
  const addItem = () => {
    if (items().length < 4) setItems((value) => [...value, `项目 ${nextId++}`]);
  };
  const removeItem = () => setItems((value) => value.slice(0, -1));

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.button} onClick={addItem}>
          <Text style={styles.buttonText}>添加</Text>
        </View>
        <View style={styles.button} onClick={removeItem}>
          <Text style={styles.buttonText}>移除末项</Text>
        </View>
      </View>
      <View style={styles.list}>
        <For
          each={items()}
          fallback={<Text style={styles.text}>暂无项目</Text>}
        >
          {(item, index) => {
            const label = () => `${index() + 1}. ${item}`;
            return <Text style={styles.text}>{label()}</Text>;
          }}
        </For>
      </View>
      <Text style={styles.text}>最多 4 项，清空显示 fallback</Text>
    </View>
  );
}

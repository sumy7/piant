import {
  createState,
  Match,
  StyleSheet,
  Switch,
  Text,
  View,
} from '@piant/core';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#4f46e5' },
  buttonText: { color: '#ffffff', fontSize: 16 },
  text: { color: '#1e293b', fontSize: 20 },
});

export default function App() {
  const [status, setStatus] = createState(0);
  return (
    <View style={styles.root}>
      <View
        style={styles.button}
        onClick={() => setStatus((value) => (value + 1) % 4)}
      >
        <Text style={styles.buttonText}>切换状态</Text>
      </View>
      <Switch fallback={<Text style={styles.text}>未知状态（fallback）</Text>}>
        <Match when={status() === 0}>
          <Text style={styles.text}>加载中…</Text>
        </Match>
        <Match when={status() === 1}>
          <Text style={{ ...styles.text, color: '#15803d' }}>加载成功！</Text>
        </Match>
        <Match when={status() === 2}>
          <Text style={{ ...styles.text, color: '#b91c1c' }}>
            加载失败，请重试
          </Text>
        </Match>
      </Switch>
    </View>
  );
}

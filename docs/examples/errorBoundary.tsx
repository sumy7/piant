import {
  createState,
  ErrorBoundary,
  Show,
  StyleSheet,
  Text,
  View,
} from '@piant/core';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#4f46e5' },
  buttonText: { color: '#ffffff', fontSize: 16 },
  panel: { alignItems: 'center', gap: 12 },
  text: { color: '#1e293b', fontSize: 16 },
});

function BrokenPanel(): JSX.Element {
  // The error occurs while creating the child component, not in the click handler.
  throw new Error('演示组件渲染失败');
}

function RecoverablePanel() {
  const [broken, setBroken] = createState(false);
  return (
    <Show
      when={broken()}
      fallback={
        <View style={styles.panel}>
          <Text style={styles.text}>子组件正常显示</Text>
          <View style={styles.button} onClick={() => setBroken(true)}>
            <Text style={styles.buttonText}>触发渲染错误</Text>
          </View>
        </View>
      }
    >
      {(_value) => <BrokenPanel />}
    </Show>
  );
}

function RecoverableBoundary() {
  // A direct getter creates a fresh child tree after reset. Pre-creating the
  // Show would reuse its disposed effects and already-destroyed render nodes.
  return ErrorBoundary({
    get children() {
      return <RecoverablePanel />;
    },
    fallback: (error, reset) => {
      const message = `已捕获：${error.message}`;
      return (
        <View style={styles.panel}>
          <Text style={styles.text}>{message}</Text>
          <View style={styles.button} onClick={reset}>
            <Text style={styles.buttonText}>修复并重置</Text>
          </View>
        </View>
      );
    },
  });
}

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>外层界面始终可用</Text>
      <RecoverableBoundary />
    </View>
  );
}

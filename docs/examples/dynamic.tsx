import { createState, Dynamic, StyleSheet, Text, View } from '@piant/core';

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
  card: {
    width: 220,
    height: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { color: '#1e293b', fontSize: 18 },
});

function Profile() {
  return (
    <View style={{ ...styles.card, backgroundColor: '#dbeafe' }}>
      <Text style={styles.text}>个人资料组件</Text>
      <Text style={styles.text}>你好，Piant</Text>
    </View>
  );
}

function Settings() {
  return (
    <View style={{ ...styles.card, backgroundColor: '#dcfce7' }}>
      <Text style={styles.text}>设置组件</Text>
      <Text style={styles.text}>通知已开启</Text>
    </View>
  );
}

export default function App() {
  const [settings, setSettings] = createState(false);
  return (
    <View style={styles.root}>
      <View
        style={styles.button}
        onClick={() => setSettings((value) => !value)}
      >
        <Text style={styles.buttonText}>切换组件</Text>
      </View>
      <Dynamic component={settings() ? Settings : Profile} />
    </View>
  );
}

import { onCleanup, StyleSheet, Text, View } from '@piant/core';
import { createDemoUserLoader, createUserStore } from './storeAsyncModel';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    padding: 16,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 14 },
  text: { color: '#171717', fontSize: 16 },
});

export default function App() {
  const useUserStore = createUserStore(createDemoUserLoader());
  const store = useUserStore();
  onCleanup(store.cancel);

  const statusLabel = () => (store.loading ? '加载中…' : '等待操作');
  const requestLabel = () => `最近请求：用户 ${store.requestedId}`;
  const dataLabel = () =>
    store.data
      ? `上次成功数据：ID ${store.data.id}，${store.data.name}`
      : '上次成功数据：暂无';
  const errorLabel = () => `错误：${store.error ?? '无'}`;

  // 视图通过 error 显示失败；业务调用方也可 await 并检查 LoadResult。
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View
          style={styles.button}
          onClick={() => {
            void store.load(1);
          }}
        >
          <Text style={styles.buttonText}>加载用户1</Text>
        </View>
        <View
          style={styles.button}
          onClick={() => {
            void store.load(2);
          }}
        >
          <Text style={styles.buttonText}>加载用户2</Text>
        </View>
        <View
          style={styles.button}
          onClick={() => {
            void store.retry();
          }}
        >
          <Text style={styles.buttonText}>重试</Text>
        </View>
        <View style={styles.button} onClick={store.cancel}>
          <Text style={styles.buttonText}>取消</Text>
        </View>
      </View>
      <Text style={styles.text}>{statusLabel()}</Text>
      <Text style={styles.text}>{requestLabel()}</Text>
      <Text style={styles.text}>{dataLabel()}</Text>
      <Text style={styles.text}>{errorLabel()}</Text>
    </View>
  );
}

import { fade } from '@piant/animation';
import { onCleanup, StyleSheet, Text, View } from '@piant/core';
import {
  createRouter,
  RouterProvider,
  RouteView,
  useNavigate,
  useRoute,
} from '@piant/router';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controls: { flexDirection: 'row', gap: 12 },
  button: {
    width: 96,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
  text: { color: '#171717', fontSize: 18 },
});

function HomePage() {
  return <Text style={styles.text}>欢迎来到首页</Text>;
}

function AboutPage() {
  return <Text style={styles.text}>这里是关于页面</Text>;
}

function Navigation() {
  const navigate = useNavigate();
  const route = useRoute();
  const pathLabel = () => `当前路径：${route().path}`;
  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <View style={styles.button} onClick={() => navigate('/')}>
          <Text style={styles.buttonText}>首页</Text>
        </View>
        <View style={styles.button} onClick={() => navigate('/about')}>
          <Text style={styles.buttonText}>关于</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.button} onClick={() => navigate('/lazy')}>
          <Text style={styles.buttonText}>异步页面</Text>
        </View>
        <View style={styles.button} onClick={() => navigate('/error')}>
          <Text style={styles.buttonText}>加载错误</Text>
        </View>
        <View
          style={styles.button}
          onClick={() => {
            navigate('/about');
            queueMicrotask(() => navigate('/'));
          }}
        >
          <Text style={styles.buttonText}>快速切换</Text>
        </View>
      </View>
      <RouteView
        transition={{
          ...fade({ duration: 400 }),
          mode: 'out-in',
          appear: true,
        }}
        loadingFallback={() => <Text style={styles.text}>正在加载…</Text>}
        errorFallback={() => (
          <Text style={styles.text}>加载失败；点击首页恢复</Text>
        )}
      />
      <Text style={styles.text}>{pathLabel()}</Text>
    </View>
  );
}

export default function App() {
  const router = createRouter({
    mode: 'memory',
    initialPath: '/',
    routes: [
      { path: '/', component: HomePage },
      { path: '/about', component: AboutPage },
      {
        path: '/lazy',
        loader: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ default: AboutPage }), 1200),
          ),
      },
      {
        path: '/error',
        loader: async () => {
          throw new Error('演示加载失败');
        },
      },
    ],
  });
  onCleanup(() => router.destroy());
  return (
    <RouterProvider router={router}>{() => <Navigation />}</RouterProvider>
  );
}

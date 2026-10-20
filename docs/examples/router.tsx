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
      <RouteView />
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
    ],
  });
  onCleanup(() => router.destroy());
  return (
    <RouterProvider router={router}>{() => <Navigation />}</RouterProvider>
  );
}

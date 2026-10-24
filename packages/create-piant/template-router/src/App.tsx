import { onCleanup, StyleSheet, Text, View } from '@piant/core';
import {
  createRouter,
  RouterProvider,
  RouteView,
  useNavigate,
  useRoute,
} from '@piant/router';

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121b2b',
    gap: 24,
    padding: 24,
  },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { padding: 16, backgroundColor: '#5548e8', borderRadius: 8 },
  text: { color: '#ffffff', fontSize: 18 },
  title: { color: '#ffffff', fontSize: 28 },
});

function HomePage() {
  return <Text style={styles.title}>Home — welcome to Piant Router</Text>;
}

function UserPage() {
  const route = useRoute();
  const label = () => `User profile: ${route().params.id}`;
  return <Text style={styles.title}>{label()}</Text>;
}

function Navigation() {
  const navigate = useNavigate();
  return (
    <View style={styles.navigation}>
      <View style={styles.button} onClick={() => navigate('/')}>
        <Text style={styles.text}>Home</Text>
      </View>
      <View style={styles.button} onClick={() => navigate('/users/42')}>
        <Text style={styles.text}>User 42</Text>
      </View>
      <View style={styles.button} onClick={() => navigate('/users/99')}>
        <Text style={styles.text}>User 99</Text>
      </View>
    </View>
  );
}

export function App() {
  // Each mounted application owns and releases its Router and history listener.
  const router = createRouter({
    mode: 'browser',
    routes: [
      { path: '/', component: HomePage },
      { path: '/users/:id', component: UserPage },
    ],
  });
  onCleanup(() => router.destroy());

  return (
    <RouterProvider router={router}>
      {() => (
        <View style={styles.page}>
          <Navigation />
          <RouteView
            fallback={() => <Text style={styles.title}>Page not found</Text>}
          />
        </View>
      )}
    </RouterProvider>
  );
}

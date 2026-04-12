import { Match, Show, StyleSheet, Switch, Text, View } from '@piant/core';
import {
  RouterProvider,
  createRouter,
  useNavigate,
  useRoute,
} from '@piant/router';

const router = createRouter({
  routes: [{ path: '/' }, { path: '/users/:id' }, { path: '/search' }],
});

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121b2b',
    padding: 32,
  },
  panel: {
    width: 820,
    maxWidth: '100%',
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#1f2a44',
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#f7f9ff',
  },
  subtitle: {
    fontSize: 16,
    color: '#a8bddf',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  navItem: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 999,
    backgroundColor: '#31466f',
  },
  navItemText: {
    color: '#f7f9ff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTag: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b',
  },
  activeTagText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1c1c1c',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#28395d',
    gap: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  cardBody: {
    color: '#d0dcf5',
    fontSize: 15,
  },
  inlineCode: {
    color: '#fbbf24',
    fontWeight: '700',
  },
});

function RouteInspector() {
  const route = useRoute();

  const pathText = () => `Current path: ${route().path}`;
  const matchedText = () =>
    `Matched route: ${route().match?.route.path ?? 'none'}`;
  const paramsText = () => `Params: ${JSON.stringify(route().params)}`;
  const queryText = () => `Query: ${JSON.stringify(route().query)}`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Route Inspector</Text>
      <Text style={styles.cardBody}>{pathText()}</Text>
      <Text style={styles.cardBody}>{matchedText()}</Text>
      <Text style={styles.cardBody}>{paramsText()}</Text>
      <Text style={styles.cardBody}>{queryText()}</Text>
    </View>
  );
}

function HomePage() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Home</Text>
      <Text style={styles.cardBody}>
        Click navigation pills to test static route, dynamic params, and query
        parsing.
      </Text>
    </View>
  );
}

function UserPage() {
  const route = useRoute();
  const userId = () => route().params.id || 'unknown';
  const text = () => `User detail page for id = ${userId()}`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>User Detail</Text>
      <Text style={styles.cardBody}>{text()}</Text>
    </View>
  );
}

function SearchPage() {
  const route = useRoute();
  const keyword = () => {
    const raw = route().query.keyword;
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || '';
  };
  const tags = () => {
    const raw = route().query.tag;
    if (Array.isArray(raw)) return raw.join(', ');
    return raw || '';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Search</Text>
      <Text style={styles.cardBody}>keyword = {keyword()}</Text>
      <Text style={styles.cardBody}>tag = {tags()}</Text>
    </View>
  );
}

function RouterDemo() {
  const navigate = useNavigate();
  const route = useRoute();
  const current = () => route().path;

  const navTo = (to: string) => () => navigate(to);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>@piant/router Basic Demo</Text>
      <Text style={styles.subtitle}>
        APIs: createRouter, RouterProvider, useRoute, useNavigate
      </Text>

      <View style={styles.navRow}>
        <View style={styles.navItem} onClick={navTo('/')}>
          <Text style={styles.navItemText}>Home</Text>
        </View>
        <View style={styles.navItem} onClick={navTo('/users/42')}>
          <Text style={styles.navItemText}>User 42</Text>
        </View>
        <View style={styles.navItem} onClick={navTo('/users/99')}>
          <Text style={styles.navItemText}>User 99</Text>
        </View>
        <View
          style={styles.navItem}
          onClick={navTo('/search?keyword=piant&tag=router&tag=canvas')}
        >
          <Text style={styles.navItemText}>Search Query</Text>
        </View>
        <View style={styles.navItem} onClick={navTo('/not-found')}>
          <Text style={styles.navItemText}>404 Route</Text>
        </View>
      </View>

      <View style={styles.activeTag}>
        <Text style={styles.activeTagText}>active: {current()}</Text>
      </View>

      <Switch
        fallback={
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Not Found</Text>
            <Text style={styles.cardBody}>
              No route matched. Try going back to{' '}
              <Text style={styles.inlineCode}>/</Text>.
            </Text>
          </View>
        }
      >
        <Match when={route().match?.route.path === '/'}>
          <HomePage />
        </Match>
        <Match when={route().match?.route.path === '/users/:id'}>
          <UserPage />
        </Match>
        <Match when={route().match?.route.path === '/search'}>
          <SearchPage />
        </Match>
      </Switch>

      <Show when={true}>
        <RouteInspector />
      </Show>
    </View>
  );
}

export function App() {
  return (
    <View style={styles.page}>
      <RouterProvider router={router}>{() => <RouterDemo />}</RouterProvider>
    </View>
  );
}

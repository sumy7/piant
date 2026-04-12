import { describe, expect, it, vi } from 'vitest';
import { createRouter } from '../src/router';

async function waitFor(predicate: () => boolean, maxSteps = 30): Promise<void> {
  for (let i = 0; i < maxSteps; i += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
}

describe('router phase-2 features', () => {
  it('supports nested routes and layout route matching chain', async () => {
    const router = createRouter({
      mode: 'memory',
      initialPath: '/dashboard/analytics',
      routes: [
        {
          path: '/dashboard',
          children: [
            {
              path: '',
              name: 'dashboard-layout',
            },
            {
              path: 'analytics',
              name: 'dashboard-analytics',
            },
          ],
        },
      ],
    });

    await router.navigate('/dashboard/analytics');
    const state = router.getState();

    expect(state.path).toBe('/dashboard/analytics');
    expect(state.matches).toHaveLength(2);
    expect(state.matches[0]?.route.path).toBe('/dashboard');
    expect(state.matches[1]?.route.path).toBe('analytics');
    expect(state.match?.route.name).toBe('dashboard-analytics');
  });

  it('supports route redirect and guard redirect', async () => {
    const router = createRouter({
      mode: 'memory',
      initialPath: '/private',
      routes: [
        { path: '/', name: 'home' },
        {
          path: '/old',
          redirect: '/new',
        },
        {
          path: '/private',
          beforeEnter: () => '/login',
        },
        {
          path: '/login',
          name: 'login',
        },
        {
          path: '/new',
          name: 'new',
        },
      ],
    });

    await router.navigate('/old');
    let state = router.getState();
    expect(state.path).toBe('/new');
    expect(state.redirectedFrom).toBe('/old');

    await router.navigate('/private');
    state = router.getState();
    expect(state.path).toBe('/login');
    expect(state.redirectedFrom).toBe('/private');
  });

  it('loads lazy route component and caches it', async () => {
    const lazy = vi.fn(async () => ({
      default: () => 'lazy-component',
    }));

    const router = createRouter({
      mode: 'memory',
      initialPath: '/lazy',
      routes: [{ path: '/lazy', loader: lazy }],
    });

    await router.navigate('/lazy');
    await waitFor(() => !router.getState().loading);

    let state = router.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(Object.keys(state.components)).toHaveLength(1);

    await router.navigate('/lazy');
    await waitFor(() => !router.getState().loading);

    state = router.getState();
    expect(state.loading).toBe(false);
    expect(lazy).toHaveBeenCalledTimes(1);
  });

  it('records lazy loader error in route state', async () => {
    const router = createRouter({
      mode: 'memory',
      initialPath: '/boom',
      routes: [
        {
          path: '/boom',
          loader: async () => {
            throw new Error('lazy failed');
          },
        },
      ],
    });

    await router.navigate('/boom');
    await waitFor(() => !!router.getState().error);

    const state = router.getState();
    expect(state.error?.message).toBe('lazy failed');
  });
});

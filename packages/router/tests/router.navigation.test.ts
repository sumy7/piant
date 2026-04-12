import { describe, expect, it, vi } from 'vitest';
import { createRouter } from '../src/router';

describe('router navigation', () => {
  it('updates route state via push and replace', async () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/' }, { path: '/profile/:id' }],
      initialPath: '/',
    });

    await router.navigate('/profile/7?tab=settings');
    let state = router.getState();

    expect(state.path).toBe('/profile/7');
    expect(state.params).toEqual({ id: '7' });
    expect(state.query).toEqual({ tab: 'settings' });

    await router.navigate('/', { replace: true });
    state = router.getState();

    expect(state.path).toBe('/');
    expect(state.params).toEqual({});
    expect(state.query).toEqual({});
  });

  it('notifies subscribers and supports unsubscribe', async () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/' }, { path: '/about' }],
      initialPath: '/',
    });

    const listener = vi.fn();
    const unsubscribe = router.subscribe(listener);

    await router.navigate('/about');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].path).toBe('/about');

    unsubscribe();
    await router.navigate('/');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

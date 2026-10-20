import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRouter } from '../src/router';

describe('router navigation', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('does not add browser history entries when a guard cancels navigation', async () => {
    window.history.replaceState({}, '', '/start');
    const router = createRouter({
      mode: 'browser',
      routes: [
        { path: '/start' },
        { path: '/blocked', beforeEnter: () => false },
      ],
    });
    const historyLength = window.history.length;
    await router.navigate('/blocked');
    expect(router.getState().path).toBe('/start');
    expect(window.location.pathname).toBe('/start');
    expect(window.history.length).toBe(historyLength);
    router.destroy();
  });

  it('keeps the browser URL unchanged while a guard is pending or rejected', async () => {
    window.history.replaceState({}, '', '/start');
    let rejectGuard!: (error: Error) => void;
    const guard = new Promise<void>((_resolve, reject) => {
      rejectGuard = reject;
    });
    const router = createRouter({
      mode: 'browser',
      routes: [
        { path: '/start' },
        { path: '/blocked', beforeEnter: () => guard },
      ],
    });
    const pending = router.navigate('/blocked');
    expect(window.location.pathname).toBe('/start');
    rejectGuard(new Error('denied'));
    await pending;
    expect(router.getState().path).toBe('/start');
    expect(router.getState().error?.message).toBe('denied');
    expect(window.location.pathname).toBe('/start');
    router.destroy();
  });

  it('does not commit a redirect from an outdated async navigation', async () => {
    window.history.replaceState({}, '', '/start');
    let resolveGuard!: (path: string) => void;
    const guard = new Promise<string>((resolve) => {
      resolveGuard = resolve;
    });
    const router = createRouter({
      mode: 'browser',
      routes: [
        { path: '/start' },
        { path: '/slow', beforeEnter: () => guard },
        { path: '/redirected' },
        { path: '/current' },
      ],
    });
    const pending = router.navigate('/slow');
    await router.navigate('/current');
    resolveGuard('/redirected');
    await pending;
    expect(router.getState().path).toBe('/current');
    expect(window.location.pathname).toBe('/current');
    router.destroy();
  });
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

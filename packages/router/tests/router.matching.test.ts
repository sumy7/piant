import { describe, expect, it } from 'vitest';
import { createRouter } from '../src/router';

describe('router matching', () => {
  it('matches static paths with higher priority than dynamic paths', () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/users/:id' }, { path: '/users/me' }],
      initialPath: '/users/me',
    });

    const state = router.getState();

    expect(state.match?.route.path).toBe('/users/me');
    expect(state.params).toEqual({});
  });

  it('extracts dynamic route params', () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/posts/:postId/comments/:commentId' }],
      initialPath: '/posts/10/comments/22',
    });

    const state = router.getState();

    expect(state.match?.route.path).toBe('/posts/:postId/comments/:commentId');
    expect(state.params).toEqual({
      postId: '10',
      commentId: '22',
    });
  });

  it('parses query string into string and array values', () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/search' }],
      initialPath: '/search?q=piant&tag=router&tag=canvas',
    });

    const state = router.getState();

    expect(state.query).toEqual({
      q: 'piant',
      tag: ['router', 'canvas'],
    });
    expect(state.fullPath).toBe('/search?q=piant&tag=router&tag=canvas');
  });

  it('returns null match when route is not found', () => {
    const router = createRouter({
      mode: 'memory',
      routes: [{ path: '/home' }],
      initialPath: '/missing',
    });

    const state = router.getState();

    expect(state.match).toBeNull();
    expect(state.params).toEqual({});
  });
});

import { createComponent, onCleanup, PNode, render } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import { RouteView } from '../src/components/RouteView';
import { RouterProvider } from '../src/context';
import { createRouter } from '../src/router';

const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

function setup(
  mode: 'parallel' | 'out-in' | 'in-out' = 'out-in',
  browser = false,
) {
  const created: string[] = [];
  const cleaned: string[] = [];
  const page = (name: string) => () => {
    created.push(name);
    onCleanup(() => cleaned.push(name));
    const node = new PNode();
    node.displayName = name;
    return node;
  };
  let resolveLazy!: (component: () => PNode) => void;
  let rejectLazy!: (error: Error) => void;
  const lazy = new Promise<() => PNode>((resolve, reject) => {
    resolveLazy = resolve;
    rejectLazy = reject;
  });
  if (browser) window.history.replaceState({}, '', '/');
  const router = createRouter({
    mode: browser ? 'browser' : 'memory',
    routes: [
      { path: '/', component: page('home') },
      { path: '/a', component: page('a') },
      { path: '/b', component: page('b') },
      { path: '/lazy', loader: () => lazy },
      {
        path: '/blocked',
        beforeEnter: () => false,
        component: page('blocked'),
      },
    ],
  });
  const container = new PNode();
  const exits: Array<() => void> = [];
  const enters: Array<() => void> = [];
  const cancelled = vi.fn();
  const loadingNodes: PNode[] = [];
  const dispose = render(
    () =>
      createComponent(RouterProvider, {
        router,
        children: () =>
          RouteView({
            loadingFallback: () => {
              const loading = new PNode();
              loading.displayName = 'loading';
              loadingNodes.push(loading);
              return loading;
            },
            errorFallback: () => {
              const failure = new PNode();
              failure.displayName = 'error';
              return failure;
            },
            transition: {
              mode,
              onEnter: (_el, done) => {
                enters.push(done);
                return cancelled;
              },
              onExit: (_el, done) => {
                exits.push(done);
                return cancelled;
              },
            },
          }),
      }),
    container,
  );
  const names = () => container._children.map((node) => node.displayName);
  return {
    router,
    dispose,
    names,
    loadingNodes,
    created,
    cleaned,
    exits,
    enters,
    cancelled,
    resolveLazy,
    rejectLazy,
    page,
  };
}

describe('RouteView transitions with the real renderer', () => {
  it('skips superseded pending pages and retains owners until exit completes', async () => {
    const s = setup();
    await flush();
    await s.router.navigate('/a');
    expect(s.names()).toEqual(['home']);
    expect(s.cleaned).toEqual([]);
    await s.router.navigate('/b');
    expect(s.cleaned).toEqual(['a']);
    s.exits[0]();
    expect(s.names()).toEqual(['home']);
    s.exits[1]();
    expect(s.names()).toEqual(['b']);
    expect(s.cleaned).toEqual(['a', 'home']);
    expect(s.created).toEqual(['home', 'a', 'b']);
    s.dispose();
    await flush();
    expect(s.cleaned).toEqual(['a', 'home', 'b']);
    expect(s.enters).toHaveLength(0);
    s.router.destroy();
  });

  it('handles browser back/forward popstate and ignores stale enter/exit completions', async () => {
    const s = setup('in-out', true);
    await flush();
    await s.router.navigate('/a');
    await flush();
    s.enters[0]();
    await s.router.navigate('/b');
    await flush();
    s.exits[0]();
    expect(s.names()).toEqual(['b', 'a']);
    s.enters[1]();
    s.exits[1]();
    expect(s.names()).toEqual(['b']);
    window.history.replaceState({}, '', '/a');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await flush();
    expect(s.names()).toEqual(['a', 'b']);
    s.enters[2]();
    s.exits[2]();
    window.history.replaceState({}, '', '/b');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await flush();
    s.enters[3]();
    s.exits[3]();
    expect(s.names()).toEqual(['b']);
    s.dispose();
    s.router.destroy();
    expect(s.cleaned.sort()).toEqual(s.created.sort());
  });

  it('preserves loading on guard cancellation and ignores a resolved abandoned lazy page', async () => {
    const s = setup('parallel');
    await flush();
    await s.router.navigate('/lazy');
    await s.router.navigate('/blocked');
    expect(s.names()).toContain('loading');
    await s.router.navigate('/a');
    s.resolveLazy(s.page('lazy'));
    await flush();
    expect(s.created).not.toContain('lazy');
    for (const done of s.exits) done();
    expect(s.names()).toEqual(['a']);
    s.dispose();
    s.router.destroy();
    expect(s.cleaned.sort()).toEqual(s.created.sort());
  });

  it('transitions from a lazy error and releases every page on disposal', async () => {
    const s = setup('parallel');
    await flush();
    await s.router.navigate('/lazy');
    s.rejectLazy(new Error('loader failed'));
    await flush();
    expect(s.names()).toContain('error');
    await s.router.navigate('/b');
    for (const done of s.exits) done();
    expect(s.names()).toEqual(['b']);
    s.dispose();
    for (const done of [...s.enters, ...s.exits]) done();
    await flush();
    expect(s.cleaned.sort()).toEqual(s.created.sort());
    s.router.destroy();
  });
  it('does not remount an unchanged route and completes active lazy loading after a cancelled navigation', async () => {
    const s = setup('parallel');
    await flush();
    await s.router.navigate('/');
    expect(s.created).toEqual(['home']);
    await s.router.navigate('/lazy');
    await s.router.navigate('/blocked');
    s.resolveLazy(s.page('lazy'));
    await flush();
    for (const done of s.exits) done();
    expect(s.names()).toEqual(['lazy']);
    expect(s.created).toEqual(['home', 'lazy']);
    s.dispose();
    s.router.destroy();
    expect(s.cleaned.sort()).toEqual(s.created.sort());
  });

  it('constructs fresh loading fallbacks when an unfinished lazy page is revisited', async () => {
    const s = setup('parallel');
    await flush();
    await s.router.navigate('/lazy');
    for (const done of s.exits) done();
    await s.router.navigate('/a');
    for (const done of s.exits) done();
    expect(s.loadingNodes[0].isDestroyed).toBe(true);
    await s.router.navigate('/lazy');
    for (const done of s.exits) done();
    expect(s.loadingNodes).toHaveLength(2);
    expect(s.loadingNodes[1].isDestroyed).toBe(false);
    expect(s.names()).toEqual(['loading']);
    s.dispose();
    s.router.destroy();
    s.resolveLazy(s.page('lazy'));
    await flush();
  });
});

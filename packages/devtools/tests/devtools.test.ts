import { PNode, PRoot } from '@piant/core';
import { TanStackDevtoolsCore } from '@tanstack/devtools';
import { type Application, Container, Rectangle, Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  attachDevtools,
  type DevtoolsOptions,
  type DevtoolsSession,
} from '../src';

type Fixture = {
  root: PRoot;
  app: Application;
  stage: Container;
  ticker: Ticker;
  canvas: HTMLCanvasElement;
};
const fixtures: Fixture[] = [];
const sessions: DevtoolsSession[] = [];

function fixture(): Fixture {
  const stage = new Container();
  const root = new PRoot(stage, { width: 300, height: 200 });
  const ticker = new Ticker();
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    top: 20,
    width: 600,
    height: 400,
    right: 610,
    bottom: 420,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  });
  const app = {
    stage,
    ticker,
    canvas,
    screen: new Rectangle(0, 0, 300, 200),
  } as Application;
  root.doLayout();
  const value = { root, app, stage, ticker, canvas };
  fixtures.push(value);
  return value;
}

async function attach(
  value: ReturnType<typeof fixture>,
  options: Partial<DevtoolsOptions> = {},
) {
  const session = attachDevtools({ ...value, enabled: true, ...options });
  expect(session).not.toBeNull();
  sessions.push(session!);
  await vi.waitFor(() => {
    expect(document.querySelector('[data-piant-devtools]')).not.toBeNull();
  });
  return session!;
}

function advance(ticker: Ticker, delta: number) {
  ticker.update(ticker.lastTime + delta);
}

function child(root: PRoot | PNode, name = 'Child') {
  const node = new PNode();
  node.displayName = name;
  node.setStyle({ width: 40, height: 20 });
  root.appendChild(node);
  return node;
}

function overlay() {
  return document.querySelector<SVGSVGElement>('[data-piant-highlight]')!;
}

afterEach(() => {
  for (const session of sessions.splice(0)) session.detach();
  for (const value of fixtures.splice(0)) {
    value.root.destroy();
    if (!value.stage.destroyed) value.stage.destroy({ children: true });
    value.ticker.destroy();
  }
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('optional inspector session', () => {
  it.each([undefined, false])(
    'does nothing without enabled: true (%s)',
    (enabled) => {
      const value = fixture();
      const observe = vi.spyOn(value.root, 'observe');
      const add = vi.spyOn(value.ticker, 'add');
      const getState = vi.fn();
      expect(attachDevtools({ ...value, enabled, getState })).toBeNull();
      expect(document.querySelector('[data-piant-devtools]')).toBeNull();
      expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
      expect(
        document.querySelector('[aria-label="TanStack Devtools"]'),
      ).toBeNull();
      expect(document.querySelector('[data-piant-highlight]')).toBeNull();
      expect(observe).not.toHaveBeenCalled();
      expect(add).not.toHaveBeenCalled();
      expect(getState).not.toHaveBeenCalled();
    },
  );

  it('records actual nested elements, batches layouts, and bounds tree traversal', async () => {
    const value = fixture();
    const parent = child(value.root, 'Parent');
    const nested = child(parent, 'Nested');
    const sibling = child(value.root, 'Sibling');
    child(nested, 'Beyond limit');
    value.root.doLayout();
    const session = await attach(value, { maxNodes: 4, sampleInterval: 100 });
    expect(session.snapshot().elements).toEqual([
      {
        id: value.root._id,
        parentId: null,
        depth: 0,
        name: value.root.displayName,
      },
      { id: parent._id, parentId: value.root._id, depth: 1, name: 'Parent' },
      { id: nested._id, parentId: parent._id, depth: 2, name: 'Nested' },
      { id: sibling._id, parentId: value.root._id, depth: 1, name: 'Sibling' },
    ]);
    expect(session.snapshot().truncated).toBe(true);
    advance(value.ticker, 100);
    const before = session.snapshot();
    parent.removeChild(nested);
    value.root.doLayout();
    advance(value.ticker, 20);
    expect(session.snapshot()).toBe(before);
    advance(value.ticker, 80);
    expect(session.snapshot().elements.map((node) => node.name)).toEqual([
      value.root.displayName,
      'Parent',
      'Sibling',
    ]);
    expect(session.snapshot().truncated).toBe(false);
  });

  it('highlights using parent transforms and CSS canvas scale without changing the Pixi tree', async () => {
    const value = fixture();
    const parent = child(value.root);
    const node = child(parent);
    value.root.doLayout();
    value.stage.position.set(5, 7);
    value.stage.scale.set(2, 3);
    parent._view.position.set(11, 13);
    parent._view.rotation = Math.PI / 2;
    node._view.position.set(2, 4);
    const stageChildren = [...value.stage.children];
    const viewChildren = [...node._view.children];
    const session = await attach(value);
    session.select(node._id);
    const points = overlay()
      .querySelector('polygon')!
      .getAttribute('points')!
      .split(' ')
      .map((pair) => pair.split(',').map(Number));
    // After a quarter turn: parent(11,13) + rotate(child(2,4) + corner).
    const expected = [
      [48, 124],
      [48, 364],
      [-32, 364],
      [-32, 124],
    ];
    points.forEach((point, index) => {
      point.forEach((coordinate, axis) => {
        expect(coordinate).toBeCloseTo(expected[index][axis]);
      });
    });
    expect(overlay().style.pointerEvents).toBe('none');
    expect(value.stage.children).toEqual(stageChildren);
    expect(node._view.children).toEqual(viewChildren);
    expect(session.snapshot().selectedId).toBe(node._id);
    expect(session.snapshot().selection).toMatchObject({
      style: { width: 40, height: 20 },
      layout: { width: 40, height: 20 },
    });
    parent.removeChild(node);
    value.root.doLayout();
    session.refresh();
    expect(session.snapshot().selectedId).toBeNull();
    expect(overlay().style.display).toBe('none');
  });

  it('hides highlights when the canvas disconnects or selected view becomes invisible', async () => {
    const value = fixture();
    const node = child(value.root);
    value.root.doLayout();
    const session = await attach(value);
    session.select(node._id);
    expect(overlay().style.display).toBe('');
    node._view.visible = false;
    advance(value.ticker, 20);
    expect(overlay().style.display).toBe('none');
    node._view.visible = true;
    value.canvas.remove();
    advance(value.ticker, 20);
    expect(overlay().style.display).toBe('none');
    document.body.appendChild(value.canvas);
    advance(value.ticker, 20);
    expect(overlay().style.display).toBe('');
  });

  it('lets panel buttons select, refresh state and clear a selection', async () => {
    const value = fixture();
    const node = child(value.root, 'Button');
    value.root.doLayout();
    let count = 1;
    const session = await attach(value, { getState: () => ({ count }) });
    const shadow = document.querySelector('[data-piant-devtools]')!.shadowRoot!;
    const button = Array.from(
      shadow.querySelectorAll<HTMLButtonElement>('nav button'),
    ).find((button) => button.textContent!.includes('Button'))!;
    button.click();
    expect(session.snapshot().selectedId).toBe(node._id);
    count = 2;
    shadow.querySelector<HTMLButtonElement>('#refresh')!.click();
    expect(shadow.querySelector('#state')!.textContent).toContain('2');
    session.select(null);
    expect(session.snapshot().selection).toBeNull();
    expect(overlay().style.display).toBe('none');
  });

  it('copies state and handles a throwing state source without disrupting the application', async () => {
    const value = fixture();
    const state = { nested: { count: 1 } };
    const getState = vi.fn((): unknown => state);
    const session = await attach(value, { getState });
    const snapshot = session.snapshot();
    state.nested.count = 2;
    expect(snapshot.state).toEqual({ nested: { count: 1 } });
    expect(Object.isFrozen(snapshot.state)).toBe(true);
    expect(
      Object.isFrozen((snapshot.state as { nested: unknown }).nested),
    ).toBe(true);
    expect(Object.isFrozen(state.nested)).toBe(false);
    getState.mockImplementation(() => {
      throw new Error('private state');
    });
    expect(() => session.refresh()).not.toThrow();
    expect(session.snapshot().state).toBe('[State source failed]');
  });

  it('retains bounded layout events and counts sampled frame intervals and running animations', async () => {
    const value = fixture();
    const node = child(value.root);
    value.root.doLayout();
    const animation = { playState: 'running', currentTime: 10 };
    const session = await attach(value, {
      maxEntries: 2,
      sampleInterval: 16,
      animations: () => [{ id: 'fade', node, animation }],
    });
    for (let i = 0; i < 4; i++) {
      value.root.markDirty();
      value.root.doLayout();
    }
    advance(value.ticker, 20);
    advance(value.ticker, 30);
    animation.playState = 'paused';
    animation.currentTime = 60;
    advance(value.ticker, 40);
    expect(session.snapshot().timeline).toHaveLength(2);
    expect(session.snapshot().stats).toMatchObject({
      frames: 3,
      frameInterval: 40,
      maxFrameInterval: 40,
      layoutUpdates: 4,
    });
    expect(session.snapshot().animations).toEqual([
      {
        id: 'fade',
        nodeId: node._id,
        playState: 'paused',
        currentTime: 60,
        observedFrames: 2,
        observedElapsed: 50,
      },
    ]);
    expect(animation).toEqual({ playState: 'paused', currentTime: 60 });
    value.root.removeChild(node);
    value.root.doLayout();
    session.refresh();
    expect(session.snapshot().animations).toEqual([]);
  });

  it('isolates animation source errors and ignores nodes outside the root', async () => {
    const value = fixture();
    const other = fixture();
    const foreign = child(other.root);
    const animations = vi.fn(() => [
      {
        id: 'foreign',
        node: foreign,
        animation: { playState: 'running', currentTime: 0 },
      },
    ]);
    const session = await attach(value, { animations });
    expect(session.snapshot().animations).toEqual([]);
    animations.mockImplementation(() => {
      throw new Error('source failed');
    });
    session.refresh();
    expect(session.snapshot().animations).toBe('[Animation source failed]');
  });

  it('contains failures when registered animation properties become unavailable', async () => {
    const value = fixture();
    const node = child(value.root);
    value.root.doLayout();
    let unavailable = false;
    const animation = {
      get playState() {
        if (unavailable) throw new Error('disposed');
        return 'running';
      },
      get currentTime() {
        return 42;
      },
    };
    const session = await attach(value, {
      animations: () => [{ id: 'disposed', node, animation }],
    });
    unavailable = true;
    expect(() => session.refresh()).not.toThrow();
    expect(session.snapshot().animations).toEqual([
      { id: 'disposed', error: '[Animation unavailable]' },
    ]);
    expect(() => advance(value.ticker, 20)).not.toThrow();
    session.detach();
  });

  it.each(['detach', 'root', 'stage', 'close'] as const)(
    'cleans DOM, ticker and observer resources on %s',
    async (mode) => {
      const value = fixture();
      const stop = vi.fn();
      const observe = value.root.observe.bind(value.root);
      vi.spyOn(value.root, 'observe').mockImplementation((listener) => {
        const unsubscribe = observe(listener);
        return () => {
          stop();
          unsubscribe();
        };
      });
      const getState = vi.fn(() => ({ count: 1 }));
      const listeners = value.ticker.count;
      const stageListeners = value.stage.listenerCount('destroyed');
      const session = await attach(value, { getState });
      expect(value.ticker.count).toBe(listeners + 1);
      if (mode === 'detach') session.detach();
      if (mode === 'root') value.root.destroy();
      if (mode === 'stage') {
        value.stage.destroy({ children: true });
        expect(value.root.isDestroyed).toBe(true);
      }
      if (mode === 'close')
        document
          .querySelector('[data-piant-devtools]')!
          .shadowRoot!.querySelector<HTMLButtonElement>('#close')!
          .click();
      expect(stop).toHaveBeenCalledTimes(1);
      expect(value.ticker.count).toBe(listeners);
      expect(document.querySelector('[data-piant-devtools]')).toBeNull();
      expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
      expect(
        document.querySelector('[aria-label="TanStack Devtools"]'),
      ).toBeNull();
      expect(document.querySelector('[data-piant-highlight]')).toBeNull();
      expect(value.stage.listenerCount('destroyed')).toBe(
        mode === 'root' || mode === 'stage' ? 0 : stageListeners,
      );
      expect(value.root._view.listenerCount('destroyed')).toBe(0);
      const calls = getState.mock.calls.length;
      session.detach();
      session.refresh();
      session.select(value.root._id);
      advance(value.ticker, 200);
      if (!value.root.isDestroyed && !value.root._view.destroyed) {
        value.root.markDirty();
        value.root.doLayout();
      }
      expect(getState).toHaveBeenCalledTimes(calls);
    },
  );

  it('replaces an existing session and rejects destroyed roots', async () => {
    const value = fixture();
    const first = await attach(value);
    const firstSnapshot = first.snapshot();
    const second = await attach(value);
    expect(document.querySelectorAll('[data-piant-devtools]')).toHaveLength(1);
    expect(value.ticker.count).toBe(1);
    first.refresh();
    expect(first.snapshot()).toBe(firstSnapshot);
    second.detach();
    expect(value.ticker.count).toBe(0);
    value.root.destroy();
    expect(attachDevtools({ ...value, enabled: true })).toBeNull();
  });

  it('renders the Piant inspector inside the real TanStack workbench', async () => {
    const value = fixture();
    await attach(value);
    expect(document.querySelector('[data-piant-devtools-host]')).not.toBeNull();
    expect(
      document.querySelector('[aria-label="TanStack Devtools"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[aria-label="Close TanStack Devtools"]'),
    ).not.toBeNull();
    const plugin = document.querySelector('[data-piant-devtools]')!;
    expect(
      plugin.shadowRoot!.querySelector('nav')!.getAttribute('aria-label'),
    ).toBe('PNode element tree');
    expect((plugin as HTMLElement).style.position).not.toBe('fixed');
  });

  it('pauses sampling while collapsed and refreshes changed elements on launcher reopen', async () => {
    const value = fixture();
    const node = child(value.root, 'Before collapse');
    value.root.doLayout();
    const getState = vi.fn(() => ({ count: 1 }));
    const animations = vi.fn(() => [
      {
        id: 'fade',
        node,
        animation: { playState: 'running', currentTime: 10 },
      },
    ]);
    const session = await attach(value, {
      getState,
      animations,
      sampleInterval: 16,
    });
    session.select(node._id);
    advance(value.ticker, 20);
    expect(overlay().style.display).toBe('');
    document
      .querySelector<HTMLButtonElement>(
        '[aria-label="Close TanStack Devtools"]',
      )!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(0));
    expect(overlay().style.display).toBe('none');
    const snapshot = session.snapshot();
    const stateCalls = getState.mock.calls.length;
    const animationCalls = animations.mock.calls.length;
    value.root.removeChild(node);
    child(value.root, 'Added while collapsed');
    value.root.doLayout();
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(stateCalls);
    expect(animations).toHaveBeenCalledTimes(animationCalls);
    expect(session.snapshot()).toBe(snapshot);
    document
      .querySelector<HTMLButtonElement>(
        '[aria-label="Open TanStack Devtools"]',
      )!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(1));
    expect(session.snapshot().elements.map((entry) => entry.name)).toContain(
      'Added while collapsed',
    );
    expect(
      session.snapshot().elements.map((entry) => entry.name),
    ).not.toContain('Before collapse');
    expect(session.snapshot().selectedId).toBeNull();
    expect(getState.mock.calls.length).toBeGreaterThan(stateCalls);
    expect(animations.mock.calls.length).toBeGreaterThan(animationCalls);
    advance(value.ticker, 20);
    expect(session.snapshot().stats.frames).toBe(snapshot.stats.frames + 1);
  });

  it('pauses Piant sampling when its plugin tab is closed', async () => {
    const value = fixture();
    const node = child(value.root);
    value.root.doLayout();
    const getState = vi.fn(() => ({ count: 1 }));
    const session = await attach(value, { getState });
    session.select(node._id);
    document
      .querySelector<HTMLButtonElement>('[aria-label="Close Piant"]')!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(0));
    expect(overlay().style.display).toBe('none');
    const calls = getState.mock.calls.length;
    value.root.markDirty();
    value.root.doLayout();
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(calls);
    session.detach();
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(
      document.querySelector('[aria-label="TanStack Devtools"]'),
    ).toBeNull();
  });

  it('starts collapsed without Piant sampling until the launcher opens', async () => {
    const value = fixture();
    const getState = vi.fn(() => ({ count: 1 }));
    const session = attachDevtools({
      ...value,
      enabled: true,
      defaultOpen: false,
      getState,
    })!;
    sessions.push(session);
    await vi.waitFor(() =>
      expect(
        document.querySelector('[aria-label="Open TanStack Devtools"]'),
      ).not.toBeNull(),
    );
    expect(value.ticker.count).toBe(0);
    const calls = getState.mock.calls.length;
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(calls);
    document
      .querySelector<HTMLButtonElement>(
        '[aria-label="Open TanStack Devtools"]',
      )!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(1));
    expect(getState.mock.calls.length).toBeGreaterThan(calls);
  });

  it('cancels an asynchronous TanStack mount on immediate detach', async () => {
    const value = fixture();
    const session = attachDevtools({ ...value, enabled: true })!;
    sessions.push(session);
    session.detach();
    // Flush dynamic imports and Solid lazy rendering, rather than only asserting
    // before the upstream asynchronous mount had a chance to run.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(value.ticker.count).toBe(0);
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(document.querySelector('[data-piant-devtools]')).toBeNull();
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(
      document.querySelector('[aria-label="Open TanStack Devtools"]'),
    ).toBeNull();
    expect(
      document.querySelector('[aria-label="TanStack Devtools"]'),
    ).toBeNull();
  });

  it('replaces the document session when attaching a different application root', async () => {
    const firstApp = fixture();
    const first = await attach(firstApp);
    const snapshot = first.snapshot();
    const secondApp = fixture();
    await attach(secondApp);
    expect(firstApp.ticker.count).toBe(0);
    expect(secondApp.ticker.count).toBe(1);
    expect(
      document.querySelectorAll('[data-piant-devtools-host]'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('[aria-label="TanStack Devtools"]'),
    ).toHaveLength(1);
    first.refresh();
    expect(first.snapshot()).toBe(snapshot);
  });

  it('still detaches the complete shell when the root is destroyed while collapsed', async () => {
    const value = fixture();
    const session = await attach(value);
    document
      .querySelector<HTMLButtonElement>(
        '[aria-label="Close TanStack Devtools"]',
      )!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(0));
    expect(
      document.querySelector('[aria-label="Open TanStack Devtools"]'),
    ).not.toBeNull();
    value.root.destroy();
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(
      document.querySelector('[aria-label="Open TanStack Devtools"]'),
    ).toBeNull();
    session.detach();
  });

  it('preserves a synchronous selection made before the asynchronous shell is ready', async () => {
    const value = fixture();
    const node = child(value.root, 'Selected before mount');
    value.root.doLayout();
    const session = attachDevtools({ ...value, enabled: true })!;
    sessions.push(session);
    session.select(node._id);
    expect(session.snapshot().selectedId).toBe(node._id);
    expect(session.snapshot().selection).toMatchObject({
      name: 'Selected before mount',
    });
    expect(overlay().style.display).toBe('none');
    await vi.waitFor(() => {
      expect(document.querySelector('[data-piant-devtools]')).not.toBeNull();
      expect(overlay().style.display).toBe('');
    });
    expect(session.snapshot().selectedId).toBe(node._id);
    expect(
      document
        .querySelector('[data-piant-devtools]')!
        .shadowRoot!.querySelector('nav button[aria-pressed="true"]')!
        .textContent,
    ).toContain('Selected before mount');
  });

  it('allows explicit refresh while collapsed to read changed state and tree without restarting sampling', async () => {
    const value = fixture();
    let count = 1;
    const getState = vi.fn(() => ({ count }));
    const session = await attach(value, { getState });
    document
      .querySelector<HTMLButtonElement>(
        '[aria-label="Close TanStack Devtools"]',
      )!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(0));
    const before = session.snapshot();
    const stateCalls = getState.mock.calls.length;
    count = 2;
    const node = child(value.root, 'Added while collapsed');
    value.root.doLayout();
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(stateCalls);
    session.refresh();
    expect(session.snapshot().elements).toContainEqual({
      id: node._id,
      parentId: value.root._id,
      depth: 1,
      name: 'Added while collapsed',
    });
    expect(session.snapshot().state).toEqual({ count: 2 });
    expect(session.snapshot().stats).toEqual(before.stats);
    expect(session.snapshot().timeline).toEqual(before.timeline);
    expect(value.ticker.count).toBe(0);
    expect(overlay().style.display).toBe('none');
    const refreshedCalls = getState.mock.calls.length;
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(refreshedCalls);
  });

  it('cleans Piant resources and propagates errors when the upstream unmount throws', async () => {
    const value = fixture();
    const node = child(value.root);
    value.root.doLayout();
    const stop = vi.fn();
    const observe = value.root.observe.bind(value.root);
    vi.spyOn(value.root, 'observe').mockImplementation((listener) => {
      const unsubscribe = observe(listener);
      return () => {
        stop();
        unsubscribe();
      };
    });
    const getState = vi.fn(() => ({ count: 1 }));
    const baselineTicker = value.ticker.count;
    const baselineStageListeners = value.stage.listenerCount('destroyed');
    const session = await attach(value, { getState });
    session.select(node._id);
    const unmount = TanStackDevtoolsCore.prototype.unmount;
    const failure = new Error('Injected upstream unmount failure');
    const unmountSpy = vi
      .spyOn(TanStackDevtoolsCore.prototype, 'unmount')
      .mockImplementation(function (this: TanStackDevtoolsCore) {
        unmount.call(this);
        throw failure;
      });
    expect(() => session.detach()).toThrow(failure);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(value.ticker.count).toBe(baselineTicker);
    expect(value.stage.listenerCount('destroyed')).toBe(baselineStageListeners);
    expect(value.root._view.listenerCount('destroyed')).toBe(0);
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(
      document.querySelector('[aria-label="TanStack Devtools"]'),
    ).toBeNull();
    const stateCalls = getState.mock.calls.length;
    session.refresh();
    session.select(node._id);
    value.root.markDirty();
    value.root.doLayout();
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(stateCalls);
    expect(() => session.detach()).not.toThrow();
    expect(unmountSpy).toHaveBeenCalledTimes(1);
    unmountSpy.mockRestore();
    await attach(value);
    expect(value.ticker.count).toBe(baselineTicker + 1);
    expect(
      document.querySelectorAll('[data-piant-devtools-host]'),
    ).toHaveLength(1);
  });
});

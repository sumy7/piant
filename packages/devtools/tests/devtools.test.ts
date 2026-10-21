import { PNode, PRoot } from '@piant/core';
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
    expect(value.ticker.count).toBe(options.defaultOpen === false ? 0 : 1);
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

function inspectorShadow() {
  return document.querySelector('[data-piant-devtools]')!.shadowRoot!;
}

afterEach(() => {
  for (const session of sessions.splice(0)) session.detach();
  for (const value of fixtures.splice(0)) {
    value.root.destroy();
    if (!value.stage.destroyed) value.stage.destroy({ children: true });
    value.ticker.destroy();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
  localStorage.clear();
  vi.unstubAllGlobals();
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

  it('renders a single Piant dock with its four working inspection tabs', async () => {
    const value = fixture();
    await attach(value);
    const host = document.querySelector('[data-piant-devtools-host]')!;
    const panel = host.querySelector('[data-piant-devtools-panel]')!;
    expect(panel.getAttribute('aria-label')).toBe('Piant DevTools panel');
    expect(host.querySelectorAll('[data-piant-devtools-panel]')).toHaveLength(
      1,
    );
    expect(
      document.querySelector('[aria-label="TanStack Devtools"]'),
    ).toBeNull();
    expect(document.querySelector('[aria-label="Close Piant"]')).toBeNull();
    const plugin = panel.querySelector<HTMLElement>('[data-piant-devtools]')!;
    const shadow = plugin.shadowRoot!;
    expect(shadow.querySelectorAll('[role="tab"]')).toHaveLength(4);
    for (const name of ['Elements', 'State', 'Performance', 'Animations']) {
      const tab = Array.from(
        shadow.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ).find((entry) => entry.textContent === name)!;
      tab.click();
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(
        shadow.querySelector<HTMLElement>(
          `[role="tabpanel"][aria-label="${name}"]`,
        )!.hidden,
      ).toBe(false);
    }
    expect(shadow.querySelector('nav')!.getAttribute('aria-label')).toBe(
      'PNode element tree',
    );
    expect(plugin.style.position).not.toBe('fixed');
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
    inspectorShadow().querySelector<HTMLButtonElement>('#collapse')!.click();
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
      .querySelector<HTMLButtonElement>('[aria-label="Open Piant DevTools"]')!
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

  it('retains the inspector and its filter, tab and disclosure state across collapse', async () => {
    const value = fixture();
    child(value.root, 'Counter');
    value.root.doLayout();
    await attach(value, { getState: () => ({ nested: { count: 1 } }) });
    const shadow = inspectorShadow();
    const filter = shadow.querySelector<HTMLInputElement>(
      '[aria-label="Filter elements"]',
    )!;
    filter.value = 'counter';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    const stateTab = Array.from(
      shadow.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((tab) => tab.textContent === 'State')!;
    stateTab.click();
    const nested = shadow.querySelector<HTMLDetailsElement>('#state details')!;
    nested.open = true;
    nested.dispatchEvent(new Event('toggle'));
    shadow.querySelector<HTMLButtonElement>('#collapse')!.click();
    expect(value.ticker.count).toBe(0);
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools-panel]')!
        .hidden,
    ).toBe(true);
    document
      .querySelector<HTMLButtonElement>('[aria-label="Open Piant DevTools"]')!
      .click();
    expect(value.ticker.count).toBe(1);
    expect(inspectorShadow()).toBe(shadow);
    expect(shadow.querySelector('[aria-label="Filter elements"]')).toBe(filter);
    expect(filter.value).toBe('counter');
    expect(stateTab.getAttribute('aria-selected')).toBe('true');
    expect(shadow.querySelector('#state details')).toBe(nested);
    expect(nested.open).toBe(true);
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
        document.querySelector('[aria-label="Open Piant DevTools"]'),
      ).not.toBeNull(),
    );
    expect(value.ticker.count).toBe(0);
    const calls = getState.mock.calls.length;
    advance(value.ticker, 200);
    expect(getState).toHaveBeenCalledTimes(calls);
    document
      .querySelector<HTMLButtonElement>('[aria-label="Open Piant DevTools"]')!
      .click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(1));
    expect(getState.mock.calls.length).toBeGreaterThan(calls);
  });

  it('cancels deferred sampling startup on immediate detach', async () => {
    const value = fixture();
    const session = attachDevtools({ ...value, enabled: true })!;
    sessions.push(session);
    session.detach();
    // Allow the queued sampling activation to run after detach.
    await Promise.resolve();
    expect(value.ticker.count).toBe(0);
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(document.querySelector('[data-piant-devtools]')).toBeNull();
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(
      document.querySelector('[aria-label="Open Piant DevTools"]'),
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
      document.querySelectorAll('[data-piant-devtools-panel]'),
    ).toHaveLength(1);
    first.refresh();
    expect(first.snapshot()).toBe(snapshot);
  });

  it('still detaches the complete shell when the root is destroyed while collapsed', async () => {
    const value = fixture();
    const session = await attach(value);
    inspectorShadow().querySelector<HTMLButtonElement>('#collapse')!.click();
    await vi.waitFor(() => expect(value.ticker.count).toBe(0));
    expect(
      document.querySelector('[aria-label="Open Piant DevTools"]'),
    ).not.toBeNull();
    value.root.destroy();
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(
      document.querySelector('[aria-label="Open Piant DevTools"]'),
    ).toBeNull();
    session.detach();
  });

  it('preserves synchronous selection before deferred sampling starts', async () => {
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
    inspectorShadow().querySelector<HTMLButtonElement>('#collapse')!.click();
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

  it('persists theme and height while defaultOpen controls each new session', async () => {
    const key = 'piant-devtools-panel:v1';
    localStorage.setItem(
      key,
      JSON.stringify({ height: 280, theme: 'light', open: false }),
    );
    const value = fixture();
    const first = await attach(value, { defaultOpen: true });
    const panel = document.querySelector<HTMLElement>(
      '[data-piant-devtools-panel]',
    )!;
    expect(panel.hidden).toBe(false);
    expect(panel.style.height).toBe('280px');
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools]')!.dataset
        .theme,
    ).toBe('light');
    const resize = panel.querySelector('[role="separator"]')!;
    resize.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    inspectorShadow().querySelector<HTMLButtonElement>('#theme')!.click();
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools]')!.dataset
        .theme,
    ).toBe('dark');
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      height: 304,
      theme: 'dark',
    });
    inspectorShadow().querySelector<HTMLButtonElement>('#collapse')!.click();
    first.detach();
    await attach(value, { defaultOpen: false });
    const reopened = document.querySelector<HTMLElement>(
      '[data-piant-devtools-panel]',
    )!;
    expect(reopened.hidden).toBe(true);
    expect(reopened.style.height).toBe('304px');
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools]')!.dataset
        .theme,
    ).toBe('dark');
    expect(value.ticker.count).toBe(0);
    document
      .querySelector<HTMLButtonElement>('[aria-label="Open Piant DevTools"]')!
      .click();
    expect(value.ticker.count).toBe(1);
    expect(JSON.parse(localStorage.getItem(key)!)).not.toHaveProperty('open');
  });

  it.each([
    '{broken',
    'null',
    '{"height":"500","theme":"sepia"}',
    '{"height":-2,"theme":false}',
  ])('uses safe defaults for invalid saved settings %s', async (settings) => {
    localStorage.setItem('piant-devtools-panel:v1', settings);
    await attach(fixture());
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools-panel]')!.style
        .height,
    ).toBe('400px');
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools]')!.dataset
        .theme,
    ).toBe('dark');
  });

  it('keeps resizing and theme switching functional when storage is unavailable', async () => {
    const storage = vi
      .spyOn(window, 'localStorage', 'get')
      .mockImplementation(() => {
        throw new Error('Storage blocked');
      });
    await attach(fixture());
    const panel = document.querySelector<HTMLElement>(
      '[data-piant-devtools-panel]',
    )!;
    expect(panel.style.height).toBe('400px');
    expect(() =>
      inspectorShadow().querySelector<HTMLButtonElement>('#theme')!.click(),
    ).not.toThrow();
    expect(
      document.querySelector<HTMLElement>('[data-piant-devtools]')!.dataset
        .theme,
    ).toBe('light');
    expect(() =>
      panel
        .querySelector('[role="separator"]')!
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        ),
    ).not.toThrow();
    expect(panel.style.height).toBe('376px');
    expect(storage).toHaveBeenCalledTimes(3);
  });

  it('resizes with keyboard and matching pointer drags and clamps to the viewport', async () => {
    vi.stubGlobal('innerHeight', 800);
    await attach(fixture());
    const panel = document.querySelector<HTMLElement>(
      '[data-piant-devtools-panel]',
    )!;
    const separator = panel.querySelector<HTMLElement>('[role="separator"]')!;
    const key = (key: string) =>
      separator.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    key('ArrowUp');
    expect(panel.style.height).toBe('424px');
    key('ArrowDown');
    expect(panel.style.height).toBe('400px');
    key('Home');
    expect(panel.style.height).toBe('180px');
    key('End');
    expect(panel.style.height).toBe('776px');
    key('Home');
    separator.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 7,
        button: 0,
        clientY: 500,
        bubbles: true,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 8, clientY: 200 }),
    );
    expect(panel.style.height).toBe('180px');
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 7, clientY: 400 }),
    );
    expect(panel.style.height).toBe('280px');
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }));
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 7, clientY: 200 }),
    );
    expect(panel.style.height).toBe('280px');
    expect(
      JSON.parse(localStorage.getItem('piant-devtools-panel:v1')!).height,
    ).toBe(280);
    vi.stubGlobal('innerHeight', 150);
    window.dispatchEvent(new Event('resize'));
    expect(panel.style.height).toBe('126px');
    expect(separator.getAttribute('aria-valuenow')).toBe('126');
    expect(separator.getAttribute('aria-valuemin')).toBe('126');
    expect(separator.getAttribute('aria-valuemax')).toBe('126');
  });

  it('removes resize and toolbar handlers when detached during a pointer drag', async () => {
    const value = fixture();
    const session = await attach(value);
    const host = document.querySelector<HTMLElement>(
      '[data-piant-devtools-host]',
    )!;
    const separator = host.querySelector<HTMLElement>(
      '[aria-label="Resize Piant DevTools panel"]',
    )!;
    const theme = inspectorShadow().querySelector<HTMLButtonElement>('#theme')!;
    const launcher = host.querySelector<HTMLButtonElement>(
      '[aria-label="Open Piant DevTools"]',
    )!;
    const getState = vi.spyOn(window, 'localStorage', 'get');
    separator.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        button: 0,
        clientY: 400,
        bubbles: true,
      }),
    );
    session.detach();
    const calls = getState.mock.calls.length;
    window.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientY: 250 }),
    );
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    window.dispatchEvent(new Event('resize'));
    separator.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    theme.click();
    launcher.click();
    expect(getState).toHaveBeenCalledTimes(calls);
    expect(value.ticker.count).toBe(0);
    expect(host.isConnected).toBe(false);
    expect(document.querySelector('[data-piant-highlight]')).toBeNull();
    expect(() => session.detach()).not.toThrow();
  });
});

import { PRoot } from '@piant/core';
import {
  combine,
  createStore,
  createStoreHistory,
  persist,
} from '@piant/store';
import { type Application, Container, Rectangle, Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachDevtools, type StoreHistorySource } from '../src';

const cleanup: (() => void)[] = [];

function fixture() {
  const stage = new Container();
  const root = new PRoot(stage, { width: 320, height: 200 });
  const canvas = document.createElement('canvas');
  const ticker = new Ticker();
  document.body.append(canvas);
  const app = {
    stage,
    canvas,
    ticker,
    screen: new Rectangle(0, 0, 320, 200),
  } as Application;
  cleanup.push(() => {
    root.destroy();
    if (!stage.destroyed) stage.destroy({ children: true });
    ticker.destroy();
    canvas.remove();
  });
  root.doLayout();
  return { root, app, ticker };
}

function shadow() {
  return document.querySelector('[data-piant-devtools]')!.shadowRoot!;
}

async function attach(source: StoreHistorySource) {
  const value = fixture();
  const session = attachDevtools({
    ...value,
    enabled: true,
    stores: [source],
    sampleInterval: 60000,
  })!;
  cleanup.push(() => session.detach());
  await vi.waitFor(() => expect(value.ticker.count).toBe(1));
  shadow().querySelector<HTMLButtonElement>('#tab-state')!.click();
  return { ...value, session };
}

function control(label: string) {
  return shadow().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
}

afterEach(() => {
  for (const stop of cleanup.splice(0).reverse()) stop();
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('explicit store history integration', () => {
  it('does not read or subscribe to history sources unless Devtools is enabled', () => {
    const value = fixture();
    const source: StoreHistorySource = {
      name: 'Disabled',
      snapshot: vi.fn(),
      subscribe: vi.fn(),
      restore: vi.fn(),
      clear: vi.fn(),
    };
    expect(attachDevtools({ ...value, stores: [source] })).toBeNull();
    expect(source.snapshot).not.toHaveBeenCalled();
    expect(source.subscribe).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-devtools-host]')).toBeNull();
  });

  it('previews and restores a real combined persisted Store without replacing its actions', async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const store = createStore(
      persist(
        combine({ count: 0 }, (set) => ({
          increment: () => set((state) => ({ count: state.count + 1 })),
        })),
        {
          name: 'counter',
          storage,
          partialize: (state) => ({ count: state.count }),
        },
      ),
    );
    const history = createStoreHistory(store, {
      enabled: true,
      name: 'Counter',
    })!;
    cleanup.push(() => history.dispose());
    const { session } = await attach(history);
    const initialId = history.snapshot().currentId!;
    const before = session.snapshot().stores;
    session.refresh();
    expect(session.snapshot().stores).toBe(before);
    store.getState().increment();
    // Source subscription refreshes immediately, without waiting for the Ticker sample interval.
    expect(session.snapshot().stores![0].entries).toHaveLength(2);
    expect(session.snapshot().stores![0].entries.at(-1)!.state).toEqual({
      count: 1,
    });
    control(`Preview Counter snapshot #${initialId}`).click();
    expect(store.getState().count).toBe(1);
    control('Restore Counter snapshot').click();
    expect(store.getState().count).toBe(0);
    expect(storage.setItem).toHaveBeenLastCalledWith('counter', '{"count":0}');
    expect(history.snapshot().entries).toHaveLength(2);
    expect(history.snapshot().currentId).toBe(initialId);
    store.getState().increment();
    expect(store.getState().count).toBe(1);
    expect(history.snapshot().entries).toHaveLength(2);
    expect(history.snapshot().entries.at(-1)!.id).toBeGreaterThan(
      initialId + 1,
    );
    control('Clear Counter history').click();
    expect(history.snapshot().entries).toHaveLength(1);
    expect(history.snapshot().entries[0].state).toEqual({ count: 1 });
  });

  it('releases panel subscriptions on collapse and detach while the app-owned recorder keeps recording', async () => {
    const store = createStore(() => ({ count: 0 }));
    const history = createStoreHistory(store, {
      enabled: true,
      name: 'Counter',
    })!;
    cleanup.push(() => history.dispose());
    const nativeSubscribe = history.subscribe.bind(history);
    const releases = vi.fn();
    vi.spyOn(history, 'subscribe').mockImplementation((listener) => {
      const stop = nativeSubscribe(listener);
      return () => {
        releases();
        stop();
      };
    });
    const { session, ticker } = await attach(history);
    shadow().querySelector<HTMLButtonElement>('#collapse')!.click();
    expect(ticker.count).toBe(0);
    expect(releases).toHaveBeenCalledTimes(1);
    const closed = session.snapshot();
    store.setState({ count: 1 });
    expect(history.snapshot().entries).toHaveLength(2);
    expect(session.snapshot()).toBe(closed);
    document
      .querySelector<HTMLButtonElement>('[aria-label="Open Piant Devtools"]')!
      .click();
    expect(session.snapshot().stores![0].entries).toHaveLength(2);
    session.detach();
    expect(releases).toHaveBeenCalledTimes(2);
    expect(history.snapshot().disposed).toBe(false);
    store.setState({ count: 2 });
    expect(history.snapshot().entries).toHaveLength(3);
  });

  it('turns a disposed history into a read-only preview and makes retained controls inert after detach', async () => {
    const store = createStore(() => ({ count: 0 }));
    const history = createStoreHistory(store, {
      enabled: true,
      name: 'Counter',
    })!;
    cleanup.push(() => history.dispose());
    const restore = vi.spyOn(history, 'restore');
    const clear = vi.spyOn(history, 'clear');
    const { session } = await attach(history);
    const restoreButton = control('Restore Counter snapshot');
    const clearButton = control('Clear Counter history');
    history.dispose();
    expect(session.snapshot().stores![0].disposed).toBe(true);
    expect(restoreButton.disabled).toBe(true);
    restoreButton.click();
    expect(restore).not.toHaveBeenCalled();
    session.detach();
    clearButton.click();
    expect(clear).not.toHaveBeenCalled();
  });

  it('contains errors from registered sources and rejects restore failures without breaking the app', async () => {
    let failRead = true;
    const source: StoreHistorySource = {
      name: 'Unreliable',
      snapshot() {
        if (failRead) throw new Error('private source error');
        return {
          entries: [
            { id: 1, timestamp: 0, state: { count: 0 }, restorable: true },
          ],
          currentId: 1,
          disposed: false,
        };
      },
      subscribe: () => () => {},
      restore: vi.fn(() => {
        throw new Error('private restore error');
      }),
      clear: () => {},
    };
    const { session } = await attach(source);
    expect(session.snapshot().stores![0].error).toBe(
      'Store history could not be read.',
    );
    failRead = false;
    session.refresh();
    control('Restore Unreliable snapshot').click();
    expect(source.restore).toHaveBeenCalledWith(1);
    expect(session.snapshot().stores![0].error).toBe(
      'Store history restore failed.',
    );
    expect(() => session.refresh()).not.toThrow();
  });
});

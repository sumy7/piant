import {
  createState,
  onError,
  type PNode,
  PRoot,
  render,
  Show,
  View,
} from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
  Ticker,
} from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Button,
  TextField,
  type ToastController,
  ToastProvider,
  type ToastProviderProps,
  ToastViewport,
  UIProvider,
  useToast,
} from '../dist/index.js';
import {
  type FocusScope,
  getFocusScope,
} from '../dist/primitives/focusScope.js';

const runtime = vi.hoisted(() => ({ ticks: new Set<() => void>() }));
vi.mock('@piant/core', async (original) => ({
  ...(await original<typeof import('@piant/core')>()),
  onTick(callback: () => void) {
    runtime.ticks.add(callback);
    return () => runtime.ticks.delete(callback);
  },
}));
const cleanups: (() => void)[] = [];
let hidden = false;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(0);
  runtime.ticks.clear();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(Ticker.prototype, 'start').mockImplementation(function (
    this: Ticker,
  ) {
    return this;
  });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal('OffscreenCanvas', undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        font: '14px Arial',
        setTransform() {},
        clearRect() {},
        fillText() {},
        fillRect() {},
        measureText: (value: string) => ({
          width: value.length * 7,
          actualBoundingBoxAscent: 11,
          actualBoundingBoxDescent: 3,
        }),
      }) as never,
  );
});
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  await Promise.resolve();
  document.body.replaceChildren();
  runtime.ticks.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function attach(node: PNode, target: HTMLElement) {
  for (const child of node._view.children)
    if (child instanceof DOMContainer && !target.contains(child.element))
      target.append(child.element);
  for (const child of node._children) attach(child, target);
}
function fixture(
  options: Partial<Omit<ToastProviderProps, 'children'>> = {},
  dark = () => false,
) {
  const target = document.createElement('div');
  document.body.append(target);
  const scene = new PRoot(new Container(), { width: 500, height: 650 });
  const [shown, setShown] = createState(true);
  let api!: ToastController;
  let focus!: FocusScope;
  let viewport!: PNode;
  const stop = render(
    () =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        reducedMotion: false,
        children: () =>
          ToastProvider({
            ...options,
            children: () => {
              api = useToast();
              focus = getFocusScope();
              return View({
                style: { width: 420, gap: 8 },
                children: [
                  TextField({
                    'aria-label': 'Draft',
                    defaultValue: 'typed draft',
                  }),
                  Show({
                    get when() {
                      return shown();
                    },
                    children: (_shown) =>
                      ToastViewport({
                        label: 'Updates',
                        ref: (node) => {
                          viewport = node;
                        },
                      }),
                  }),
                  Button({ children: 'After notifications' }),
                ],
              });
            },
          }),
      }),
    scene,
  );
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    scene.destroyRecursive();
    target.remove();
  };
  cleanups.push(dispose);
  const sync = async () => {
    if (disposed) return;
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
      attach(scene, target);
      scene.doLayout();
      focus.refresh();
      for (const tick of [...runtime.ticks]) tick();
    }
  };
  const advance = async (ms: number) => {
    vi.advanceTimersByTime(ms);
    await sync();
  };
  return {
    api,
    target,
    scene,
    focus,
    sync,
    advance,
    dispose,
    setShown,
    viewport: () => viewport,
  };
}
function named(name: string, target: ParentNode = document) {
  const element = Array.from(
    target.querySelectorAll<HTMLElement>('[aria-label]'),
  ).find((element) => element.getAttribute('aria-label') === name);
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}
function key(element: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  element.dispatchEvent(event);
  return event;
}
function pointer(
  state: ReturnType<typeof fixture>,
  title: string,
  type: string,
  pointerType = 'mouse',
) {
  const button = named(`Dismiss: ${title}`, state.target);
  let node = state.focus.entries.find(
    (entry) => entry.binding.element === button,
  )?.node.parentNode;
  while (node && !node._view.listenerCount('pointerenter'))
    node = node.parentNode;
  if (!node) throw new Error('Missing interactive card ancestor');
  const event = new FederatedPointerEvent(new EventBoundary());
  Object.assign(event, {
    pointerType,
    pointerId: 1,
    button: 0,
    isPrimary: true,
  });
  node._view.emit(type, event);
}

describe('Toast viewport integration', () => {
  it('updates polite and assertive announcement channels independently while pending notifications remain silent', async () => {
    const state = fixture({ maxVisible: 2, maxToasts: 3 });
    await state.sync();
    const status = state.target.querySelector('[role=status]')!;
    const alert = state.target.querySelector('[role=alert]')!;
    state.api.show({
      id: 'normal',
      title: 'Saved',
      description: 'Project retained',
    });
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Saved. Project retained');
    expect(alert.textContent).toBe('');
    state.api.show({
      id: 'urgent',
      title: 'Failure',
      description: 'Contact support',
      priority: 'assertive',
      action: { label: 'Retry', onAction() {} },
    });
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Saved. Project retained');
    expect(alert.textContent).toBe('Failure. Contact support');
    expect(alert.textContent).not.toContain('Retry');
    expect(alert.textContent).not.toContain('Dismiss');
    state.api.show({ id: 'pending', title: 'Queued message' });
    await state.sync();
    await state.advance(50);
    expect(state.api.queuedCount()).toBe(1);
    expect(status.textContent).toBe('Saved. Project retained');
    expect(alert.textContent).toBe('Failure. Contact support');
    expect(
      state.target.querySelector('[role=group][aria-label="Queued message"]'),
    ).toBeNull();
    state.api.update('normal', { title: 'Saved again' });
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Saved again. Project retained');
    expect(alert.textContent).toBe('Failure. Contact support');
    state.api.update('urgent', { title: 'Failure updated' });
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Saved again. Project retained');
    expect(alert.textContent).toBe('Failure updated. Contact support');
    state.api.dismiss('normal');
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Queued message');
    expect(alert.textContent).toBe('Failure updated. Contact support');
    expect(status.querySelector('button')).toBeNull();
    expect(alert.querySelector('button')).toBeNull();
  });

  it('keeps stable empty live channels, announces only visible message text and never steals the draft selection', async () => {
    const [dark, setDark] = createState(false);
    const state = fixture({ maxVisible: 2, maxToasts: 4 }, dark);
    await state.sync();
    const status = state.target.querySelector('[role=status]')!;
    const alert = state.target.querySelector('[role=alert]')!;
    expect(status.textContent).toBe('');
    expect(alert.textContent).toBe('');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    const draft = named('Draft', state.target) as HTMLInputElement;
    draft.focus();
    draft.setSelectionRange(2, 7);
    state.api.show({
      id: 'saved',
      title: 'Saved',
      description: 'Project retained',
      action: { label: 'Undo', onAction() {} },
    });
    state.api.show({
      id: 'urgent',
      title: 'Connection lost',
      priority: 'assertive',
    });
    state.api.show({ id: 'waiting', title: 'Queued information' });
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Saved. Project retained');
    expect(alert.textContent).toBe('Connection lost');
    expect(status.querySelector('button')).toBeNull();
    expect(status.textContent).not.toContain('Undo');
    expect(
      state.target.querySelector(
        '[role=group][aria-label="Queued information"]',
      ),
    ).toBeNull();
    expect(state.api.queuedCount()).toBe(1);
    expect(document.activeElement).toBe(draft);
    expect([draft.selectionStart, draft.selectionEnd]).toEqual([2, 7]);
    const dismiss = named('Dismiss: Saved', state.target);
    state.api.update('saved', {
      title: 'Saved again',
      description: 'New message',
    });
    await state.sync();
    await state.advance(50);
    expect(named('Dismiss: Saved again', state.target)).toBe(dismiss);
    expect(state.target.querySelector('[role=status]')).toBe(status);
    expect(status.textContent).toBe('Saved again. New message');
    const mutations = vi.fn();
    const observer = new MutationObserver(mutations);
    observer.observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    setDark(true);
    state.api.update('saved', { duration: 0 });
    await state.sync();
    await state.advance(100);
    expect(status.textContent).toBe('Saved again. New message');
    expect(mutations).not.toHaveBeenCalled();
    observer.disconnect();
    state.api.dismiss('saved');
    await state.sync();
    await state.advance(50);
    expect(status.textContent).toBe('Queued information');
    expect(document.activeElement).toBe(draft);
    state.api.dismiss('urgent');
    state.api.show({ id: 'silent', title: 'Silent message', priority: 'off' });
    await state.sync();
    await state.advance(50);
    expect(named('Silent message', state.target).getAttribute('role')).toBe(
      'group',
    );
    expect(status.textContent).not.toContain('Silent message');
    expect(alert.textContent).not.toContain('Silent message');
  });

  it('preserves remaining duration until both hover and focus pauses end', async () => {
    const state = fixture();
    await state.sync();
    const closed = vi.fn();
    state.api.show({
      id: 'timed',
      title: 'Timed',
      duration: 1000,
      onDismiss: closed,
    });
    await state.sync();
    await state.advance(300);
    pointer(state, 'Timed', 'pointerenter');
    await state.advance(2000);
    expect(state.api.items()).toHaveLength(1);
    named('Dismiss: Timed', state.target).focus();
    pointer(state, 'Timed', 'pointerleave');
    await state.advance(2000);
    expect(state.api.items()).toHaveLength(1);
    named('Draft', state.target).focus();
    await state.sync();
    await state.advance(699);
    expect(state.api.items()).toHaveLength(1);
    await state.advance(1);
    expect(state.api.items()).toHaveLength(0);
    expect(closed).toHaveBeenCalledExactlyOnceWith('timeout');
  });

  it('independently pauses for window blur and document visibility without moving focus on expiry', async () => {
    const state = fixture();
    await state.sync();
    const draft = named('Draft', state.target);
    draft.focus();
    state.api.show({ id: 'background', title: 'Background', duration: 1000 });
    await state.sync();
    await state.advance(200);
    window.dispatchEvent(new Event('blur'));
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    await state.advance(5000);
    expect(state.api.items()).toHaveLength(1);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await state.advance(799);
    expect(state.api.items()).toHaveLength(1);
    await state.advance(1);
    expect(state.api.items()).toHaveLength(0);
    expect(document.activeElement).toBe(draft);
  });

  it('invokes only explicit actions once and confines Escape to focused toast controls outside composition', async () => {
    const state = fixture();
    await state.sync();
    const action = vi.fn();
    const closed = vi.fn();
    state.api.show({
      id: 'undo',
      title: 'Undo available',
      action: { label: 'Undo', onAction: action },
      onDismiss: closed,
    });
    state.api.show({ id: 'other', title: 'Other' });
    await state.sync();
    const draft = named('Draft', state.target);
    draft.focus();
    key(draft, 'Escape');
    expect(state.api.items()).toHaveLength(2);
    const undo = named('Undo: Undo available', state.target);
    undo.focus();
    key(undo, 'Escape', { isComposing: true });
    key(undo, 'Escape', { keyCode: 229 });
    expect(state.api.items()).toHaveLength(2);
    undo.click();
    undo.click();
    await state.sync();
    expect(action).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledExactlyOnceWith('action');
    const dismiss = named('Dismiss: Other', state.target);
    dismiss.focus();
    expect(key(dismiss, 'Escape').defaultPrevented).toBe(true);
    await state.sync();
    expect(state.api.items()).toHaveLength(0);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('preserves an action-canceled or synchronously updated card and forwards its current callback', async () => {
    const state = fixture();
    await state.sync();
    const closed = vi.fn();
    const calls = vi.fn();
    state.api.show({
      id: 'draft',
      title: 'Retained',
      onDismiss: closed,
      action: {
        label: 'Keep',
        onAction(event) {
          calls('first');
          event.preventDefault();
        },
      },
    });
    await state.sync();
    const keep = named('Keep: Retained', state.target);
    keep.focus();
    keep.click();
    expect(state.api.items()).toHaveLength(1);
    expect(closed).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(keep);
    const unchangedAction = state.api.items()[0].action!;
    state.api.update('draft', { title: 'Renamed', duration: 0 });
    await state.sync();
    expect(state.api.items()[0].action?.label).toBe(unchangedAction.label);
    expect(state.api.items()[0].action?.onAction).toBe(
      unchangedAction.onAction,
    );
    expect(named('Keep: Renamed', state.target)).toBe(keep);
    expect(document.activeElement).toBe(keep);
    state.api.update('draft', {
      action: {
        label: 'Keep',
        onAction() {
          calls('second');
          state.api.update('draft', { title: 'New content', action: null });
        },
      },
    });
    await state.sync();
    const replacement = named('Keep: Renamed', state.target);
    expect(replacement).not.toBe(keep);
    expect(keep.isConnected).toBe(false);
    keep.click();
    expect(calls.mock.calls).toEqual([['first']]);
    replacement.click();
    await state.sync();
    expect(calls.mock.calls).toEqual([['first'], ['second']]);
    expect(state.api.items()[0].title).toBe('New content');
    expect(
      state.target.querySelector('[aria-label="Keep: New content"]'),
    ).toBeNull();
    expect(closed).not.toHaveBeenCalled();
  });

  it.each([
    ['Space', 'callback'],
    ['Space', 'label'],
    ['pointer', 'callback'],
    ['pointer', 'label'],
  ] as const)(
    'cancels a held %s gesture when the current action %s changes',
    async (gesture, change) => {
      const state = fixture();
      await state.sync();
      const originalAction = vi.fn();
      const changedAction = vi.fn();
      const closed = vi.fn();
      state.api.show({
        id: 'armed',
        title: 'Pending operation',
        onDismiss: closed,
        action: { label: 'Original', onAction: originalAction },
      });
      await state.sync();
      const original = named('Original: Pending operation', state.target);
      const originalNode = state.focus.entries.find(
        (entry) => entry.binding.element === original,
      )!.node;
      const emit = (node: PNode, type: 'pointerdown' | 'pointerup') => {
        const event = new FederatedPointerEvent(new EventBoundary());
        Object.assign(event, {
          pointerType: 'mouse',
          pointerId: 41,
          button: 0,
          buttons: type === 'pointerdown' ? 1 : 0,
          isPrimary: true,
        });
        node._view.emit(type, event);
      };
      original.focus();
      if (gesture === 'Space') key(original, ' ');
      else emit(originalNode, 'pointerdown');
      const label = change === 'label' ? 'Replacement' : 'Original';
      const callback = change === 'callback' ? changedAction : originalAction;
      state.api.update('armed', { action: { label, onAction: callback } });
      await state.sync();
      const replacement = named(`${label}: Pending operation`, state.target);
      const replacementNode = state.focus.entries.find(
        (entry) => entry.binding.element === replacement,
      )!.node;
      expect(replacement).not.toBe(original);
      expect(original.isConnected).toBe(false);
      if (gesture === 'Space') {
        const release = () =>
          new KeyboardEvent('keyup', {
            key: ' ',
            bubbles: true,
            cancelable: true,
          });
        original.dispatchEvent(release());
        document.activeElement?.dispatchEvent(release());
      } else {
        emit(originalNode, 'pointerup');
        emit(replacementNode, 'pointerup');
      }
      await state.sync();
      expect(originalAction).not.toHaveBeenCalled();
      expect(changedAction).not.toHaveBeenCalled();
      expect(closed).not.toHaveBeenCalled();
      expect(state.api.items()).toHaveLength(1);
      replacement.focus();
      if (gesture === 'Space') {
        key(replacement, ' ');
        replacement.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: ' ',
            bubbles: true,
            cancelable: true,
          }),
        );
      } else {
        emit(replacementNode, 'pointerdown');
        emit(replacementNode, 'pointerup');
      }
      await state.sync();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(
        change === 'callback' ? originalAction : changedAction,
      ).not.toHaveBeenCalled();
      expect(closed).toHaveBeenCalledExactlyOnceWith('action');
      expect(state.api.items()).toHaveLength(0);
    },
  );

  it('recovers focus through the existing registry when a focused card is removed', async () => {
    const state = fixture();
    await state.sync();
    state.api.show({ id: 'first', title: 'First' });
    state.api.show({ id: 'second', title: 'Second' });
    await state.sync();
    named('Dismiss: First', state.target).focus();
    state.api.dismiss('first');
    await state.sync();
    expect(document.activeElement).toBe(named('Dismiss: Second', state.target));
    state.api.dismiss('second');
    await state.sync();
    expect(document.activeElement).toBe(
      named('After notifications', state.target),
    );
  });

  it('pauses an unmounted viewport and cleans node/provider timers and detached handlers', async () => {
    const state = fixture();
    await state.sync();
    const action = vi.fn();
    const closed = vi.fn();
    state.api.show({
      id: 'lifecycle',
      title: 'Lifecycle',
      duration: 1000,
      action: { label: 'Run', onAction: action },
      onDismiss: closed,
    });
    await state.sync();
    await state.advance(200);
    state.setShown(false);
    await state.sync();
    await state.advance(5000);
    expect(state.api.items()).toHaveLength(1);
    expect(closed).not.toHaveBeenCalled();
    state.setShown(true);
    await state.sync();
    const stale = named('Run: Lifecycle', state.target);
    state.viewport().destroyRecursive();
    await state.sync();
    expect(state.target.querySelector('[role=status]')).toBeNull();
    expect(runtime.ticks.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    stale.click();
    expect(action).not.toHaveBeenCalled();
    state.dispose();
    await state.advance(10000);
    expect(state.api.items()).toHaveLength(0);
    expect(state.api.show({ title: 'Late' })).toBeUndefined();
    expect(state.api.update('lifecycle', { title: 'Late' })).toBe(false);
    expect(closed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps queues, announcements and teardown independent across UIProvider instances', async () => {
    const first = fixture();
    const second = fixture();
    await first.sync();
    await second.sync();
    first.api.show({ id: 'same', title: 'First instance' });
    second.api.show({ id: 'same', title: 'Second instance' });
    await first.sync();
    await second.sync();
    await first.advance(50);
    expect(first.target.querySelector('[role=status]')?.textContent).toBe(
      'First instance',
    );
    expect(second.target.querySelector('[role=status]')?.textContent).toBe(
      'Second instance',
    );
    expect(
      first.target.contains(named('Dismiss: First instance', first.target)),
    ).toBe(true);
    expect(
      document.body.querySelectorAll('[role=region][aria-label=Updates]'),
    ).toHaveLength(2);
    first.dispose();
    named('Dismiss: Second instance', second.target).click();
    await second.sync();
    expect(second.api.items()).toHaveLength(0);
  });

  it('requires the matching provider scope and rejects duplicate providers', async () => {
    expect(() => useToast()).toThrow('ToastProvider');
    expect(() => ToastProvider({ children: () => undefined })).toThrow(
      'UIProvider',
    );
    const state = fixture();
    await state.sync();
    const isolated = new PRoot(new Container(), { width: 300, height: 100 });
    const stop = render(
      () =>
        UIProvider({
          children: () => {
            expect(() => useToast()).toThrow('ToastProvider');
            return ToastProvider({
              children: () => {
                const inherited = useToast();
                expect(() =>
                  ToastProvider({ children: () => undefined }),
                ).toThrow('one ToastProvider');
                UIProvider({
                  colorMode: 'dark',
                  children: () => {
                    expect(useToast()).toBe(inherited);
                    return undefined;
                  },
                });
                UIProvider({
                  focusScope: 'isolate',
                  children: () => {
                    expect(() => useToast()).toThrow('same UIProvider');
                    return undefined;
                  },
                });
                return View({});
              },
            });
          },
        }),
      isolated,
    );
    cleanups.push(() => {
      stop();
      isolated.destroyRecursive();
    });
  });

  it('reports a duplicate viewport while retaining the first owned notification region', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const scene = new PRoot(new Container(), { width: 420, height: 500 });
    const errors = vi.fn();
    let scope!: FocusScope;
    const stop = render(
      () =>
        UIProvider({
          children: () =>
            ToastProvider({
              children: () => {
                scope = getFocusScope();
                onError(errors);
                return View({
                  children: [ToastViewport({}), ToastViewport({})],
                });
              },
            }),
        }),
      scene,
    );
    cleanups.push(() => {
      stop();
      scene.destroyRecursive();
      target.remove();
    });
    await Promise.resolve();
    attach(scene, target);
    scene.doLayout();
    scope.refresh();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((errors.mock.calls[0][0] as Error).message).toContain(
      'one ToastViewport',
    );
    expect(
      target.querySelectorAll('[role=region][aria-label=Notifications]'),
    ).toHaveLength(1);
  });
});

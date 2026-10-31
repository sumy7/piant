import type { PNode } from '@piant/core';
import {
  acquireInteractive,
  createEffect,
  createState,
  root,
  View,
} from '@piant/core';
import { EventBoundary, FederatedPointerEvent } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPressable,
  type PressableOptions,
  type PressableState,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.restoreAllMocks();
});
function event(patch: Partial<FederatedPointerEvent> = {}) {
  const event = new FederatedPointerEvent(new EventBoundary());
  Object.assign(
    event,
    {
      pointerId: 1,
      button: 0,
      buttons: 1,
      pointerType: 'mouse',
      isPrimary: true,
    },
    patch,
  );
  return event;
}
function setup(options: PressableOptions = {}) {
  let node!: PNode;
  let state!: PressableState;
  const dispose = root((dispose) => {
    node = View({}) as PNode;
    node._view.eventMode = 'passive';
    state = createPressable(node, options);
    return dispose;
  });
  cleanups.push(() => {
    dispose();
    node.destroyRecursive();
  });
  return {
    node,
    state,
    dispose,
    emit: (
      name:
        | 'pointerenter'
        | 'pointerleave'
        | 'pointerdown'
        | 'pointerup'
        | 'pointerupoutside'
        | 'pointercancel'
        | 'pointertap',
      patch: Partial<FederatedPointerEvent> = {},
    ) => node._view.emit(name, event(patch)),
  };
}

describe('createPressable', () => {
  it('tracks hover/press and fires only once for down/up/tap/repeated up', () => {
    const onPress = vi.fn();
    const { node, state, emit } = setup({ onPress });
    emit('pointerenter');
    expect(state.hovered()).toBe(true);
    emit('pointerdown');
    expect(state.pressed()).toBe(true);
    emit('pointerup');
    expect(state.pressed()).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0][1]).toBe(node);
    emit('pointertap');
    emit('pointerup');
    expect(onPress).toHaveBeenCalledTimes(1);
    emit('pointerleave');
    expect(state.hovered()).toBe(false);
    emit('pointerup');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('pauses on leave, ignores other pointers and only resumes the original gesture on reentry', () => {
    const onPress = vi.fn();
    const { state, emit } = setup({ onPress });
    emit('pointerdown');
    emit('pointerleave');
    expect(state.pressed()).toBe(false);
    emit('pointerenter', { pointerId: 2 });
    expect(state.pressed()).toBe(false);
    emit('pointerdown', { pointerId: 2 });
    emit('pointerup', { pointerId: 2 });
    emit('pointercancel', { pointerId: 2 });
    expect(onPress).not.toHaveBeenCalled();
    emit('pointerenter');
    expect(state.pressed()).toBe(true);
    emit('pointerup', { isPrimary: false }); // terminal matching uses ID, not legacy touch isPrimary
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerupoutside', 'pointercancel'] as const)(
    'cancels %s and never lets subsequent up/tap activate',
    (name) => {
      const onPress = vi.fn();
      const { state, emit } = setup({ onPress });
      emit('pointerdown');
      emit(name);
      expect(state.pressed()).toBe(false);
      expect(state.hovered()).toBe(false);
      emit('pointerup');
      emit('pointertap');
      expect(onPress).not.toHaveBeenCalled();
    },
  );

  it('does not activate when released outside without reentry', () => {
    const onPress = vi.fn();
    const { emit } = setup({ onPress });
    emit('pointerdown');
    emit('pointerleave');
    emit('pointerup');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores non-primary input/buttons and never leaves touch hover behind', () => {
    const onPress = vi.fn();
    const { state, emit } = setup({ onPress });
    emit('pointerdown', { button: 2 });
    emit('pointerup', { button: 2 });
    emit('pointerdown', { isPrimary: false });
    emit('pointerup');
    expect(onPress).not.toHaveBeenCalled();
    emit('pointerenter', { pointerType: 'touch' });
    emit('pointerdown', { pointerType: 'touch' });
    expect(state.pressed()).toBe(true);
    expect(state.hovered()).toBe(false);
    emit('pointerup', { pointerType: 'touch', isPrimary: false });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(state.hovered()).toBe(false);
  });

  it('cancels on live disable, reflects re-enable hover, reads the latest callback without rebinding', () => {
    const [disabled, setDisabled] = createState(false);
    const first = vi.fn();
    const second = vi.fn();
    const [latest, setLatest] = createState(false);
    const { node, state, emit } = setup({
      get disabled() {
        return disabled();
      },
      get onPress() {
        return latest() ? second : first;
      },
    });
    const original = node._view.listeners('pointerup')[0];
    emit('pointerdown');
    setDisabled(true);
    expect(state.pressed()).toBe(false);
    expect(state.hovered()).toBe(false);
    expect(state.disabled()).toBe(true);
    setDisabled(false);
    expect(state.hovered()).toBe(true);
    emit('pointerup');
    expect(first).not.toHaveBeenCalled();
    emit('pointerdown');
    setLatest(true);
    emit('pointerup');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(node._view.listeners('pointerup')[0]).toBe(original);
  });

  it('does not resurrect a press cancelled synchronously by a pressed observer', () => {
    const [disabled, setDisabled] = createState(false);
    const onPress = vi.fn();
    const { state, emit } = setup({
      get disabled() {
        return disabled();
      },
      onPress,
    });
    const stop = root((dispose) => {
      createEffect(() => {
        if (state.pressed()) setDisabled(true);
      });
      return dispose;
    });
    cleanups.push(stop);
    emit('pointerdown');
    expect(state.pressed()).toBe(false);
    emit('pointerup');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not activate when a release observer destroys the binding', () => {
    const onPress = vi.fn();
    const { state, emit } = setup({ onPress });
    let started = false;
    const stop = root((dispose) => {
      createEffect(() => {
        if (state.pressed()) started = true;
        else if (started) state.dispose();
      });
      return dispose;
    });
    cleanups.push(stop);
    emit('pointerdown');
    emit('pointerup');
    expect(state.disabled()).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('clears a gesture before callback reentrancy or callback errors', () => {
    const onPress = vi.fn(() => {
      emit('pointerup');
      emit('pointertap');
      throw new Error('consumer');
    });
    const { state, emit } = setup({ onPress });
    emit('pointerdown');
    expect(() => emit('pointerup')).toThrow('consumer');
    expect(state.pressed()).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['owner', 'node', 'manual'] as const)(
    'releases listeners, disabled watcher and shared interactivity on %s disposal',
    (method) => {
      const [disabled, setDisabled] = createState(false);
      let reads = 0;
      const onPress = vi.fn();
      const { node, state, emit, dispose } = setup({
        get disabled() {
          reads++;
          return disabled();
        },
        onPress,
      });
      const external = vi.fn();
      node._view.on('pointerup', external);
      const releaseOther = acquireInteractive(node);
      emit('pointerdown');
      if (method === 'owner') dispose();
      else if (method === 'node') node.destroyRecursive();
      else state.dispose();
      const previous = reads;
      setDisabled(true);
      expect(reads).toBe(previous);
      expect(state.pressed()).toBe(false);
      expect(state.hovered()).toBe(false);
      expect(state.disabled()).toBe(true);
      if (method !== 'node') {
        expect(node._view.listenerCount('pointerdown')).toBe(0);
        expect(node._view.listenerCount('pointerup')).toBe(1);
        expect(node._view.eventMode).toBe('static');
        emit('pointerup');
        expect(external).toHaveBeenCalledTimes(1);
        releaseOther();
        expect(node._view.eventMode).toBe('passive');
      } else releaseOther();
      expect(onPress).not.toHaveBeenCalled();
      state.dispose();
      dispose();
    },
  );

  it('does not bind an already destroyed node', () => {
    const node = View({}) as PNode;
    node.destroyRecursive();
    const state = createPressable(node, { onPress: vi.fn() });
    expect(state.disabled()).toBe(true);
    expect(state.pressed()).toBe(false);
    state.dispose();
  });

  it.each(['none', 'static', 'dynamic'] as const)(
    'preserves explicit %s eventMode',
    (mode) => {
      const node = View({}) as PNode;
      node._view.eventMode = mode;
      const state = createPressable(node);
      expect(node._view.eventMode).toBe(mode);
      state.dispose();
      expect(node._view.eventMode).toBe(mode);
      node.destroyRecursive();
    },
  );

  it('handles native cancellation, blur, hidden page and lost mouse buttons', () => {
    const onPress = vi.fn();
    const { state, emit } = setup({ onPress });
    const native = (name: string, patch: PointerEventInit = {}) =>
      window.dispatchEvent(
        new PointerEvent(name, {
          pointerId: 1,
          pointerType: 'mouse',
          ...patch,
        }),
      );
    emit('pointerdown');
    native('pointercancel', { pointerId: 2 });
    expect(state.pressed()).toBe(true);
    native('pointercancel');
    expect(state.pressed()).toBe(false);
    emit('pointerdown');
    window.dispatchEvent(new Event('blur'));
    expect(state.pressed()).toBe(false);
    emit('pointerdown');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(state.pressed()).toBe(false);
    emit('pointerdown');
    native('pointermove', { buttons: 0 });
    expect(state.pressed()).toBe(false);
    emit('pointerup');
    expect(onPress).not.toHaveBeenCalled();
  });

  it('defers native release cancellation until Pixi handles up and does not cancel a newer gesture', async () => {
    const onPress = vi.fn();
    const { state, emit } = setup({ onPress });
    emit('pointerdown');
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(state.pressed()).toBe(true);
    emit('pointerup');
    emit('pointerdown');
    await Promise.resolve();
    expect(state.pressed()).toBe(true);
    emit('pointerup');
    expect(onPress).toHaveBeenCalledTimes(2);
    emit('pointerdown');
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await Promise.resolve();
    expect(state.pressed()).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('removes exactly its native guards on finish and disposal', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const addDoc = vi.spyOn(document, 'addEventListener');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    const { state, emit } = setup();
    emit('pointerdown');
    const listeners = add.mock.calls.filter(([name]) =>
      ['pointercancel', 'pointerup', 'pointermove', 'blur'].includes(name),
    );
    const visibility = addDoc.mock.calls.filter(
      ([name]) => name === 'visibilitychange',
    );
    expect(listeners).toHaveLength(4);
    expect(visibility).toHaveLength(1);
    state.dispose();
    for (const args of listeners) expect(remove).toHaveBeenCalledWith(...args);
    for (const args of visibility)
      expect(removeDoc).toHaveBeenCalledWith(...args);
  });
});

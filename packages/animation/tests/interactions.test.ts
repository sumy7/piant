import 'pixi.js/events';
import { acquireInteractive, createState, PNode, root, View } from '@piant/core';
import { Container, EventBoundary, FederatedPointerEvent, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drag, hover, press } from '../src/interactions';

const ticker = Ticker.shared;
let time = 0;
let autoStart = true;
beforeEach(() => {
  autoStart = ticker.autoStart;
  ticker.autoStart = false;
  ticker.stop();
  time = Math.ceil(performance.now());
  ticker.update(time);
});
afterEach(() => { ticker.stop(); ticker.autoStart = autoStart; });
function tick(ms = 50) { time += ms; ticker.update(time); }
function pointer(type: string, id = 1, x = 0, y = 0) {
  const event = new FederatedPointerEvent(new EventBoundary());
  event.type = type;
  event.pointerId = id;
  event.button = 0;
  event.global.set(x, y);
  return event;
}
function emit(node: PNode, name: 'pointerenter' | 'pointerleave' | 'pointerdown' | 'pointerup' | 'pointerupoutside' | 'pointercancel' | 'globalpointermove', id = 1, x = 0, y = 0) {
  node._view.emit(name, pointer(name, id, x, y));
}

describe('interaction animations with real Pixi nodes and events', () => {
  it('reverses hover from the current value, ignores duplicates, and restores alpha ownership', async () => {
    const node = new PNode();
    const effect = hover(node, { scale: 2, alpha: 0.5 }, { duration: 100, easing: 'linear' });
    emit(node, 'pointerenter');
    tick();
    expect(node._view.scale.x).toBeCloseTo(1.5);
    expect(node._animAlpha).toBeCloseTo(0.75);
    emit(node, 'pointerenter');
    emit(node, 'pointerleave', 2);
    tick();
    expect(node._view.scale.x).toBe(2);
    emit(node, 'pointerleave');
    tick();
    expect(node._view.scale.x).toBeCloseTo(1.5);
    emit(node, 'pointerenter');
    expect(node._view.scale.x).toBeCloseTo(1.5);
    tick(); tick();
    emit(node, 'pointercancel');
    tick(); tick();
    await Promise.resolve();
    expect(node._view.scale.x).toBe(1);
    expect(node._animAlpha).toBeNull();
    effect.dispose();
  });

  it('restores a primary press on leave, outside release and cancellation, preserving business listeners', () => {
    const node = new PNode();
    const business = vi.fn(function (this: Container) { expect(this).toBe(node._view); });
    node._view.on('pointerdown', business);
    const effect = press(node, { scale: 0.8 }, { duration: 100, easing: 'linear' });
    for (const name of ['pointerleave', 'pointerupoutside', 'pointercancel'] as const) {
      emit(node, 'pointerdown'); tick(); tick();
      expect(node._view.scale.x).toBeCloseTo(0.8);
      emit(node, name, 2); tick();
      expect(node._view.scale.x).toBeCloseTo(0.8);
      emit(node, name); tick(); tick();
      expect(node._view.scale.x).toBeCloseTo(1);
    }
    effect.dispose();
    expect(node._view.listenerCount('pointerdown')).toBe(1);
    emit(node, 'pointerdown');
    expect(business).toHaveBeenCalledTimes(4);
    expect(node._view.scale.x).toBe(1);
  });

  it('drags in a translated, rotated and scaled parent, bounds offsets, and ignores other pointers', () => {
    const node = new PNode();
    const parent = new Container();
    parent.position.set(100, 80);
    parent.scale.set(2, 3);
    parent.rotation = Math.PI / 3;
    parent.addChild(node._view);
    const effect = drag(node, { axis: 'x', bounds: { minX: -5, maxX: 20 } });
    const start = parent.toGlobal({ x: 10, y: 20 });
    const end = parent.toGlobal({ x: 25, y: 50 });
    emit(node, 'pointerdown', 1, start.x, start.y);
    emit(node, 'globalpointermove', 2, end.x, end.y);
    expect(node._animTranslate.x).toBeCloseTo(0);
    emit(node, 'globalpointermove', 1, end.x, end.y);
    expect(node._animTranslate.x).toBeCloseTo(15);
    expect(node._animTranslate.y).toBeCloseTo(0);
    const beyond = parent.toGlobal({ x: 100, y: 20 });
    emit(node, 'globalpointermove', 1, beyond.x, beyond.y);
    expect(node._animTranslate.x).toBe(20);
    emit(node, 'pointerupoutside');
    emit(node, 'globalpointermove', 1, start.x, start.y);
    expect(node._animTranslate.x).toBe(20);
    effect.reset();
    expect(node._animTranslate.x).toBeCloseTo(0);
    effect.dispose();
  });

  it('returns a canceled drag and smoothly interrupts a return with a new drag', () => {
    const node = new PNode();
    new Container().addChild(node._view);
    const effect = drag(node, { returnToOrigin: true, duration: 100, easing: 'linear' });
    emit(node, 'pointerdown');
    emit(node, 'globalpointermove', 1, 40, 20);
    emit(node, 'pointerup'); tick();
    expect(node._animTranslate.x).toBeCloseTo(20);
    emit(node, 'pointerdown', 2, 40, 20);
    emit(node, 'globalpointermove', 2, 50, 30);
    expect(node._animTranslate.x).toBeCloseTo(30);
    emit(node, 'pointercancel', 2); tick(); tick();
    expect(node._animTranslate.x).toBeCloseTo(0);
    expect(node._animTranslate.y).toBeCloseTo(0);
    effect.dispose();
  });

  it('cleans up owner and node lifetimes independently and keeps remaining instances interactive', () => {
    const node = new PNode();
    node._view.eventMode = 'passive';
    const disposeOwner = root((dispose) => {
      hover(node, { alpha: 0.5 });
      return dispose;
    });
    const pressing = press(node, { scale: 0.8 });
    expect(node._view.eventMode).toBe('static');
    emit(node, 'pointerenter'); tick();
    disposeOwner();
    expect(node._view.listenerCount('pointerenter')).toBe(0);
    expect(node._view.eventMode).toBe('static');
    emit(node, 'pointerdown'); tick();
    expect(node._view.scale.x).toBeLessThan(1);
    const restored = vi.fn(() => {
      expect(node._view.listenerCount('pointerdown')).toBe(0);
      expect(node._view.eventMode).toBe('passive');
      expect(node._view.scale.x).toBe(1);
      expect(node._animAlpha).toBeNull();
    });
    node.onDestroy(restored);
    node.destroy();
    expect(restored).toHaveBeenCalledOnce();
    expect(node._view.listenerCount('pointerdown')).toBe(0);
    expect(node._view.destroyed).toBe(true);
    pressing.dispose(); tick();
    expect(node._view.destroyed).toBe(true);
  });

  it('keeps independent hover and press properties isolated during disposal', () => {
    const node = new PNode();
    const hovering = hover(node, { alpha: 0.4 }, { duration: 100 });
    const pressing = press(node, { scale: 0.8 }, { duration: 100 });
    emit(node, 'pointerenter');
    emit(node, 'pointerdown');
    tick(); tick();
    hovering.dispose();
    expect(node._animAlpha).toBeNull();
    expect(node._view.scale.x).toBeCloseTo(0.8);
    emit(node, 'pointerupoutside');
    tick(); tick();
    expect(node._view.scale.x).toBe(1);
    pressing.dispose();
  });

  it('cancels dragging when the parent changes and never binds destroyed nodes', () => {
    const node = new PNode();
    new Container().addChild(node._view);
    const effect = drag(node, { axis: 'y', duration: 100 });
    emit(node, 'pointerdown');
    emit(node, 'globalpointermove', 1, 20, 30);
    expect(node._animTranslate.x).toBeCloseTo(0);
    expect(node._animTranslate.y).toBe(30);
    new Container().addChild(node._view);
    emit(node, 'globalpointermove', 1, 30, 40);
    tick(); tick();
    expect(node._animTranslate.y).toBeCloseTo(0);
    emit(node, 'globalpointermove', 1, 100, 100);
    expect(node._animTranslate.y).toBeCloseTo(0);
    effect.dispose();
    node.destroy();
    const inert = hover(node, { alpha: 0.5 });
    emit(node, 'pointerenter'); tick();
    expect(node._view.listenerCount('pointerenter')).toBe(0);
    expect(node._animAlpha).toBeNull();
    inert.reset(); inert.dispose();
  });

  it('ignores secondary presses and resets active pointers without removing listeners', () => {
    const node = new PNode();
    const effect = press(node, { scale: 0.8 }, { duration: 100 });
    const secondary = pointer('pointerdown');
    secondary.button = 2;
    node._view.emit('pointerdown', secondary); tick();
    expect(node._view.scale.x).toBe(1);
    emit(node, 'pointerdown'); tick();
    expect(node._view.scale.x).toBeLessThan(1);
    effect.reset();
    expect(node._view.scale.x).toBe(1);
    emit(node, 'pointerdown', 2); tick();
    expect(node._view.scale.x).toBeLessThan(1);
    effect.dispose();
  });

  it('keeps every interaction handle inert when its node is already destroyed', () => {
    const node = new PNode();
    node.destroy();
    const markDirty = vi.spyOn(node, 'markDirty');
    const handles = [hover(node, { scale: 2 }), press(node, { scale: 0.8 }), drag(node)];
    for (const handle of handles) {
      handle.reset();
      handle.dispose();
    }
    tick();
    expect(node._view.destroyed).toBe(true);
    expect(node._view.listenerCount('pointerdown')).toBe(0);
    expect(node._view.listenerCount('pointerenter')).toBe(0);
    expect(markDirty).not.toHaveBeenCalled();
  });

  it('shares eventMode ownership with reactive JSX handlers and preserves explicit mode changes', () => {
    const [enabled, setEnabled] = createState(true);
    let node!: PNode;
    const dispose = root((dispose) => {
      node = View({ get onClick() { return enabled() ? () => {} : undefined; } }) as PNode;
      return dispose;
    });
    const effect = hover(node, { scale: 1.1 });
    setEnabled(false);
    expect(node._view.eventMode).toBe('static');
    effect.dispose();
    expect(node._view.eventMode).toBe('passive');
    node._view.eventMode = 'none';
    const release = acquireInteractive(node);
    expect(node._view.eventMode).toBe('none');
    release();
    const second = hover(node, { alpha: 0.5 });
    node._view.eventMode = 'dynamic';
    second.dispose();
    expect(node._view.eventMode).toBe('dynamic');
    dispose();
  });
});

import { PNode, PRoot } from '@piant/core';
import { Container, Rectangle } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPicker } from '../src/picker';

const cleanup: (() => void)[] = [];
function fixture() {
  const stage = new Container();
  const root = new PRoot(stage, { width: 300, height: 200 });
  const canvas = document.createElement('canvas');
  canvas.style.cursor = 'grab';
  document.body.append(canvas);
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
  const nodes: PNode[] = [];
  function child(parent: PNode = root, style = {}) {
    const node = new PNode();
    node.setStyle({ width: 60, height: 40, position: 'absolute', ...style });
    parent.appendChild(node);
    nodes.push(node);
    root.doLayout();
    return node;
  }
  const onHover = vi.fn();
  const onPick = vi.fn();
  const onCancel = vi.fn();
  const picker = createPicker({
    canvas,
    app: { stage, screen: new Rectangle(0, 0, 300, 200) },
    getNodes: () => nodes,
    onHover,
    onPick,
    onCancel,
  });
  cleanup.push(() => {
    picker.remove();
    root.destroy();
    stage.destroy({ children: true });
    canvas.remove();
  });
  function event(type: string, x = 20, y = 30, target: EventTarget = canvas) {
    const value = type.startsWith('pointer')
      ? new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          isPrimary: true,
        })
      : new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
        });
    target.dispatchEvent(value);
    return value;
  }
  return {
    stage,
    root,
    canvas,
    nodes,
    child,
    picker,
    onHover,
    onPick,
    onCancel,
    event,
  };
}
afterEach(() => {
  for (const fn of cleanup.splice(0)) fn();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('canvas element picker', () => {
  it('picks noninteractive deepest elements in actual display order instead of node enumeration', () => {
    const f = fixture();
    const back = f.child();
    back._view.eventMode = 'none';
    const front = f.child();
    const nested = f.child(front);
    f.nodes.reverse();
    f.picker.start();
    f.event('click');
    expect(f.onPick).toHaveBeenLastCalledWith(nested);
    front._view.parent!.sortableChildren = false;
    front._view.parent!.setChildIndex(front._view, 0);
    f.event('click');
    expect(f.onPick).toHaveBeenLastCalledWith(back);
    expect(back._view.eventMode).toBe('none');
  });

  it('respects stable zIndex sorting without changing application children', () => {
    const f = fixture();
    const high = f.child();
    f.child();
    const parent = high._view.parent!;
    parent.sortableChildren = true;
    high._view.zIndex = 5;
    const before = [...parent.children];
    f.picker.start();
    f.event('click');
    expect(f.onPick).toHaveBeenCalledWith(high);
    expect(parent.children).toEqual(before);
  });

  it('maps CSS scaling and transformed ancestor coordinates using logical screen size', () => {
    const f = fixture();
    const parent = f.child();
    const node = f.child(parent, { width: 20, height: 10 });
    parent._view.position.set(100, 50);
    parent._view.rotation = Math.PI / 2;
    parent._view.scale.set(2);
    const point = node._view.toGlobal({ x: 5, y: 5 });
    f.picker.start();
    f.event('pointermove', 10 + point.x * 2, 20 + point.y * 2);
    expect(f.onHover).toHaveBeenLastCalledWith(node);
    f.event('click', 10 + point.x * 2, 20 + point.y * 2);
    expect(f.onPick).toHaveBeenCalledWith(node);
  });

  it.each([
    'visible',
    'renderable',
    'alpha',
    'destroyed',
    'zero-size',
    'outside',
    'foreign-root',
  ])('does not hit %s candidates', (kind) => {
    const f = fixture();
    const parent = f.child();
    const node = f.child(parent);
    f.nodes.splice(0, f.nodes.length, node);
    if (kind === 'visible') parent._view.visible = false;
    if (kind === 'renderable') parent._view.renderable = false;
    if (kind === 'alpha') parent._view.alpha = 0;
    if (kind === 'destroyed') node._view.destroy({ children: true });
    if (kind === 'zero-size') {
      node.setStyle({ width: 0 });
      f.root.doLayout();
    }
    if (kind === 'foreign-root') node._root = null;
    f.picker.start();
    f.event('click', kind === 'outside' ? 700 : 20);
    expect(f.onPick).not.toHaveBeenCalled();
  });

  it('applies rounded Piant overflow masks to descendant hits', () => {
    const f = fixture();
    const parent = f.child(f.root, {
      width: 20,
      height: 20,
      overflow: 'hidden',
      borderRadius: 10,
    });
    const child = f.child(parent, { width: 60, height: 40 });
    f.nodes.splice(0, 1);
    f.picker.start();
    f.event('click', 60, 30); // Inside child but outside parent's mask.
    f.event('click', 11, 21); // Inside rectangle but outside rounded corner.
    expect(f.onPick).not.toHaveBeenCalled();
    f.event('click', 30, 40);
    expect(f.onPick).toHaveBeenCalledWith(child);
  });

  it('captures the entire primary click sequence before existing canvas business listeners', () => {
    const f = fixture();
    const node = f.child();
    const business = vi.fn();
    for (const type of [
      'pointerdown',
      'pointerup',
      'mousedown',
      'mouseup',
      'click',
    ])
      f.canvas.addEventListener(type, business);
    f.onPick.mockImplementation(() => f.picker.stop());
    f.picker.start();
    for (const type of [
      'pointerdown',
      'mousedown',
      'pointerup',
      'mouseup',
      'click',
    ])
      expect(f.event(type).defaultPrevented).toBe(true);
    expect(f.onPick).toHaveBeenCalledExactlyOnceWith(node);
    expect(business).not.toHaveBeenCalled();
    expect(f.canvas.style.cursor).toBe('grab');
    f.event('click');
    expect(business).toHaveBeenCalledOnce();
  });

  it('does not intercept outside controls or confirm empty canvas, and clears hover on leave', () => {
    const f = fixture();
    f.child();
    const button = document.createElement('button');
    document.body.append(button);
    cleanup.push(() => button.remove());
    const business = vi.fn();
    button.addEventListener('click', business);
    f.picker.start();
    expect(f.event('click', 20, 30, button).defaultPrevented).toBe(false);
    expect(business).toHaveBeenCalledOnce();
    f.event('click', 500, 300);
    expect(f.onPick).not.toHaveBeenCalled();
    f.event('pointermove');
    f.canvas.dispatchEvent(new PointerEvent('pointerleave'));
    expect(f.onHover).toHaveBeenLastCalledWith(null);
    expect(f.canvas.style.cursor).toBe('crosshair');
  });

  it('cancels on Escape and suppresses the trailing click of an already pressed pointer', () => {
    const f = fixture();
    f.child();
    const business = vi.fn();
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.event('pointerdown');
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(f.onCancel).toHaveBeenCalledOnce();
    f.event('pointerup');
    f.event('mouseup');
    f.event('click');
    expect(f.onPick).not.toHaveBeenCalled();
    expect(business).not.toHaveBeenCalled();
    f.event('click');
    expect(business).toHaveBeenCalledOnce();
  });

  it('confirms PointerEvent clicks whose isPrimary is false without dispatching business clicks', () => {
    const f = fixture();
    const node = f.child();
    const business = vi.fn();
    f.canvas.addEventListener('click', business);
    f.onPick.mockImplementation(() => f.picker.stop());
    f.picker.start();
    f.event('pointerdown');
    f.event('pointerup');
    const click = new PointerEvent('click', {
      clientX: 20,
      clientY: 30,
      button: 0,
      isPrimary: false,
      bubbles: true,
      cancelable: true,
    });
    f.canvas.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(f.onPick).toHaveBeenCalledExactlyOnceWith(node);
    expect(business).not.toHaveBeenCalled();
    expect(f.canvas.style.cursor).toBe('grab');
  });

  it('keeps a cancelled long press isolated, then releases the next normal gesture', () => {
    vi.useFakeTimers();
    const f = fixture();
    f.child();
    const business = vi.fn();
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.event('pointerdown');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    vi.advanceTimersByTime(5000);
    f.event('pointerup');
    f.event('mouseup');
    f.event('click');
    expect(business).not.toHaveBeenCalled();
    expect(f.onPick).not.toHaveBeenCalled();
    f.event('pointerdown');
    f.event('pointerup');
    f.event('click');
    expect(business).toHaveBeenCalledOnce();
  });

  it('cleans up cancelled sequences released outside canvas without intercepting outside business', () => {
    const f = fixture();
    f.child();
    const outside = document.createElement('button');
    document.body.append(outside);
    cleanup.push(() => outside.remove());
    const business = vi.fn();
    outside.addEventListener('pointerup', business);
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.event('pointerdown');
    f.picker.stop();
    expect(f.event('pointerup', 20, 30, outside).defaultPrevented).toBe(false);
    f.event('click');
    expect(business).toHaveBeenCalledTimes(2);
  });

  it('lets a new pointerdown terminate a cancelled incomplete gesture', () => {
    const f = fixture();
    f.child();
    const business = vi.fn();
    f.canvas.addEventListener('pointerdown', business);
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.event('pointerdown');
    f.picker.stop();
    expect(f.event('pointerdown').defaultPrevented).toBe(false);
    f.event('pointerup');
    f.event('click');
    expect(business).toHaveBeenCalledTimes(2);
    expect(f.onPick).not.toHaveBeenCalled();
  });

  it('bounds the cancelled tail only after release when no click arrives', () => {
    vi.useFakeTimers();
    const f = fixture();
    f.child();
    const business = vi.fn();
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.event('pointerdown');
    f.picker.stop();
    vi.advanceTimersByTime(5000);
    f.event('pointerup');
    vi.advanceTimersByTime(751);
    f.event('click');
    expect(business).toHaveBeenCalledOnce();
  });

  it('supports an open shadow DOM canvas without swallowing outside shadow controls', () => {
    const f = fixture();
    const node = f.child();
    const host = document.createElement('div');
    document.body.append(host);
    cleanup.push(() => host.remove());
    host.attachShadow({ mode: 'open' }).append(f.canvas);
    f.picker.start();
    const click = new MouseEvent('click', {
      clientX: 20,
      clientY: 30,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    f.canvas.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(f.onPick).toHaveBeenCalledWith(node);
  });

  it('preserves a cursor changed by the application during inspection', () => {
    const f = fixture();
    f.picker.start();
    f.canvas.style.cursor = 'wait';
    f.picker.stop();
    expect(f.canvas.style.cursor).toBe('wait');
  });

  it('bounds cancelled sequence listeners, restores cursor, and makes remove final and idempotent', () => {
    vi.useFakeTimers();
    const f = fixture();
    f.child();
    const business = vi.fn();
    f.canvas.addEventListener('click', business);
    f.picker.start();
    f.picker.start();
    f.event('pointerdown');
    f.picker.stop();
    expect(f.canvas.style.cursor).toBe('grab');
    vi.advanceTimersByTime(751);
    f.event('pointerup');
    f.event('click');
    expect(business).not.toHaveBeenCalled();
    f.event('click');
    expect(business).toHaveBeenCalledOnce();
    f.picker.start();
    f.event('pointerdown');
    f.picker.remove();
    f.picker.remove();
    f.picker.start();
    f.event('click');
    expect(business).toHaveBeenCalledTimes(2);
    expect(f.onPick).not.toHaveBeenCalled();
    expect(f.canvas.style.cursor).toBe('grab');
  });
});

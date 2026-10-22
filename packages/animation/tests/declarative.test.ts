import { createState, PNode, root, Transition } from '@piant/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { animate, bindAnimation, fade, scale, slide } from '../src/index';

const listeners = vi.hoisted(() => new Set<(ticker: { deltaMS: number }) => void>());
vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  class ControlledTicker extends actual.Ticker {
    static get shared() {
      return {
        add: (listener: (ticker: { deltaMS: number }) => void) => listeners.add(listener),
        remove: (listener: (ticker: { deltaMS: number }) => void) => listeners.delete(listener),
      } as unknown as InstanceType<typeof actual.Ticker>;
    }
  }
  return { ...actual, Ticker: ControlledTicker };
});
function tick(deltaMS: number) { for (const listener of [...listeners]) listener({ deltaMS }); }

beforeEach(() => listeners.clear());

describe('bindAnimation', () => {
  it('retargets from current values without restarting an unchanged target', async () => {
    const node = new PNode();
    const [state, setState] = createState({ x: 100 });
    const binding = bindAnimation(node, state, { duration: 100 });
    const first = binding.animation!;
    tick(40);
    expect(node._animTranslate.x).toBeCloseTo(40);
    setState({ x: 100 });
    expect(binding.animation).toBe(first);
    setState({ x: 0 });
    expect(node._animTranslate.x).toBeCloseTo(40);
    await expect(first.finished).rejects.toThrow('cancelled');
    tick(50);
    expect(node._animTranslate.x).toBeCloseTo(20);
    setState({ x: 100 });
    tick(100);
    expect(node._animTranslate.x).toBe(100);
    expect(listeners.size).toBe(0);
    binding.dispose();
  });

  it('applies initial once, freezes cancellation, and restores original on reset', () => {
    const node = new PNode();
    node._animTranslate.x = 7;
    const [target, setTarget] = createState({ x: 100 });
    const binding = bindAnimation(node, target, { initial: { x: 20 }, duration: 100 });
    expect(node._animTranslate.x).toBe(20);
    tick(50);
    expect(node._animTranslate.x).toBe(60);
    binding.cancel();
    tick(100);
    expect(node._animTranslate.x).toBe(60);
    binding.reset();
    expect(node._animTranslate.x).toBe(7);
    setTarget({ x: 50 });
    tick(100);
    expect(node._animTranslate.x).toBe(50);
    binding.dispose();
  });

  it('does not schedule equal values and interpolates uniform scale from both axes', () => {
    const node = new PNode();
    const [target, setTarget] = createState({ scale: 1 });
    const binding = bindAnimation(node, target, { duration: 100 });
    expect(listeners.size).toBe(0);
    setTarget({ scale: 2 });
    tick(50);
    expect(node._view.scale.x).toBe(1.5);
    expect(node._view.scale.y).toBe(1.5);
    binding.dispose();
  });

  it('tweens initially unset style values from their rendered defaults', () => {
    const node = new PNode();
    const binding = bindAnimation(node, () => ({ borderRadius: 20, opacity: 0 }), { duration: 100 });
    tick(50);
    expect(node._layoutStyle.borderRadius).toBe(10);
    expect(node._layoutStyle.opacity).toBe(0.5);
    binding.reset();
    expect(node._layoutStyle.borderRadius).toBeUndefined();
    expect(node._layoutStyle.opacity).toBeUndefined();
    binding.dispose();
  });

  it('samples computed sizes but restores percentage and auto dimensions on reset', () => {
    const layout = new PNode();
    layout.setStyle({ width: 200, height: 100 });
    const node = new PNode();
    node.setStyle({ width: '50%', height: 'auto', minHeight: 20 });
    layout.appendChild(node);
    layout._layoutNode.calculateLayout(200, 100);
    const binding = bindAnimation(node, () => ({ width: 200, height: 60 }), { duration: 100 });
    tick(50);
    expect(node._layoutStyle.width).toBe(150);
    expect(node._layoutStyle.height).toBe(40);
    binding.reset();
    expect(node._layoutStyle.width).toBe('50%');
    expect(node._layoutStyle.height).toBe('auto');
    binding.dispose();
    layout.destroyRecursive();
  });

  it('snapshots color targets and does not restart for equal color channels', () => {
    const node = new PNode();
    node.setStyle({ backgroundColor: '#000000' });
    const [color, setColor] = createState([1, 0, 0]);
    const binding = bindAnimation(node, () => ({ backgroundColor: color() }), { duration: 100 });
    const first = binding.animation;
    setColor([1, 0, 0]);
    expect(binding.animation).toBe(first);
    setColor([0, 0, 1]);
    expect(binding.animation).not.toBe(first);
    binding.dispose();
  });

  it('releases observation and ticker on owner cleanup or node destruction', () => {
    const [target, setTarget] = createState({ x: 100 });
    const node = new PNode();
    let dispose = () => {};
    root((cleanup) => { dispose = cleanup; bindAnimation(node, target); });
    expect(listeners.size).toBe(1);
    dispose();
    setTarget({ x: 200 });
    expect(listeners.size).toBe(0);
    const second = new PNode();
    bindAnimation(second, target);
    second.destroy();
    setTarget({ x: 300 });
    expect(listeners.size).toBe(0);
  });
});

it('cancels low-level animations on node destruction without restoring stale values', async () => {
  const node = new PNode();
  const animation = animate(node, [{ x: 0 }, { x: 100 }], { duration: 100 });
  tick(40);
  node.destroy();
  expect(node._animTranslate.x).toBe(40);
  expect(listeners.size).toBe(0);
  await expect(animation.finished).rejects.toThrow('cancelled');
});

it('restores non-numeric original dimensions on low-level cancel and fill:none completion', () => {
  const node = new PNode();
  node.setStyle({ width: '50%', height: 'auto' });
  const cancelled = animate(node, [{ width: 10, height: 10 }, { width: 100, height: 50 }], 100);
  tick(50);
  cancelled.cancel();
  expect(node._layoutStyle.width).toBe('50%');
  expect(node._layoutStyle.height).toBe('auto');
  const completed = animate(node, [{ width: 10, height: 10 }, { width: 100, height: 50 }], 100);
  completed.finish();
  expect(node._layoutStyle.width).toBe('50%');
  expect(node._layoutStyle.height).toBe('auto');
  node.destroy();
});

it('rejects immediately on destroyed nodes without applying backwards fill or scheduling work', async () => {
  const node = new PNode();
  node._animTranslate.x = 25;
  node.destroy();
  const markDirty = vi.spyOn(node, 'markDirty');
  const animation = animate(node, [{ x: 0, alpha: 0 }, { x: 100, alpha: 1 }], {
    duration: 100, delay: 50, fill: 'both',
  });
  await expect(animation.finished).rejects.toThrow('cancelled');
  expect(animation.playState).toBe('idle');
  expect(node._animTranslate.x).toBe(25);
  expect(node._animAlpha).toBeNull();
  expect(markDirty).not.toHaveBeenCalled();
  expect(listeners.size).toBe(0);
});

it('reattaches destruction cleanup when a cancelled animation is played again', () => {
  const node = new PNode();
  const animation = animate(node, [{ x: 0 }, { x: 100 }], 100);
  animation.cancel();
  animation.play();
  expect(listeners.size).toBe(1);
  node.destroy();
  expect(listeners.size).toBe(0);
  animation.play();
  expect(listeners.size).toBe(0);
  expect(animation.playState).toBe('idle');
});

it('reset restores properties that only appear in initial', () => {
  const node = new PNode();
  const binding = bindAnimation(node, () => ({ x: 100 }), { initial: { alpha: 0, scale: 0.5 } });
  expect(node._animAlpha).toBe(0);
  expect(node._view.scale.x).toBe(0.5);
  binding.reset();
  expect(node._animAlpha).toBeNull();
  expect(node._view.scale.x).toBe(1);
  expect(node._view.scale.y).toBe(1);
  binding.dispose();
});

it('settles finished even if a playback callback throws', async () => {
  const node = new PNode();
  const finished = animate(node, [{ x: 0 }, { x: 100 }], 100);
  finished.onfinish = () => { throw new Error('finish handler'); };
  expect(() => finished.finish()).toThrow('finish handler');
  await expect(finished.finished).resolves.toBe(finished);
  const canceled = animate(node, [{ x: 0 }, { x: 100 }], 100);
  canceled.oncancel = () => { throw new Error('cancel handler'); };
  expect(() => canceled.cancel()).toThrow('cancel handler');
  await expect(canceled.finished).rejects.toThrow('cancelled');
  expect(listeners.size).toBe(0);
  node.destroy();
});

describe('transition presets', () => {
  it.each([
    ['fade', () => fade({ duration: 100 }), 'alpha', 0, 1],
    ['slide', () => slide({ x: 20, y: 0, duration: 100 }), 'x', 20, 0],
    ['scale', () => scale({ from: 0.5, duration: 100 }), 'scaleX', 0.5, 1],
  ] as const)('%s enters, reverses an exit, and cleans up', async (_name, factory, key, hidden, shown) => {
    const node = new PNode();
    const read = () => key === 'alpha' ? node._animAlpha : key === 'x' ? node._animTranslate.x : node._view.scale.x;
    const hooks = factory();
    const done = vi.fn();
    hooks.onEnter!(node, done);
    expect(read()).toBe(hidden);
    tick(100);
    await Promise.resolve();
    expect(read()).toBe(shown);
    expect(done).toHaveBeenCalledOnce();
    hooks.onExit!(node, done);
    tick(50);
    const middle = read();
    hooks.onEnter!(node, done);
    expect(read()).toBe(middle);
    tick(100);
    await Promise.resolve();
    expect(read()).toBe(shown);
    expect(done).toHaveBeenCalledTimes(2);
    hooks.onExit!(node, done);
    node.destroy();
    expect(listeners.size).toBe(0);
  });

  it('cooperates with Transition when an exit is superseded and the owner unmounts', async () => {
    const node = new PNode();
    let dispose = () => {};
    const [visible, setVisible] = createState(true);
    const rendered = root((cleanup) => {
      dispose = cleanup;
      return Transition({ ...fade({ duration: 100 }), get children() { return visible() ? node : null; } });
    }) as unknown as () => PNode[];
    setVisible(false);
    tick(50);
    expect(node._animAlpha).toBe(0.5);
    setVisible(true);
    await Promise.resolve();
    expect(node._animAlpha).toBe(0.5);
    tick(100);
    await Promise.resolve();
    expect(rendered()).toEqual([node]);
    expect(node._animAlpha).toBe(1);
    setVisible(false);
    expect(listeners.size).toBe(1);
    dispose();
    expect(listeners.size).toBe(0);
    node.destroy();
  });

  it('uses relative slide and scale baselines without disturbing other properties', () => {
    const node = new PNode();
    node._animTranslate.x = 10;
    node._view.scale.set(2, 3);
    slide({ x: 20, y: 0 }).onEnter!(node, () => {});
    expect(node._animTranslate.x).toBe(30);
    scale({ from: 0.5 }).onEnter!(node, () => {});
    expect(node._view.scale.x).toBe(1);
    expect(node._view.scale.y).toBe(1.5);
    node.destroy();
    expect(listeners.size).toBe(0);
  });
});

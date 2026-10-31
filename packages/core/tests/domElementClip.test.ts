import { Container, Matrix, Rectangle, type Renderer } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachDOMElement } from '../src/elements/attachDOMElement';
import { getDOMElementClip } from '../src/elements/domElementClip';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';

const roots: PRoot[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.destroy();
  vi.restoreAllMocks();
});
function scene() {
  const root = new PRoot(new Container(), { width: 400, height: 400 });
  roots.push(root);
  const parent = new PView();
  parent.setStyle({ width: 100, height: 100, overflow: 'hidden' });
  root.appendChild(parent);
  const node = new PView();
  node.setStyle({ width: 100, height: 100 });
  parent.appendChild(node);
  root.doLayout();
  vi.spyOn(parent._view, 'worldTransform', 'get').mockReturnValue(new Matrix());
  return { root, parent, node };
}
const bounds = (points: { x: number; y: number }[]) => ({
  left: Math.min(...points.map((p) => p.x)),
  right: Math.max(...points.map((p) => p.x)),
  top: Math.min(...points.map((p) => p.y)),
  bottom: Math.max(...points.map((p) => p.y)),
});
function mockRunner(name: 'postrender' | 'destroy') {
  type Listener = Partial<Record<typeof name, () => void>>;
  return {
    items: [] as Listener[] | null,
    add(item: Listener) {
      this.remove(item);
      this.items!.push(item);
    },
    remove(item: Listener) {
      const index = this.items!.indexOf(item);
      if (index !== -1) this.items!.splice(index, 1);
    },
    emit() {
      // Match SystemRunner's fixed-length, live-array iteration. In particular,
      // removing a destroy observer during emission must not skip a sibling.
      const items = this.items!;
      for (let i = 0, len = items.length; i < len; i++) items[i][name]!();
    },
    destroy() {
      this.items!.length = 0;
      this.items = null;
    },
  };
}
function renderer(width = 100, height = 100) {
  const runners = {
    postrender: mockRunner('postrender'),
    destroy: mockRunner('destroy'),
  };
  return {
    screen: new Rectangle(0, 0, width, height),
    runners,
    destroy() {
      runners.destroy.items!.reverse();
      runners.destroy.emit();
      for (const runner of Object.values(runners)) runner.destroy();
    },
  } as unknown as Renderer;
}

describe('DOM clipping geometry', () => {
  it('intersects viewport with translated and scaled input, in input-local coordinates', () => {
    const { parent, node } = scene();
    parent.setStyle({ overflow: 'visible' });
    expect(
      bounds(
        getDOMElementClip(
          node,
          new Matrix(2, 0, 0, 2, -20, 40),
          new Rectangle(0, 0, 100, 100),
        ),
      ),
    ).toEqual({ left: 10, right: 60, top: 0, bottom: 30 });
  });

  it('intersects multiple ancestor rectangles, including reflected transforms', () => {
    const { parent, node } = scene();
    const outer = new PView();
    outer.setStyle({ width: 70, height: 70, overflow: 'hidden' });
    parent._root!.appendChild(outer);
    outer.appendChild(parent);
    parent._root!.doLayout();
    vi.spyOn(outer._view, 'worldTransform', 'get').mockReturnValue(
      new Matrix(1, 0, 0, 1, 20, 10),
    );
    // Parent spans world x=0..100, y=0..100; outer narrows that to x20..90/y10..80.
    const transform = new Matrix(-1, 0, 0, 1, 100, 0);
    expect(
      bounds(getDOMElementClip(node, transform, new Rectangle(0, 0, 400, 400))),
    ).toEqual({ left: 10, right: 80, top: 10, bottom: 80 });
  });

  it('samples rounded corners inside the Pixi arc with bounded local error', () => {
    const { root, parent, node } = scene();
    parent.setStyle({ borderRadius: 40 });
    root.doLayout();
    const points = getDOMElementClip(
      node,
      new Matrix(),
      new Rectangle(0, 0, 400, 400),
    );
    expect(points.length).toBeGreaterThan(8);
    expect(points.some((p) => p.x === 0 && p.y === 0)).toBe(false);
    for (const p of points.filter((p) => p.x < 40 && p.y < 40)) {
      expect(Math.hypot(p.x - 40, p.y - 40)).toBeCloseTo(40, 8);
    }
    expect(bounds(points)).toEqual({
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
    });
  });

  it('handles rotation and empty or singular projected regions', () => {
    const { parent, node } = scene();
    parent.setStyle({ overflow: 'visible' });
    const points = getDOMElementClip(
      node,
      new Matrix(0, 1, -1, 0, 50, 0),
      new Rectangle(0, 0, 100, 100),
    );
    expect(bounds(points)).toEqual({ left: 0, right: 100, top: 0, bottom: 50 });
    expect(
      getDOMElementClip(
        node,
        new Matrix(1, 0, 0, 1, 500, 0),
        new Rectangle(0, 0, 100, 100),
      ),
    ).toEqual([]);
    expect(
      getDOMElementClip(
        node,
        new Matrix(0, 0, 0, 1, 0, 0),
        new Rectangle(0, 0, 100, 100),
      ),
    ).toEqual([]);
  });
});

describe('DOM postrender clipping lifecycle', () => {
  it('refreshes after transform-only scrolling, preserves scene visibility, and restores the same element', () => {
    const { node } = scene();
    const element = document.createElement('input');
    const binding = attachDOMElement(node, element);
    const world = new Matrix();
    vi.spyOn(binding.container, 'worldTransform', 'get').mockImplementation(
      () => world,
    );
    const target = renderer();
    binding.container.onRender!(target);
    target.runners.postrender.emit();
    expect(binding.hostElement.hidden).toBe(false);
    // Inertial scrolling changes only the Pixi transform; no layout/sync is run.
    world.ty = -120;
    target.runners.postrender.emit();
    expect(binding.hostElement.hidden).toBe(true);
    expect(binding.visible).toBe(true);
    world.ty = -60;
    target.runners.postrender.emit();
    expect(binding.hostElement.hidden).toBe(false);
    expect(binding.element).toBe(element);
    expect(binding.hostElement.firstChild).toBe(element);
    // Parse the produced CSS only to verify its numeric region against geometry,
    // rather than assert a serialization spelling or vertex ordering.
    const values = binding.hostElement.style.clipPath
      .match(/-?[\d.]+(?=px)/g)!
      .map(Number);
    expect(
      bounds(
        Array.from({ length: values.length / 2 }, (_, i) => ({
          x: values[i * 2],
          y: values[i * 2 + 1],
        })),
      ),
    ).toEqual({ left: 0, right: 100, top: 60, bottom: 100 });
  });

  it('isolates renderer listeners across bindings, transfers them, and removes them on disposal', () => {
    const { node } = scene();
    const first = attachDOMElement(node, document.createElement('input'));
    const second = attachDOMElement(node, document.createElement('input'));
    const a = renderer();
    const b = renderer();
    first.container.onRender!(a);
    first.container.onRender!(a);
    second.container.onRender!(a);
    expect(a.runners.postrender.items).toHaveLength(2);
    first.container.onRender!(b);
    expect(a.runners.postrender.items).toHaveLength(1);
    expect(b.runners.postrender.items).toHaveLength(1);
    first.dispose();
    expect(b.runners.postrender.items).toHaveLength(0);
    expect(b.runners.destroy.items).toHaveLength(0);
    expect(first.container.onRender).toBeNull();
    node.destroy();
    expect(a.runners.postrender.items).toHaveLength(0);
    expect(a.runners.destroy.items).toHaveLength(0);
    expect(() => {
      a.runners.postrender.emit();
      b.runners.postrender.emit();
    }).not.toThrow();
  });
  it.each(['dispose', 'node', 'transfer'] as const)(
    'handles renderer-first destruction before %s without touching destroyed runners',
    (operation) => {
      const { node } = scene();
      const first = attachDOMElement(node, document.createElement('input'));
      const second = attachDOMElement(node, document.createElement('input'));
      const old = renderer();
      first.container.onRender!(old);
      second.container.onRender!(old);
      // Multiple observers expose unsafe removal from the live destroy runner.
      expect(() => old.destroy()).not.toThrow();
      expect(old.runners.postrender.items).toBeNull();
      expect(old.runners.destroy.items).toBeNull();
      const next = renderer();
      expect(() => {
        if (operation === 'transfer') {
          first.container.onRender!(next);
          next.runners.postrender.emit();
          expect(next.runners.destroy.items).toHaveLength(1);
          first.dispose();
        } else if (operation === 'node') node.destroy();
        else first.dispose();
        second.dispose();
      }).not.toThrow();
      expect(first.element.parentElement).toBeNull();
      expect(second.element.parentElement).toBeNull();
      expect(first.container.parent).toBeNull();
      expect(next.runners.postrender.items).toHaveLength(0);
      expect(next.runners.destroy.items).toHaveLength(0);
    },
  );
});

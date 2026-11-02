import { type PNode, PRoot, root, View } from '@piant/core';
import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOverlayAnchor } from '../src/primitives/overlayAnchor';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const scene = new PRoot(new Container(), { width: 300, height: 200 });
  const node = View({ style: { width: 100, height: 40 } }) as PNode;
  scene.appendChild(node);
  const anchor = createOverlayAnchor(node);
  // Simulate DOMPipe attachment. Browser tests verify rendered geometry.
  host.append(anchor.element.parentElement!);
  scene.doLayout();
  cleanups.push(() => {
    anchor.dispose();
    scene.destroyRecursive();
    host.remove();
  });
  return { anchor, node, scene, host };
}

describe('createOverlayAnchor', () => {
  it('uses a noninteractive, hidden semantic bridge and follows visibility and attachment', async () => {
    const { anchor, node, scene, host } = setup();
    await Promise.resolve();
    expect(anchor.available).toBe(true);
    expect(anchor.element.getAttribute('aria-hidden')).toBe('true');
    expect(anchor.element.style.pointerEvents).toBe('none');
    expect(anchor.element.style.opacity).toBe('0');
    const wrapper = anchor.element.parentElement!;
    wrapper.hidden = true;
    expect(anchor.available).toBe(false);
    wrapper.hidden = false;
    host.remove();
    expect(anchor.available).toBe(false);
    document.body.append(host);
    node.setStyle({ display: 'none' });
    scene.doLayout();
    expect(anchor.available).toBe(false);
  });

  it('observes node geometry only while subscribed and cancels pending callbacks on disposal', async () => {
    const { anchor, node, scene } = setup();
    await Promise.resolve();
    const changed = vi.fn();
    const stop = anchor.observe(changed);
    await Promise.resolve();
    changed.mockClear();
    node.setStyle({ width: 140 });
    scene.doLayout();
    expect(changed).toHaveBeenCalled();
    stop();
    stop();
    changed.mockClear();
    node.setStyle({ width: 160 });
    scene.doLayout();
    await Promise.resolve();
    expect(changed).not.toHaveBeenCalled();
    const pending = vi.fn();
    anchor.observe(pending);
    anchor.dispose();
    anchor.dispose();
    await Promise.resolve();
    expect(pending).not.toHaveBeenCalled();
    expect(anchor.element.isConnected).toBe(false);
    expect(anchor.available).toBe(false);
  });

  it('disposes the bridge on node destruction and owner cleanup', () => {
    const { anchor, node } = setup();
    node.destroyRecursive();
    expect(anchor.available).toBe(false);
    expect(anchor.element.isConnected).toBe(false);
    const { node: other } = setup();
    let owned!: ReturnType<typeof createOverlayAnchor>;
    const dispose = root((dispose) => {
      owned = createOverlayAnchor(other);
      return dispose;
    });
    dispose();
    expect(owned.available).toBe(false);
    expect(owned.element.parentElement).toBeNull();
  });
});

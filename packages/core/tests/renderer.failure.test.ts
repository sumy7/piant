import { Container } from 'pixi.js';
import { expect, it, vi } from 'vitest';
import { PRoot } from '../src/elements/PRoot';
import { onCleanup } from '../src/reactivity/hooks';
import { render } from '../src/renderer/runtime';

it('releases the render owner when initial rendering throws', () => {
  const root = new PRoot(new Container());
  const cleanup = vi.fn();
  try {
    expect(() =>
      render(() => {
        onCleanup(cleanup);
        throw new Error('initial render failed');
      }, root),
    ).toThrow('initial render failed');
    expect(cleanup).toHaveBeenCalledOnce();
  } finally {
    root.destroy();
    root._layoutNode.freeRecursive();
  }
});

it('preserves an initial render error while still draining failing cleanup callbacks', () => {
  const root = new PRoot(new Container());
  const later = vi.fn();
  try {
    expect(() =>
      render(() => {
        onCleanup(() => {
          throw new Error('cleanup failed');
        });
        onCleanup(later);
        throw new Error('initial render failed');
      }, root),
    ).toThrow('initial render failed');
    expect(later).toHaveBeenCalledOnce();
  } finally {
    root.destroy();
    root._layoutNode.freeRecursive();
  }
});

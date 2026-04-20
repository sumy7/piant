import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PNode } from '../src/elements/PNode';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';

/** Build a minimal root + child tree and run one layout pass. */
function createRootWithChild(styles: Record<string, unknown> = {}) {
  const root = new PRoot(new Container(), { width: 200, height: 200 });
  const child = new PView();
  child.setStyle({ width: 50, height: 50, ...styles } as any);
  root.appendChild(child);
  root.doLayout();
  return { root, child };
}

describe('PNode _animAlpha override', () => {
  it('defaults _animAlpha to null', () => {
    const node = new PView();
    expect(node._animAlpha).toBeNull();
  });

  it('uses opacity from layoutStyle when _animAlpha is null', () => {
    const { child } = createRootWithChild({ opacity: 0.6 });
    expect(child._view.alpha).toBeCloseTo(0.6);
  });

  it('_animAlpha overrides layoutStyle opacity when set', () => {
    const { root, child } = createRootWithChild({ opacity: 0.6 });
    child._animAlpha = 0.2;
    child.markDirty();
    root.doLayout();
    expect(child._view.alpha).toBeCloseTo(0.2);
  });

  it('falls back to 1.0 when neither _animAlpha nor opacity is set', () => {
    const { child } = createRootWithChild({});
    expect(child._view.alpha).toBeCloseTo(1.0);
  });

  it('clearing _animAlpha (null) restores layoutStyle opacity', () => {
    const { root, child } = createRootWithChild({ opacity: 0.4 });
    child._animAlpha = 0.1;
    child.markDirty();
    root.doLayout();
    expect(child._view.alpha).toBeCloseTo(0.1);
    child._animAlpha = null;
    child.markDirty();
    root.doLayout();
    expect(child._view.alpha).toBeCloseTo(0.4);
  });
});

describe('PNode _animTranslate offset', () => {
  it('defaults _animTranslate to {x:0, y:0}', () => {
    const node = new PView();
    expect(node._animTranslate).toEqual({ x: 0, y: 0 });
  });

  it('_animTranslate.x is added to layout-computed x', () => {
    const { root, child } = createRootWithChild({});
    const layoutX = child._view.x;
    child._animTranslate.x = 30;
    child.markDirty();
    root.doLayout();
    expect(child._view.x).toBeCloseTo(layoutX + 30);
  });

  it('_animTranslate.y is added to layout-computed y', () => {
    const { root, child } = createRootWithChild({});
    const layoutY = child._view.y;
    child._animTranslate.y = 20;
    child.markDirty();
    root.doLayout();
    expect(child._view.y).toBeCloseTo(layoutY + 20);
  });

  it('clearing _animTranslate restores original layout position', () => {
    const { root, child } = createRootWithChild({});
    const origX = child._view.x;
    child._animTranslate.x = 50;
    child.markDirty();
    root.doLayout();
    expect(child._view.x).toBeCloseTo(origX + 50);
    child._animTranslate.x = 0;
    child.markDirty();
    root.doLayout();
    expect(child._view.x).toBeCloseTo(origX);
  });
});

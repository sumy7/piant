import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';

function createNode(styles: Record<string, unknown>) {
  const root = new PRoot(new Container(), { width: 300, height: 200 });
  const node = new PView();
  node.setStyle({ width: 100, height: 80, ...styles } as never);
  root.appendChild(node);
  return { root, node };
}

describe('PNode background and borders', () => {
  it('keeps numeric black as a valid background color', () => {
    const { root, node } = createNode({ backgroundColor: 0 });
    const fill = vi.spyOn(node._viewBg, 'fill');

    root.doLayout();

    expect(fill).toHaveBeenCalledWith({ color: 0 });
  });

  it('draws a uniform Yoga border inside the rounded outer bounds', () => {
    const { root, node } = createNode({
      backgroundColor: '#ffffff',
      borderColor: '#123456',
      borderRadius: 12,
      borderWidth: 4,
    });
    const drawRoundedRect = vi.spyOn(node as never, 'drawRoundedRect');
    const fill = vi.spyOn(node._viewBg, 'fill');
    const cut = vi.spyOn(node._viewBg, 'cut');

    root.doLayout();

    expect(fill).toHaveBeenCalledWith({ color: '#123456' });
    expect(cut).toHaveBeenCalledTimes(1);
    expect(drawRoundedRect).toHaveBeenCalledWith(
      node._viewBg,
      4,
      4,
      92,
      72,
      { bottomLeft: 8, bottomRight: 8, topLeft: 8, topRight: 8 },
    );
  });

  it('uses computed per-edge Yoga widths for the inner border geometry', () => {
    const { root, node } = createNode({
      borderColor: 0,
      borderRadius: 12,
      borderTopWidth: 2,
      borderRightWidth: 4,
      borderBottomWidth: 6,
      borderLeftWidth: 8,
    });
    const drawRoundedRect = vi.spyOn(node as never, 'drawRoundedRect');
    const fill = vi.spyOn(node._viewBg, 'fill');

    root.doLayout();

    expect(fill).toHaveBeenCalledWith({ color: 0 });
    expect(drawRoundedRect).toHaveBeenCalledWith(
      node._viewBg,
      8,
      2,
      88,
      72,
      { bottomLeft: 4, bottomRight: 6, topLeft: 4, topRight: 8 },
    );
  });
});

import { Graphics, Rectangle, Sprite, Texture, TextureSource } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import { Image } from '../src/components/Image';
import type { ImageStyles } from '../src/elements/layout/viewStyles';
import { PImage } from '../src/elements/PImage';
import { PView } from '../src/elements/PView';
import { createState } from '../src/reactivity';

const nodes: PImage[] = [];
function createImage(src: Sprite | Graphics, style: ImageStyles = {}) {
  const node = new PImage();
  nodes.push(node);
  node.setImage(src);
  node.setStyle({ width: 100, height: 100, ...style });
  return node;
}
function layout(node: PImage, style: ImageStyles = {}) {
  node.setStyle(style);
  node._layoutNode.calculateLayout(undefined, undefined);
  node.applyLayout();
}
function expectFrame(image: Sprite | Graphics, frame: number[]) {
  const actual = [image.width, image.height, image.x, image.y];
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(frame[index]);
  });
}
function sprite(width = 200, height = 100) {
  return new Sprite(
    new Texture({ source: new TextureSource({ width, height }) }),
  );
}
afterEach(() => {
  for (const node of nodes.splice(0)) node.destroy();
});

describe('PImage objectFit', () => {
  it.each(['graphics', 'sprite'] as const)(
    'restores intrinsic dimensions through fill → none → contain for %s',
    (kind) => {
      const src =
        kind === 'graphics'
          ? new Graphics().rect(0, 0, 200, 100).fill('red')
          : sprite();
      const node = createImage(src);
      layout(node, { objectFit: 'fill' });
      expectFrame(src, [100, 100, 0, 0]);
      layout(node, { objectFit: 'none' });
      expectFrame(src, [200, 100, 0, 0]);
      layout(node, { objectFit: 'contain' });
      expectFrame(src, [100, 50, 0, 25]);
      for (let i = 0; i < 10; i++) layout(node);
      expectFrame(src, [100, 50, 0, 25]);
      layout(node, { width: 300, height: 100 });
      expectFrame(src, [200, 100, 50, 0]);
    },
  );

  it.each([
    [200, 100, 200, 100, -50, 0],
    [100, 200, 100, 200, 0, -50],
    [100, 100, 100, 100, 0, 0],
  ])(
    'covers and clips a %s×%s source independently of child overflow',
    (width, height, ...frame) => {
      const src = new Graphics().rect(0, 0, width, height).fill('red');
      const node = createImage(src, {
        objectFit: 'cover',
        overflow: 'visible',
      });
      const child = new PView();
      child.setStyle({
        position: 'absolute',
        left: 120,
        width: 20,
        height: 20,
      });
      node.appendChild(child);
      layout(node);
      expectFrame(src, frame);
      const mask = node._imageContent.mask as Graphics;
      expect(mask).toBeInstanceOf(Graphics);
      expect(mask.getLocalBounds().rectangle).toEqual(
        new Rectangle(0, 0, 100, 100),
      );
      expect(node._view.mask).toBeFalsy();
      expect(child._view.parent).toBe(node._viewContent);
      for (let i = 0; i < 10; i++) layout(node);
      expect(node._imageContent.mask).toBe(mask);
      layout(node, {
        width: 150,
        height: 80,
        overflow: 'hidden',
        borderRadius: 12,
      });
      expect(mask.getLocalBounds().rectangle).toEqual(
        new Rectangle(0, 0, 150, 80),
      );
      expect(node._view.mask).toBe(node._viewMask);
      layout(node, { objectFit: 'none', overflow: 'visible' });
      expect(node._imageContent.mask).toBeFalsy();
      expect(node._view.mask).toBeFalsy();
    },
  );

  it('aligns Graphics with an offset local origin and an anchored Sprite', () => {
    const graphic = new Graphics().rect(-100, -50, 200, 100).fill('red');
    const node = createImage(graphic);
    layout(node);
    expectFrame(graphic, [100, 50, 50, 50]);
    layout(node, { objectFit: 'none' });
    expectFrame(graphic, [200, 100, 100, 50]);
    const anchored = sprite();
    anchored.anchor.set(0.5);
    node.setImage(anchored);
    layout(node, { objectFit: 'contain' });
    expectFrame(anchored, [100, 50, 50, 50]);
  });

  it('uses fresh unscaled geometry after an empty or edited Graphics source', () => {
    const src = new Graphics();
    const node = createImage(src, { objectFit: 'cover' });
    layout(node);
    expect(
      [src.scale.x, src.scale.y, src.x, src.y].every(Number.isFinite),
    ).toBe(true);
    src.rect(0, 0, 200, 100).fill('red');
    layout(node);
    expectFrame(src, [200, 100, -50, 0]);
    src.clear().rect(0, 0, 100, 200).fill('blue');
    layout(node, { objectFit: 'contain' });
    expectFrame(src, [50, 100, 25, 0]);
    layout(node, { width: 0, height: 0 });
    expect(
      [src.scale.x, src.scale.y, src.x, src.y].every(Number.isFinite),
    ).toBe(true);
    layout(node, { width: 100, height: 100 });
    expectFrame(src, [50, 100, 25, 0]);
  });

  it('fits intrinsic geometry independently of a source pivot and preset scale', () => {
    const src = new Graphics().rect(0, 0, 200, 100).fill('red');
    src.pivot.set(100, 50);
    src.scale.set(3, 2);
    const node = createImage(src);
    layout(node, { objectFit: 'fill' });
    expectFrame(src, [100, 100, 50, 50]);
    layout(node, { objectFit: 'none' });
    expectFrame(src, [200, 100, 100, 50]);
    expect(src.scale.x).toBe(1);
    expect(src.scale.y).toBe(1);
    layout(node, { objectFit: 'contain' });
    expectFrame(src, [100, 50, 50, 50]);
  });

  it('recovers from a zero-size texture and follows texture replacement', () => {
    const src = sprite(0, 0);
    src.texture.orig.width = 0;
    src.texture.orig.height = 0;
    const node = createImage(src);
    layout(node);
    expect(node._imageContent.visible).toBe(false);
    expect(
      [src.scale.x, src.scale.y, src.x, src.y].every(Number.isFinite),
    ).toBe(true);
    src.texture = sprite().texture;
    layout(node);
    expectFrame(src, [100, 50, 0, 25]);
    src.texture = sprite(100, 200).texture;
    layout(node);
    expectFrame(src, [50, 100, 25, 0]);
  });

  it('reads resized texture dimensions even if Sprite cached its old bounds', () => {
    const src = sprite();
    const node = createImage(src);
    layout(node);
    // Prime Pixi's cache before resizing the same non-dynamic texture.
    expect(src.bounds.width).toBe(200);
    src.texture.source.resize(100, 200);
    layout(node);
    expect(node._imageContent.visible).toBe(true);
    expectFrame(src, [50, 100, 25, 0]);
  });

  it('fits the logical untrimmed Sprite size rather than its atlas frame', () => {
    const src = new Sprite(
      new Texture({
        source: new TextureSource({ width: 256, height: 256 }),
        frame: new Rectangle(20, 20, 50, 50),
        orig: new Rectangle(0, 0, 200, 100),
        trim: new Rectangle(80, 20, 50, 50),
      }),
    );
    src.anchor.set(0.5);
    const node = createImage(src);
    layout(node);
    expectFrame(src, [100, 50, 50, 50]);
    layout(node, { objectFit: 'none' });
    expectFrame(src, [200, 100, 100, 50]);
  });

  it('updates the actual reactive Image src and detaches borrowed sources', () => {
    const original = new Graphics().rect(0, 0, 200, 100).fill('red');
    const replacement = sprite(100, 200);
    const [src, setSrc] = createState<Sprite | Graphics>(original);
    const node = Image({
      get src() {
        return src();
      },
      style: { width: 100, height: 100, objectFit: 'fill' },
    });
    nodes.push(node);
    layout(node);
    setSrc(replacement);
    layout(node, { objectFit: 'contain' });
    expect(original.parent).toBeNull();
    expect(original.destroyed).toBe(false);
    expect(node._imageContent.children).toEqual([replacement]);
    expectFrame(replacement, [50, 100, 25, 0]);
    setSrc(original);
    layout(node);
    expectFrame(original, [100, 50, 0, 25]);
    expect(replacement.parent).toBeNull();
    expect(replacement.destroyed).toBe(false);
  });

  it('destroys its clipping resources without destroying the borrowed source or texture', () => {
    const src = sprite();
    const node = createImage(src, { objectFit: 'cover' });
    layout(node);
    const mask = node._imageContent.mask as Graphics;
    const content = node._imageContent;
    node.destroy();
    node.destroy();
    expect(mask.destroyed).toBe(true);
    expect(content.destroyed).toBe(true);
    expect(src.parent).toBeNull();
    expect(src.destroyed).toBe(false);
    expect(src.texture.destroyed).toBe(false);
    expect(src.texture.source.destroyed).toBe(false);
  });
});

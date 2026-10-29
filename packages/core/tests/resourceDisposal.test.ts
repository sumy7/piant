import { Cache, Container, Sprite, Texture, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomView } from '../src/components/CustomView';
import { For } from '../src/components/For';
import { ScrollView } from '../src/components/ScrollView';
import { Transition } from '../src/components/Transition';
import { TransitionGroup } from '../src/components/TransitionGroup';
import { PImage } from '../src/elements/PImage';
import { PInput } from '../src/elements/PInput';
import { PRoot } from '../src/elements/PRoot';
import { PScrollView } from '../src/elements/PScrollView';
import { PText } from '../src/elements/PText';
import { PView } from '../src/elements/PView';
import { cleanup } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';
import { render } from '../src/renderer/runtime';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => ({
      setTransform() {},
      clearRect() {},
      fillText() {},
      measureText: () => ({ width: 10 }),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
});

afterEach(() => vi.restoreAllMocks());

describe('terminal node resource disposal', () => {
  it('stops the internal ScrollView ticker when its node is removed before owner cleanup', () => {
    const add = vi.spyOn(Ticker.prototype, 'add');
    const parent = new PView();
    const dispose = render(() => ScrollView({}), parent);
    const ticker = add.mock.contexts[0] as Ticker;
    expect(ticker.count).toBe(1);
    parent.firstChild!.remove();
    expect(ticker.count).toBe(0);
    dispose();
    expect(ticker.count).toBe(0);
    parent.destroy();
  });

  it.each([PView, PInput, PText, PImage, PScrollView])(
    'stops layout when %s is removed from its sizeChange callback',
    (NodeType) => {
      const root = new PRoot(new Container(), { width: 200, height: 100 });
      const node = new NodeType();
      root.appendChild(node);
      node._view.on('sizeChange', () => node.remove());
      expect(() => root.doLayout()).not.toThrow();
      expect(node.isDestroyed).toBe(true);
      root.destroy();
    },
  );

  it('stops ancestor layout when CustomView.onDraw removes the ancestor', () => {
    const root = new PRoot(new Container(), { width: 200, height: 100 });
    const ancestor = new PView();
    const dispose = render(() => {
      ancestor.appendChild(
        CustomView({
          style: { width: 30, height: 20 },
          onDraw: (_graphics, width) => {
            if (width) ancestor.remove();
          },
        }),
      );
      return ancestor;
    }, root);
    expect(() => root.doLayout()).not.toThrow();
    expect(ancestor.isDestroyed).toBe(true);
    dispose();
    root.destroy();
  });

  it('releases real Yoga nodes and Pixi graphics on repeated removal and replacement', () => {
    const root = new PRoot(new Container(), { width: 200, height: 100 });
    const rootFree = vi.spyOn(root._layoutNode, 'free');
    for (let i = 0; i < 20; i++) {
      const child = new PView();
      const nested = new PInput();
      const free = vi.spyOn(child._layoutNode, 'free');
      const nestedFree = vi.spyOn(nested._layoutNode, 'free');
      const context = child._viewBg.context;
      child.appendChild(nested);
      root.appendChild(child);
      root.doLayout();
      if (i % 2) root.replaceChild(new PView(), child);
      else child.remove();
      child.destroyRecursive();
      expect(free).toHaveBeenCalledTimes(1);
      expect(nestedFree).toHaveBeenCalledTimes(1);
      expect(child._view.destroyed).toBe(true);
      expect(context.destroyed).toBe(true);
      expect(nested._domContainer.destroyed).toBe(true);
      root.removeAllChildren();
    }
    root.destroyRecursive();
    root.destroyRecursive();
    expect(rootFree).toHaveBeenCalledTimes(1);
  });

  it('drains failing child cleanup and frees every sibling and parent once', () => {
    const parent = new PView();
    const first = new PView();
    const second = new PView();
    parent.appendChild(first);
    parent.appendChild(second);
    const frees = [parent, first, second].map((node) =>
      vi.spyOn(node._layoutNode, 'free'),
    );
    first.onDestroy(() => {
      throw new Error('cleanup failed');
    });
    expect(() => parent.destroyRecursive()).toThrow('cleanup failed');
    expect(() => parent.destroyRecursive()).not.toThrow();
    for (const free of frees) expect(free).toHaveBeenCalledTimes(1);
    for (const node of [parent, first, second])
      expect(node._view.destroyed).toBe(true);
  });

  it('preserves a moved-out view when the old parent is destroyed before layout', () => {
    const source = new PRoot(new Container());
    const target = new PRoot(new Container());
    const input = new PInput();
    source.appendChild(input);
    source.doLayout();
    target.appendChild(input);
    source.destroyRecursive();
    expect(input._view.destroyed).toBe(false);
    expect(input._domContainer.destroyed).toBe(false);
    target.doLayout();
    expect(input._view.parent).toBe(target._viewContent);
    target.destroyRecursive();
  });

  it('stops child reconciliation if a stale view removal destroys the old root', () => {
    const source = new PRoot(new Container());
    const target = new PRoot(new Container());
    const moved = new PInput();
    const retained = new PView();
    source.appendChild(moved);
    source.appendChild(retained);
    source.doLayout();
    target.appendChild(moved);
    moved._view.on('removed', () => source.destroy());
    expect(() => source.doLayout()).not.toThrow();
    expect(retained._view.parent).toBeNull();
    expect(retained._view.destroyed).toBe(true);
    expect(moved._view.destroyed).toBe(false);
    target.doLayout();
    target.destroy();
  });

  it('destroys direct node and root trees idempotently', () => {
    const stage = new Container();
    const root = new PRoot(stage);
    const input = new PInput();
    root.appendChild(input);
    const free = vi.spyOn(input._layoutNode, 'free');
    const domDestroy = vi.spyOn(input._domContainer, 'destroy');
    input.destroy();
    input.destroy();
    root.destroy();
    root.destroyRecursive();
    expect(free).toHaveBeenCalledTimes(1);
    expect(domDestroy).toHaveBeenCalledTimes(1);
    expect(root._view.destroyed).toBe(true);
    expect(stage.destroyed).toBe(false);
  });

  it('removes the real canvas texture cache entry and preserves supplied image resources', () => {
    const parent = new PView();
    const text = new PText();
    const canvas = text._textCanvas;
    const texture = text._textTexture;
    const source = texture.source;
    expect(Cache.has(canvas)).toBe(true);
    parent.appendChild(text);
    text.remove();
    expect(texture.destroyed).toBe(true);
    expect(source.destroyed).toBe(true);
    expect(Cache.has(canvas)).toBe(false);
    expect(text._textSprite.destroyed).toBe(true);
    expect(canvas.width * canvas.height).toBe(0);

    const shared = Texture.from(document.createElement('canvas'));
    const sprite = new Sprite(shared);
    const image = new PImage();
    image.setImage(sprite);
    image.applyLayout();
    image.destroyRecursive();
    expect(sprite.destroyed).toBe(false);
    expect(shared.destroyed).toBe(false);
    sprite.destroy();
    shared.destroy(true);
    parent.destroyRecursive();
  });

  it('destroys retained inline sprites and unregisters pending shared texture updates', () => {
    const shared = Texture.from(document.createElement('canvas'));
    shared.dynamic = true;
    const text = new PText();
    text.setContents([
      { type: 'image', source: shared, width: 20, height: 20 },
    ]);
    text._layoutNode.calculateLayout(100, 30);
    text.applyLayout();
    const inline = text._viewContent.children[0];
    text.setContents([]);
    text._layoutNode.calculateLayout(100, 30);
    text.applyLayout();
    expect(inline.parent).toBeNull();
    text.destroyRecursive();
    expect(inline.destroyed).toBe(true);
    expect(shared.destroyed).toBe(false);

    const pending = new Texture();
    pending.frame.width = 0;
    const next = new PText();
    const baseline = pending.listenerCount('update');
    next.setContents([{ type: 'image', source: pending }]);
    expect(pending.listenerCount('update')).toBe(baseline + 1);
    next.setContents([]);
    expect(pending.listenerCount('update')).toBe(baseline);
    next.setContents([{ type: 'image', source: pending }]);
    next.destroyRecursive();
    expect(pending.listenerCount('update')).toBe(baseline);
    expect(() => pending.emit('update', pending)).not.toThrow();
    shared.destroy(true);
    pending.destroy();
  });

  it('preserves detached resources and a live tree after its render owner is disposed', () => {
    const parent = new PView();
    const node = new PText();
    const free = vi.spyOn(node._layoutNode, 'free');
    const dispose = render(() => node, parent);
    dispose();
    expect(parent.firstChild).toBe(node);
    node.detach();
    expect(node._textTexture.destroyed).toBe(false);
    expect(free).not.toHaveBeenCalled();
    parent.appendChild(node);
    parent.destroyRecursive();
    expect(free).toHaveBeenCalledOnce();
  });

  it('releases text textures and later inline sprites after a Pixi destroyed listener throws', () => {
    const shared = Texture.from(document.createElement('canvas'));
    const text = new PText();
    text.setContents([
      { type: 'image', source: shared, width: 10, height: 10 },
      { type: 'image', source: shared, width: 10, height: 10 },
    ]);
    text._layoutNode.calculateLayout(100, 30);
    text.applyLayout();
    const sprites = [...text._viewContent.children];
    sprites[0].on('destroyed', () => {
      throw new Error('sprite cleanup failed');
    });
    text._textSprite.on('destroyed', () => {
      throw new Error('surface cleanup failed');
    });
    expect(() => text.destroyRecursive()).toThrow('sprite cleanup failed');
    expect(sprites.every((sprite) => sprite.destroyed)).toBe(true);
    expect(text._textSprite.destroyed).toBe(true);
    expect(text._textTexture.destroyed).toBe(true);
    expect(Cache.has(text._textCanvas)).toBe(false);
    expect(text._textCanvas.width * text._textCanvas.height).toBe(0);
    expect(shared.destroyed).toBe(false);
    expect(() => text.destroyRecursive()).not.toThrow();
    shared.destroy(true);
  });

  it.each(['Transition', 'TransitionGroup'] as const)(
    'keeps %s resources until exit completes and keeps render disposer ownership unchanged',
    (kind) => {
      const parent = new PView();
      const node = new PText();
      const free = vi.spyOn(node._layoutNode, 'free');
      const [visible, setVisible] = createState(true);
      let done: (() => void) | undefined;
      const ownerCleanup = vi.fn();
      const dispose = render(() => {
        const props = {
          onExit: (_el: unknown, finish: () => void) => {
            done = finish;
          },
        };
        if (kind === 'Transition')
          return Transition({
            ...props,
            get children() {
              return visible() ? node : null;
            },
          });
        return TransitionGroup({
          ...props,
          children: For({
            get each() {
              return visible() ? [1] : [];
            },
            children: () => {
              cleanup(ownerCleanup);
              return node;
            },
          }),
        });
      }, parent);
      setVisible(false);
      if (kind === 'TransitionGroup')
        expect(ownerCleanup).toHaveBeenCalledOnce();
      expect(node._view.destroyed).toBe(false);
      expect(node._textTexture.destroyed).toBe(false);
      expect(free).not.toHaveBeenCalled();
      done!();
      expect(node._view.destroyed).toBe(true);
      expect(node._textTexture.destroyed).toBe(true);
      expect(free).toHaveBeenCalledTimes(1);
      dispose();
      expect(parent._view.destroyed).toBe(false);
      parent.destroyRecursive();
    },
  );
});

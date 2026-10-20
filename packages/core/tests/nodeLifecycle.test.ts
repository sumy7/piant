import 'pixi.js/events';
import {
  Container,
  EventBoundary,
  FederatedPointerEvent,
  Rectangle,
  RenderLayer,
} from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { PInput } from '../src/elements/PInput';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';
import { reconcileArrays } from '../src/renderer/domdiff';

function createRoot() {
  return new PRoot(new Container(), { width: 300, height: 200 });
}

describe('PNode child lifecycle', () => {
  it('detaches removed render subtrees before destroying their resources', () => {
    const root = createRoot();
    const child = new PView();
    const nested = new PView();
    child.appendChild(nested);
    root.appendChild(child);
    root.doLayout();
    expect(child._view.parent).toBe(root._viewContent);

    const destroy = vi.spyOn(nested, 'destroy').mockImplementation(() => {
      expect(child._view.parent).toBeNull();
      expect(root._viewContent.children).toEqual([]);
    });

    root.removeChild(child);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(root._isDirty).toBe(true);
    expect(root._viewContent.children).toEqual([]);
    root.destroy();
  });

  it('detaches replaced render subtrees before the next layout pass', () => {
    const root = createRoot();
    const previous = new PView();
    const replacement = new PView();
    root.appendChild(previous);
    root.doLayout();

    root.replaceChild(replacement, previous);

    expect(previous._view.parent).toBeNull();
    expect(root._viewContent.children).not.toContain(previous._view);
    root.doLayout();
    expect(root._viewContent.children).toEqual([replacement._view]);
    root.removeAllChildren();
    root.destroy();
  });

  it('preserves every retained input during all four-node reorderings', () => {
    const permutations = (items: number[]): number[][] =>
      items.length === 0
        ? [[]]
        : items.flatMap((item, index) =>
            permutations(items.filter((_value, i) => i !== index)).map(
              (rest) => [item, ...rest],
            ),
          );
    for (const order of permutations([0, 1, 2, 3])) {
      const root = createRoot();
      const inputs = order.map(() => new PInput());
      for (const input of inputs) root.appendChild(input);
      root.doLayout();
      const layer = new RenderLayer();
      layer.attach(...inputs.map((input) => input._view));
      const target = order.map((index) => inputs[index]);
      reconcileArrays(root, [...inputs], target);
      expect(
        root._children.map((input) => inputs.indexOf(input as PInput)),
      ).toEqual(order);
      for (const input of inputs) {
        expect(input._domContainer.destroyed).toBe(false);
        expect(input._view.parent === root._viewContent).toBe(true);
        expect(input._view.parentRenderLayer === layer).toBe(true);
      }
      root.doLayout();
      expect(root._viewContent.children).toEqual(
        target.map((input) => input._view),
      );
      expect(layer.renderLayerChildren).toHaveLength(4);
      layer.detachAll();
      root.removeAllChildren();
      root.destroy();
    }
  });

  it.each(['appendChild', 'insertBefore'] as const)(
    'keeps a retained view mounted and in its render layer during %s reordering',
    (operation) => {
      const root = createRoot();
      const first = new PView();
      const input = new PInput();
      const last = new PView();
      root.appendChild(first);
      root.appendChild(input);
      root.appendChild(last);
      root.doLayout();
      const layer = new RenderLayer();
      layer.attach(input._view);
      const removed = vi.fn();
      const added = vi.fn();
      input._view.on('removed', removed);
      input._view.on('added', added);

      if (operation === 'appendChild') root.appendChild(input);
      else root.insertBefore(input, first);

      expect(input._view.parent === root._viewContent).toBe(true);
      expect(input._view.parentRenderLayer === layer).toBe(true);
      root.doLayout();
      expect(input._view.parentRenderLayer === layer).toBe(true);
      expect(removed).not.toHaveBeenCalled();
      expect(added).not.toHaveBeenCalled();
      expect(input._domContainer.destroyed).toBe(false);
      expect(root._viewContent.children).toEqual(
        (operation === 'appendChild'
          ? [first, last, input]
          : [input, first, last]
        ).map((node) => node._view),
      );
      layer.detachAll();
      root.removeAllChildren();
      root.destroy();
    },
  );

  it.each(['source-first', 'target-first'] as const)(
    'retains moved views until layout with %s cross-root reconciliation',
    (layoutOrder) => {
      const source = createRoot();
      const target = createRoot();
      const input = new PInput();
      const nested = new PView();
      input.appendChild(nested);
      source.appendChild(input);
      source.doLayout();
      target.doLayout();
      const view = input._view;
      const domContainer = input._domContainer;
      const destroy = vi.spyOn(domContainer, 'destroy');

      target.appendChild(input);

      expect(view.parent === source._viewContent).toBe(true);
      expect(input.parentNode).toBe(target);
      expect(input._root).toBe(target);
      expect(nested._root).toBe(target);
      const roots =
        layoutOrder === 'source-first' ? [source, target] : [target, source];
      for (const root of roots) root.doLayout();
      expect(view.parent === target._viewContent).toBe(true);
      expect(source._viewContent.children).toEqual([]);
      expect(target._viewContent.children).toEqual([view]);
      expect(input._view).toBe(view);
      expect(input._domContainer).toBe(domContainer);
      expect(destroy).not.toHaveBeenCalled();
      target.removeAllChildren();
      source.destroy();
      target.destroy();
    },
  );

  it.each(['remove', 'replace'] as const)(
    'detaches a moved view from its previous Pixi parent on terminal %s before layout',
    (operation) => {
      const root = createRoot();
      const source = new PView();
      const target = new PView();
      const input = new PInput();
      root.appendChild(source);
      root.appendChild(target);
      source.appendChild(input);
      root.doLayout();
      const destroy = vi.spyOn(input._domContainer, 'destroy');

      target.appendChild(input);
      if (operation === 'remove') target.removeChild(input);
      else target.replaceChild(new PView(), input);

      expect(input._view.parent).toBeNull();
      expect(source._viewContent.children).toEqual([]);
      expect(destroy).toHaveBeenCalledTimes(1);
      root.doLayout();
      expect(source._viewContent.children).toEqual([]);
      expect(target._viewContent.children).not.toContain(input._view);
      root.removeAllChildren();
      root.destroy();
    },
  );

  it('preserves pointertap when pointerup reorders a retained node', () => {
    const stage = new Container();
    stage.eventMode = 'static';
    const root = new PRoot(stage, { width: 300, height: 200 });
    const button = new PView();
    button.setStyle({ width: 20, height: 20 });
    button._view.eventMode = 'static';
    button._view.hitArea = new Rectangle(0, 0, 20, 20);
    root.appendChild(button);
    root.doLayout();
    const boundary = new EventBoundary(stage);
    const onClick = vi.fn();
    button._view.on('pointerup', () => root.appendChild(button));
    button._view.on('pointertap', onClick);
    const event = new FederatedPointerEvent(boundary);
    Object.assign(event, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    });
    event.global.set(5, 5);
    event.type = 'pointerdown';
    boundary.mapEvent(event);
    event.type = 'pointerup';
    event.buttons = 0;
    boundary.mapEvent(event);

    expect(onClick).toHaveBeenCalledTimes(1);
    root.removeAllChildren();
    root.destroy();
  });

  it.each(['remove', 'replace'] as const)(
    'detaches pending moved descendants before their new ancestor is destroyed by %s',
    (operation) => {
      const root = createRoot();
      const source = new PView();
      const target = new PView();
      const input = new PInput();
      root.appendChild(source);
      root.appendChild(target);
      source.appendChild(input);
      root.doLayout();
      const destroy = vi.spyOn(input, 'destroy').mockImplementation(() => {
        expect(input._view.parent).toBeNull();
        expect(source._viewContent.children).toEqual([]);
      });

      target.appendChild(input);
      if (operation === 'remove') root.removeChild(target);
      else root.replaceChild(new PView(), target);

      expect(destroy).toHaveBeenCalledTimes(1);
      expect(input._view.parent).toBeNull();
      root.doLayout();
      root.removeAllChildren();
      root.destroy();
    },
  );

  it('finishes logical detachment before removed listeners can request removal again', () => {
    const root = createRoot();
    const input = new PInput();
    root.appendChild(input);
    root.doLayout();
    const destroy = vi.spyOn(input, 'destroy');
    input._view.on('removed', () => {
      expect(input.parentNode).toBeNull();
      expect(input._root).toBeNull();
      input.remove();
    });

    root.removeChild(input);

    expect(destroy).toHaveBeenCalledTimes(1);
    root.destroy();
  });

  it('destroys all descendants once when removal listeners request removal again', () => {
    const root = createRoot();
    const parent = new PView();
    const children = [new PInput(), new PInput(), new PInput()];
    root.appendChild(parent);
    for (const child of children) parent.appendChild(child);
    root.doLayout();
    const destroys = children.map((child) => {
      child._view.on('removed', () => child.remove());
      return vi.spyOn(child, 'destroy');
    });

    root.removeChild(parent);

    for (const destroy of destroys) expect(destroy).toHaveBeenCalledTimes(1);
    root.destroy();
  });

  it.each(['remove', 'reparent'] as const)(
    'does not destroy a sibling again after a removal listener requests %s',
    (operation) => {
      const root = createRoot();
      const parent = new PView();
      const target = new PView();
      const first = new PInput();
      const sibling = new PInput();
      root.appendChild(parent);
      root.appendChild(target);
      parent.appendChild(first);
      parent.appendChild(sibling);
      root.doLayout();
      const destroy = vi.spyOn(sibling, 'destroy');
      first._view.on('removed', () => {
        if (operation === 'remove') sibling.remove();
        else target.appendChild(sibling);
      });

      root.removeChild(parent);

      if (operation === 'remove') {
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(sibling._view.parent).toBeNull();
      } else {
        expect(destroy).not.toHaveBeenCalled();
        expect(sibling.parentNode).toBe(target);
        root.doLayout();
        expect(sibling._view.parent === target._viewContent).toBe(true);
        expect(sibling._domContainer.destroyed).toBe(false);
      }
      root.removeAllChildren();
      root.destroy();
    },
  );

  it('only destroys removed inputs across mixed insertion, removal and reorder cases', () => {
    const sequences = (items: number[]): number[][] => [
      [],
      ...items.flatMap((item, index) =>
        sequences(items.filter((_value, i) => i !== index)).map((rest) => [
          item,
          ...rest,
        ]),
      ),
    ];
    for (const order of sequences([0, 1, 2, 3])) {
      const root = createRoot();
      const inputs = [new PInput(), new PInput(), new PInput(), new PInput()];
      const previous = inputs.slice(0, 3);
      for (const input of previous) root.appendChild(input);
      const target = order.map((index) => inputs[index]);
      reconcileArrays(root, [...previous], target);
      expect(
        root._children.map((input) => inputs.indexOf(input as PInput)),
      ).toEqual(order);
      for (const input of previous)
        expect(input._domContainer.destroyed).toBe(!target.includes(input));
      if (target.includes(inputs[3]))
        expect(inputs[3]._domContainer.destroyed).toBe(false);
      root.doLayout();
      expect(root._viewContent.children).toEqual(
        target.map((input) => input._view),
      );
      root.removeAllChildren();
      root.destroy();
    }
  });
  it('reorders an input with appendChild without destroying it', () => {
    const root = createRoot();
    const input = new PInput();
    const sibling = new PView();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    root.appendChild(input);
    root.appendChild(sibling);
    root.doLayout();
    root.appendChild(input);
    root.doLayout();

    expect(destroy).not.toHaveBeenCalled();
    expect(root._children).toEqual([sibling, input]);
    expect(root._layoutNode.getChildCount()).toBe(2);
    expect(root._viewContent.children).toEqual([sibling._view, input._view]);
    expect(input.parentNode).toBe(root);
    expect(input._root).toBe(root);
  });

  it('reparents an input across roots without destroying it', () => {
    const source = createRoot();
    const target = createRoot();
    const input = new PInput();
    const nested = new PView();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    input.appendChild(nested);
    source.appendChild(input);
    source.doLayout();
    target.appendChild(input);
    source.doLayout();
    target.doLayout();

    expect(destroy).not.toHaveBeenCalled();
    expect(source._children).toEqual([]);
    expect(source._layoutNode.getChildCount()).toBe(0);
    expect(source._viewContent.children).toEqual([]);
    expect(target._children).toEqual([input]);
    expect(input._root).toBe(target);
    expect(nested._root).toBe(target);
  });

  it('reorders an input with insertBefore without destroying it', () => {
    const root = createRoot();
    const first = new PView();
    const input = new PInput();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    root.appendChild(first);
    root.appendChild(input);
    root.doLayout();
    root.insertBefore(input, first);
    root.doLayout();

    expect(destroy).not.toHaveBeenCalled();
    expect(root._children).toEqual([input, first]);
    expect(root._layoutNode.getChildCount()).toBe(2);
    expect(root._viewContent.children).toEqual([input._view, first._view]);
  });

  it('does not detach a node when insertBefore receives an invalid reference', () => {
    const source = createRoot();
    const target = createRoot();
    const input = new PInput();
    const invalidReference = new PView();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    source.appendChild(input);
    target.insertBefore(input, invalidReference);

    expect(destroy).not.toHaveBeenCalled();
    expect(source._children).toEqual([input]);
    expect(input.parentNode).toBe(source);
    expect(input._root).toBe(source);
    expect(target._children).toEqual([]);
  });

  it('treats replacing a node with itself as a no-op', () => {
    const root = createRoot();
    const input = new PInput();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    root.appendChild(input);
    root.replaceChild(input, input);

    expect(destroy).not.toHaveBeenCalled();
    expect(root._children).toEqual([input]);
    expect(root._layoutNode.getChildCount()).toBe(1);
  });

  it('moves the replacement but permanently destroys the replaced node once', () => {
    const root = createRoot();
    const otherParent = new PView();
    const replacement = new PInput();
    const replaced = new PInput();
    const replacementDestroy = vi.spyOn(replacement._domContainer, 'destroy');
    const replacedDestroy = vi.spyOn(replaced._domContainer, 'destroy');

    root.appendChild(otherParent);
    otherParent.appendChild(replacement);
    root.appendChild(replaced);
    root.replaceChild(replacement, replaced);

    expect(replacementDestroy).not.toHaveBeenCalled();
    expect(replacedDestroy).toHaveBeenCalledTimes(1);
    expect(otherParent._children).toEqual([]);
    expect(root._children).toEqual([otherParent, replacement]);
    expect(replacement.parentNode).toBe(root);
    expect(replaced.parentNode).toBeNull();
    expect(replaced._root).toBeNull();
  });

  it('destroys a permanently removed input exactly once', () => {
    const root = createRoot();
    const input = new PInput();
    const destroy = vi.spyOn(input._domContainer, 'destroy');

    root.appendChild(input);
    root.removeChild(input);
    root.removeChild(input);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(root._children).toEqual([]);
    expect(root._layoutNode.getChildCount()).toBe(0);
    expect(input.parentNode).toBeNull();
    expect(input._root).toBeNull();
  });
});

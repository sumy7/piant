import { Container } from 'pixi.js';
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
      const target = order.map((index) => inputs[index]);
      reconcileArrays(root, [...inputs], target);
      expect(
        root._children.map((input) => inputs.indexOf(input as PInput)),
      ).toEqual(order);
      for (const input of inputs)
        expect(input._domContainer.destroyed).toBe(false);
      root.removeAllChildren();
      root.destroy();
    }
  });

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

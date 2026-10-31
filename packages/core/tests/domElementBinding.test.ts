import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachDOMElement } from '../src/elements/attachDOMElement';
import { PInput } from '../src/elements/PInput';
import { PRoot } from '../src/elements/PRoot';
import { PView } from '../src/elements/PView';
import { root } from '../src/reactivity/effects';

const roots: PRoot[] = [];
const nodes: PView[] = [];
function createRoot(width = 200) {
  const root = new PRoot(new Container(), { width, height: 200 });
  roots.push(root);
  return root;
}
function createNode() {
  const node = new PView();
  nodes.push(node);
  return node;
}
afterEach(() => {
  for (const root of roots.splice(0)) root.destroy();
  for (const node of nodes.splice(0)) node.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('attachDOMElement', () => {
  it('uses a zero-size Pixi host while sizing the real element from Yoga', () => {
    const root = createRoot();
    const node = createNode();
    const element = document.createElement('button');
    element.style.pointerEvents = 'none';
    const binding = attachDOMElement(node, element);
    expect(binding.visible).toBe(false);
    expect(binding.hostElement.hidden).toBe(true);
    expect(binding.container.element).toBe(binding.hostElement);
    expect(binding.hostElement.firstChild).toBe(element);
    expect(binding.container.parent).toBe(node._view);
    node.setStyle({ width: 120, height: 36, marginLeft: 20 });
    root.appendChild(node);
    root.doLayout();
    expect(binding.visible).toBe(true);
    expect(binding.hostElement.hidden).toBe(false);
    expect(binding.hostElement.style.width).toBe('0px');
    expect(binding.hostElement.style.height).toBe('0px');
    expect(binding.hostElement.style.transform).toBe('');
    expect(element.style.position).toBe('absolute');
    expect(element.style.left).toBe('0px');
    expect(element.style.top).toBe('0px');
    expect(element.style.width).toBe('120px');
    expect(element.style.height).toBe('36px');
    expect(element.style.pointerEvents).toBe('none');
  });

  it('tracks initially hidden and hidden ancestors even when children skip applyLayout', () => {
    const root = createRoot();
    const parent = createNode();
    const child = createNode();
    root.setStyle({ display: 'none' });
    parent.appendChild(child);
    root.appendChild(parent);
    child.setStyle({ width: 100, height: 40 });
    const element = document.createElement('button');
    const binding = attachDOMElement(child, element);
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(true);
    root.setStyle({ display: 'flex' });
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(false);
    parent.setStyle({ display: 'none' });
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(true);
    parent.setStyle({ display: 'flex', opacity: 0 });
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(true);
    parent.setStyle({ opacity: 1 });
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(false);
    parent._view.renderable = false;
    root.markDirty();
    root.doLayout();
    expect(binding.hostElement.hidden).toBe(true);
    parent._view.renderable = true;
    parent._view.visible = false;
    binding.sync();
    expect(binding.hostElement.hidden).toBe(true);
  });

  it('leaves element.hidden to its caller instead of overwriting semantic state', () => {
    const root = createRoot();
    const node = createNode();
    const element = document.createElement('button');
    element.hidden = true;
    const binding = attachDOMElement(node, element);
    root.appendChild(node);
    root.doLayout();
    expect(binding.visible).toBe(true);
    expect(binding.hostElement.hidden).toBe(false);
    expect(element.hidden).toBe(true);
    node.setStyle({ display: 'none' });
    root.doLayout();
    element.hidden = false;
    binding.sync();
    expect(binding.hostElement.hidden).toBe(true);
    expect(element.hidden).toBe(false);
  });

  it('follows new roots and does not hide a retained focused input during reconciliation', async () => {
    const first = createRoot(200);
    const second = createRoot(300);
    const input = new PInput();
    input.setStyle({ width: '100%', height: 36 });
    first.appendChild(input);
    first.doLayout();
    const element = input.element;
    const binding = input.domElement;
    document.body.append(binding.hostElement);
    element.value = 'retained input';
    element.focus();
    element.setSelectionRange(1, 4);
    const visible: boolean[] = [];
    const stop = input.observeLayout(() => visible.push(binding.visible));
    await Promise.resolve();
    second.appendChild(input);
    expect(binding.hostElement.hidden).toBe(false);
    const before = visible.length;
    first.doLayout();
    expect(visible).toHaveLength(before);
    second.doLayout();
    await Promise.resolve();
    expect(element.style.width).toBe('300px');
    expect(binding.hostElement.hidden).toBe(false);
    expect(visible.every(Boolean)).toBe(true);
    expect(input.element).toBe(element);
    expect(input._inputElement).toBe(element);
    expect(input._domContainer).toBe(binding.container);
    expect(document.activeElement).toBe(element);
    expect([element.selectionStart, element.selectionEnd]).toEqual([1, 4]);
    first.destroy();
    expect(binding.visible).toBe(true);
    stop();
    input.destroy();
  });

  it('restores only geometry and removes its own binding when the owner is disposed', () => {
    const rootNode = createRoot();
    const node = createNode();
    rootNode.appendChild(node);
    node.setStyle({ width: 80, height: 30 });
    const element = document.createElement('button');
    element.style.cssText =
      'position:relative;left:2px;top:3px;width:7px;height:9px;color:red;pointer-events:none';
    const listener = vi.fn();
    element.addEventListener('click', listener);
    let binding!: ReturnType<typeof attachDOMElement<HTMLButtonElement>>;
    const dispose = root((dispose) => {
      binding = attachDOMElement(node, element);
      return dispose;
    });
    const other = attachDOMElement(node, document.createElement('button'));
    rootNode.doLayout();
    const external = vi.fn();
    node._view.on('sizeChange', external);
    const destroy = vi.spyOn(binding.container, 'destroy');
    dispose();
    dispose();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(binding.visible).toBe(false);
    expect(binding.container.parent).toBeNull();
    expect(element.parentElement).toBeNull();
    expect(element.style.position).toBe('relative');
    expect(element.style.left).toBe('2px');
    expect(element.style.width).toBe('7px');
    expect(element.style.color).toBe('red');
    expect(element.style.pointerEvents).toBe('none');
    expect(other.container.parent).toBe(node._view);
    element.click();
    expect(listener).toHaveBeenCalledTimes(1);
    node.setStyle({ width: 90 });
    rootNode.doLayout();
    expect(external).toHaveBeenCalledTimes(1);
    expect(element.style.width).toBe('7px');
    binding.sync();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('cleans up on node or container destruction and never resurrects a disposed Input', async () => {
    const rootNode = createRoot();
    let input!: PInput;
    const dispose = root((dispose) => {
      input = new PInput();
      return dispose;
    });
    rootNode.appendChild(input);
    rootNode.doLayout();
    const binding = input.domElement;
    const destroy = vi.spyOn(binding.container, 'destroy');
    binding.container.destroy();
    expect(binding.visible).toBe(false);
    expect(input._view.listenerCount('sizeChange')).toBe(0);
    input.applyInputElement();
    input.setStyle({ width: 120 });
    rootNode.doLayout();
    expect(binding.container.parent).toBeNull();
    input.destroy();
    dispose();
    await Promise.resolve();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(() => binding.sync()).not.toThrow();
    expect(binding.hostElement.hidden).toBe(true);
  });
});

describe('PNode layout observation', () => {
  it('queues initial/size changes, observes completed root layouts, and unregisters independently', async () => {
    const root = createRoot();
    const node = createNode();
    root.appendChild(node);
    const listener = vi.fn();
    const external = vi.fn();
    node._view.on('sizeChange', external);
    const stop = node.observeLayout(listener);
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    node.setStyle({ width: 70, height: 30 });
    root.doLayout();
    expect(listener).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
    node._view.emit('sizeChange', { width: 70, height: 30 });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    node.setStyle({ width: 90 });
    root.doLayout();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(external).toHaveBeenCalledTimes(3);
  });

  it('ignores queued work and new registrations after node destruction', async () => {
    const node = createNode();
    const listener = vi.fn();
    node.observeLayout(listener);
    node.destroy();
    node.observeLayout(listener)();
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    expect(node.isVisible).toBe(false);
  });

  it('reports detached visibility only after a reconciliation turn has settled', async () => {
    const root = createRoot();
    const node = createNode();
    root.appendChild(node);
    root.doLayout();
    const values: boolean[] = [];
    node.observeLayout(() => values.push(node.isVisible));
    await Promise.resolve();
    node.detach();
    root.appendChild(node);
    await Promise.resolve();
    expect(values).toEqual([true, true]);
    node.detach();
    await Promise.resolve();
    expect(values.at(-1)).toBe(false);
  });
});

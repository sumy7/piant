import 'pixi.js/events';
import { createState, onError, type PNode, PRoot, render } from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
} from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Tree,
  type TreeHandle,
  type TreeNode,
  type TreeProps,
  UIProvider,
} from '../dist/index.js';

const cleanups: (() => void)[] = [];
beforeEach(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        font: '14px Arial',
        setTransform() {},
        clearRect() {},
        fillText() {},
        fillRect() {},
        measureText(text: string) {
          return {
            width: text.length * 7,
            actualBoundingBoxAscent: 11,
            actualBoundingBoxDescent: 3,
          };
        },
      }) as never,
  );
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const nodes: readonly TreeNode[] = [
  {
    value: 'a',
    label: 'Alpha',
    children: [
      { value: 'a1', label: 'Apple' },
      {
        value: 'a2',
        label: 'Apricot',
        children: [{ value: 'leaf', label: 'Lemon' }],
      },
    ],
  },
  {
    value: 'b',
    label: 'Beta',
    disabled: true,
    children: [{ value: 'b1', label: 'B child' }],
  },
  { value: 'c', label: 'Charlie' },
];
function fixture(props: Partial<TreeProps> = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  let api!: TreeHandle;
  const errors = vi.fn();
  const forwarded = Object.defineProperties(
    {
      label: 'Hierarchy',
      nodes,
      rowHeight: 32,
      style: { width: 320, height: 160 },
    },
    Object.getOwnPropertyDescriptors(props),
  ) as TreeProps;
  const ref = props.apiRef;
  forwarded.apiRef = (current) => {
    api = current;
    ref?.(current);
  };
  const dispose = render(
    () =>
      UIProvider({
        children: () => {
          onError(errors);
          return Tree(forwarded);
        },
      }),
    host,
  );
  function settle() {
    function attach(node: PNode) {
      for (const view of node._view.children)
        if (view instanceof DOMContainer && !dom.contains(view.element))
          dom.append(view.element);
      for (const child of node._children) attach(child);
    }
    for (let round = 0; round < 5; round++) {
      attach(host);
      host.doLayout();
    }
  }
  settle();
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  expect(errors.mock.calls, 'Tree construction errors').toEqual([]);
  const active = () => api.element.getAttribute('aria-activedescendant');
  const activeKey = () =>
    Array.from(dom.querySelectorAll('[role=treeitem]'))
      .find((el) => el.id === active())
      ?.getAttribute('aria-label');
  const key = (key: string, options: KeyboardEventInit = {}) => {
    api.focus();
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    api.element.dispatchEvent(event);
    settle();
    return event;
  };
  return { api, host, dom, errors, settle, dispose, active, activeKey, key };
}

describe('Tree public behavior', () => {
  it('exposes tree hierarchy metadata and one focus target with selection separate from active navigation', () => {
    const changed = vi.fn();
    const scene = fixture({
      defaultExpandedValues: ['a', 'a2'],
      onValueChange: changed,
    });
    expect(scene.api.element.getAttribute('role')).toBe('tree');
    expect(scene.dom.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(scene.api.getItemElement('a')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(scene.api.getItemElement('a1')?.getAttribute('aria-level')).toBe(
      '2',
    );
    expect(scene.api.getItemElement('a2')?.getAttribute('aria-posinset')).toBe(
      '2',
    );
    expect(scene.api.getItemElement('a2')?.getAttribute('aria-setsize')).toBe(
      '2',
    );
    expect(scene.api.getItemElement('a1')?.hasAttribute('aria-expanded')).toBe(
      false,
    );
    scene.key('ArrowDown');
    expect(scene.activeKey()).toBe('Apple');
    expect(changed).not.toHaveBeenCalled();
    scene.key('Enter');
    expect(changed).toHaveBeenCalledWith('a1');
    expect(scene.api.getItemElement('a1')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    scene.key('ArrowDown');
    expect(scene.api.getItemElement('a1')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(document.activeElement).toBe(scene.api.element);
  });

  it('expands, visits children, collapses and returns to parent with Left/Right', () => {
    const expanded = vi.fn();
    const scene = fixture({ onExpandedValuesChange: expanded });
    expect(scene.activeKey()).toBe('Alpha');
    scene.key('ArrowRight');
    expect(expanded).toHaveBeenLastCalledWith(['a']);
    expect(scene.activeKey()).toBe('Alpha');
    scene.key('ArrowRight');
    expect(scene.activeKey()).toBe('Apple');
    scene.key('ArrowLeft');
    expect(scene.activeKey()).toBe('Alpha');
    scene.key('ArrowLeft');
    expect(scene.api.getItemElement('a1')).toBeUndefined();
    expect(expanded).toHaveBeenLastCalledWith([]);
    scene.key('ArrowLeft');
    expect(scene.activeKey()).toBe('Alpha');
  });

  it('keeps controlled expansion and selection authoritative with current getter callbacks', () => {
    const [expanded, setExpanded] = createState<readonly string[]>([]);
    const [selected, setSelected] = createState<string | null>(null);
    const [accept, setAccept] = createState(false);
    const rejectExpand = vi.fn();
    const rejectSelect = vi.fn();
    const scene = fixture({
      get expandedValues() {
        return expanded();
      },
      get value() {
        return selected();
      },
      get onExpandedValuesChange() {
        return accept() ? setExpanded : rejectExpand;
      },
      get onValueChange() {
        return accept() ? setSelected : rejectSelect;
      },
    });
    scene.key('ArrowRight');
    expect(rejectExpand).toHaveBeenCalledWith(['a']);
    expect(scene.api.getItemElement('a1')).toBeUndefined();
    scene.key('Enter');
    expect(rejectSelect).toHaveBeenCalledWith('a');
    expect(scene.api.getItemElement('a')?.getAttribute('aria-selected')).toBe(
      'false',
    );
    setAccept(true);
    scene.key('ArrowRight');
    scene.key('ArrowRight');
    scene.key(' ');
    expect(selected()).toBe('a1');
    expect(expanded()).toEqual(['a']);
  });

  it('navigates disabled rows without selecting or expanding them and leaves modifiers and IME alone', () => {
    const changed = vi.fn();
    const expanded = vi.fn();
    const scene = fixture({
      onValueChange: changed,
      onExpandedValuesChange: expanded,
    });
    scene.key('ArrowDown');
    expect(scene.activeKey()).toBe('Beta');
    expect(scene.api.getItemElement('b')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    scene.key('Enter');
    scene.key(' ');
    scene.key('ArrowRight');
    expect(changed).not.toHaveBeenCalled();
    expect(expanded).not.toHaveBeenCalled();
    for (const option of [
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { isComposing: true },
      { keyCode: 229 },
    ])
      expect(scene.key('End', option).defaultPrevented).toBe(false);
    expect(scene.key('Tab').defaultPrevented).toBe(false);
    expect(scene.activeKey()).toBe('Beta');
    scene.key('ArrowDown');
    expect(scene.activeKey()).toBe('Charlie');
  });

  it('reconciles collapsed and removed active rows, retaining caller selected/expanded keys', () => {
    const [items, setItems] = createState(nodes);
    const [expanded, setExpanded] = createState<readonly string[]>(['a', 'a2']);
    const scene = fixture({
      get nodes() {
        return items();
      },
      get expandedValues() {
        return expanded();
      },
      defaultValue: 'leaf',
    });
    expect(scene.activeKey()).toBe('Lemon');
    setExpanded(['a']);
    scene.settle();
    expect(scene.activeKey()).toBe('Apricot');
    setExpanded([]);
    scene.settle();
    expect(scene.activeKey()).toBe('Alpha');
    setItems(nodes.slice(1));
    scene.settle();
    expect(scene.activeKey()).toBe('Beta');
    setItems(nodes);
    setExpanded(['a', 'a2']);
    scene.settle();
    expect(
      scene.api.getItemElement('leaf')?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(scene.activeKey()).toBe('Beta');
  });

  it('retains keyed rows and active state on reorder and clears a live viewport safely', () => {
    const [items, setItems] = createState(nodes);
    const changed = vi.fn();
    const expanded = vi.fn();
    const scene = fixture({
      get nodes() {
        return items();
      },
      defaultExpandedValues: ['a'],
      defaultValue: 'a1',
      onValueChange: changed,
      onExpandedValuesChange: expanded,
    });
    const retained = scene.api.getItemNode('a1');
    setItems([nodes[2]!, nodes[0]!, nodes[1]!]);
    scene.settle();
    expect(scene.activeKey()).toBe('Apple');
    expect(scene.api.getItemNode('a1')).toBe(retained);
    expect(scene.api.getItemElement('a')?.getAttribute('aria-posinset')).toBe(
      '2',
    );
    setItems([]);
    scene.settle();
    expect(scene.dom.querySelectorAll('[role=treeitem]')).toHaveLength(0);
    expect(scene.active()).toBeNull();
    expect(scene.key('ArrowDown').defaultPrevented).toBe(false);
    setItems(nodes);
    scene.settle();
    expect(scene.api.getItemElement('a1')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(scene.api.getItemElement('a')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(changed).not.toHaveBeenCalled();
    expect(expanded).not.toHaveBeenCalled();
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('uses timestamp-based typeahead without changing selection', () => {
    const changed = vi.fn();
    const scene = fixture({
      defaultExpandedValues: ['a'],
      onValueChange: changed,
    });
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    scene.key('a');
    expect(scene.activeKey()).toBe('Apple');
    scene.key('a');
    expect(scene.activeKey()).toBe('Apricot');
    now.mockReturnValue(2000);
    scene.key('c');
    expect(scene.activeKey()).toBe('Charlie');
    expect(changed).not.toHaveBeenCalled();
  });

  it('virtualizes 10000 rows, reveals keyboard targets and preserves viewport focus after offscreen scroll', () => {
    const big = Array.from({ length: 10000 }, (_, i) => ({
      value: String(i),
      label: `Node ${i}`,
    }));
    const scene = fixture({ nodes: big, overscan: 1 });
    expect(scene.api.range().total).toBe(10000);
    expect(scene.dom.querySelectorAll('[role=treeitem]').length).toBeLessThan(
      12,
    );
    scene.api.focus();
    scene.api.scrollToKey('9000', 'start');
    scene.settle();
    expect(document.activeElement).toBe(scene.api.element);
    expect(scene.active()).toBeNull();
    scene.key('ArrowDown');
    expect(scene.activeKey()).toBe('Node 1');
    scene.key('End');
    expect(scene.activeKey()).toBe('Node 9999');
    scene.key('PageUp');
    expect(scene.activeKey()).toBe('Node 9994');
    scene.key('Home');
    scene.key('PageDown');
    expect(scene.activeKey()).toBe('Node 5');
    expect(scene.dom.querySelectorAll('[role=treeitem]').length).toBeLessThan(
      12,
    );
  });

  it('supports row clicks and a separate pointer disclosure without extra focus stops', () => {
    const changed = vi.fn();
    const scene = fixture({ onValueChange: changed });
    scene.api.getItemElement('c')?.click();
    scene.settle();
    expect(changed).toHaveBeenCalledWith('c');
    const row = scene.api.getItemNode('a')!;
    // Collection row -> Tree row contents -> disclosure.
    const disclosure = row._children[0]._children[0];
    const event = new FederatedPointerEvent(new EventBoundary());
    Object.assign(event, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    });
    disclosure._view.emit('pointerdown', event);
    disclosure._view.emit('pointerup', event);
    scene.settle();
    expect(scene.api.getItemElement('a1')).toBeDefined();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(scene.api.element);
  });

  it('isolates two instances and releases owner/node resources before later updates', () => {
    const [items, setItems] = createState(nodes);
    const changed = vi.fn();
    const first = fixture({
      get nodes() {
        return items();
      },
      onValueChange: changed,
    });
    const second = fixture();
    first.key('ArrowRight');
    expect(first.api.getItemElement('a1')).toBeDefined();
    expect(second.api.getItemElement('a1')).toBeUndefined();
    first.api.node.destroyRecursive();
    first.settle();
    expect(first.dom.querySelector('[role=tree]')).toBeNull();
    const count = changed.mock.calls.length;
    setItems([]);
    first.settle();
    expect(first.api.focus()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(count);
    expect(first.errors).not.toHaveBeenCalled();
    second.dispose();
    second.settle();
    expect(second.dom.querySelector('[role=tree]')).toBeNull();
  });

  it.each(['selection', 'expansion'] as const)(
    'survives synchronous consumer destruction from %s without stale callbacks',
    (action) => {
      let api!: TreeHandle;
      const destroy = vi.fn(() => api.node.destroyRecursive());
      const scene = fixture({
        apiRef(current) {
          api = current;
        },
        onValueChange: action === 'selection' ? destroy : undefined,
        onExpandedValuesChange: action === 'expansion' ? destroy : undefined,
      });
      const staleRow = scene.api.getItemElement('a')!;
      const staleRoot = scene.api.element;
      expect(() =>
        scene.key(action === 'selection' ? 'Enter' : 'ArrowRight'),
      ).not.toThrow();
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(staleRoot.isConnected).toBe(false);
      staleRow.click();
      staleRoot.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );
      scene.settle();
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(scene.errors).not.toHaveBeenCalled();
      expect(scene.api.focus()).toBe(false);
    },
  );

  it('repeatedly expands and collapses without retained children or stale active descendants', () => {
    const selected = vi.fn();
    const expanded = vi.fn();
    const scene = fixture({
      onValueChange: selected,
      onExpandedValuesChange: expanded,
    });
    let stale: HTMLElement | undefined;
    for (let turn = 0; turn < 12; turn++) {
      scene.key('ArrowRight');
      scene.key('ArrowRight');
      const child = scene.api.getItemElement('a1')!;
      expect(child.isConnected).toBe(true);
      expect(child).not.toBe(stale);
      scene.key('Enter');
      child.click(); // A repeated request for the same selection is a no-op.
      scene.settle();
      scene.key('ArrowLeft');
      scene.key('ArrowLeft');
      expect(child.isConnected).toBe(false);
      child.click();
      expect(scene.activeKey()).toBe('Alpha');
      expect(scene.api.getItemElement('a1')).toBeUndefined();
      expect(scene.dom.querySelectorAll('[role=treeitem]')).toHaveLength(3);
      stale = child;
    }
    expect(selected).toHaveBeenCalledExactlyOnceWith('a1');
    expect(expanded).toHaveBeenCalledTimes(24);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('retains defaults only once and disables the root without erasing tree semantics', () => {
    const [disabled, setDisabled] = createState(false);
    const [defaults, setDefaults] = createState<readonly string[]>(['a']);
    const scene = fixture({
      get defaultExpandedValues() {
        return defaults();
      },
      get disabled() {
        return disabled();
      },
    });
    setDefaults([]);
    scene.settle();
    expect(scene.api.getItemElement('a1')).toBeDefined();
    setDisabled(true);
    scene.settle();
    expect(scene.api.element.getAttribute('aria-disabled')).toBe('true');
    expect(scene.api.element.tabIndex).toBe(-1);
    expect(scene.api.focus()).toBe(false);
    scene.api.getItemElement('c')?.click();
    scene.settle();
    expect(scene.api.getItemElement('c')?.getAttribute('aria-selected')).toBe(
      'false',
    );
  });
});

import type { PNode } from '@piant/core';
import { type Application, type Container, Graphics } from 'pixi.js';

type PickerOptions = {
  canvas: HTMLCanvasElement;
  app: Pick<Application, 'stage' | 'screen'>;
  getNodes: () => Iterable<PNode>;
  onHover: (node: PNode | null) => void;
  onPick: (node: PNode) => void;
  onCancel: () => void;
};

/** Inspect layout boxes without changing Pixi event modes or dispatching application events. */
export function createPicker(options: PickerOptions) {
  const { canvas, app } = options;
  const doc = canvas.ownerDocument;
  let active = false;
  let removed = false;
  let pressed = false;
  let listening = false;
  let previousCursor = '';
  let tailTimer: ReturnType<typeof setTimeout> | undefined;
  const events = [
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'click',
    'dblclick',
    'contextmenu',
  ];

  function hit(event: MouseEvent): PNode | null {
    const rect = canvas.getBoundingClientRect();
    if (
      !canvas.isConnected ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      event.clientX < rect.left ||
      event.clientX >= rect.right ||
      event.clientY < rect.top ||
      event.clientY >= rect.bottom
    )
      return null;
    const point = {
      x:
        ((event.clientX - rect.left) * app.screen.width) / rect.width +
        app.screen.x,
      y:
        ((event.clientY - rect.top) * app.screen.height) / rect.height +
        app.screen.y,
    };
    type Branch = {
      view: Container;
      children: Branch[];
      valid: boolean;
      node?: PNode;
    };
    const branches = new Map<Container, Branch>();
    let root: PNode['_root'] | undefined;
    for (const node of options.getNodes()) {
      root ??= node._root;
      if (!root || root.isDestroyed || node._root !== root) continue;
      const pending: Container[] = [];
      const visited = new Set<Container>();
      let view: Container | null = node._view;
      while (view && !branches.has(view) && !visited.has(view)) {
        visited.add(view);
        pending.push(view);
        if (view === app.stage) break;
        view = view.parent;
      }
      while (pending.length) {
        const current = pending.pop()!;
        const parent =
          current === app.stage ? undefined : branches.get(current.parent!);
        const mask = current.mask;
        const valid =
          (current === app.stage || parent?.valid === true) &&
          !current.destroyed &&
          current.visible &&
          current.renderable &&
          current.alpha > 0 &&
          // Graphics.containsPoint is local geometry, including rounded Piant overflow masks.
          (!(mask instanceof Graphics) ||
            mask.containsPoint(mask.toLocal(point)));
        const branch: Branch = { view: current, children: [], valid };
        branches.set(current, branch);
        parent?.children.push(branch);
      }
      const branch = branches.get(node._view);
      if (branch) branch.node = node;
    }
    for (const branch of branches.values()) {
      if (branch.children.length < 2) continue;
      const order = new Map(
        branch.view.children.map((child, index) => [child, index]),
      );
      branch.children.sort((a, b) => {
        // Only pending sorts use zIndex: setChildIndex can change an already sorted list.
        if (
          branch.view.sortableChildren &&
          branch.view.sortDirty &&
          a.view.zIndex !== b.view.zIndex
        )
          return a.view.zIndex - b.view.zIndex;
        return order.get(a.view)! - order.get(b.view)!;
      });
    }
    const stage = branches.get(app.stage);
    const pending: { branch: Branch; descendantsVisited: boolean }[] = stage
      ? [{ branch: stage, descendantsVisited: false }]
      : [];
    while (pending.length) {
      const { branch, descendantsVisited } = pending.pop()!;
      if (!branch.valid) continue;
      if (!descendantsVisited) {
        pending.push({ branch, descendantsVisited: true });
        // Stack reversal visits the last drawn descendant before its parent.
        for (const child of branch.children)
          pending.push({ branch: child, descendantsVisited: false });
        continue;
      }
      const node = branch.node;
      if (!node) continue;
      const width = node._layoutNode.getComputedWidth();
      const height = node._layoutNode.getComputedHeight();
      if (!(width > 0 && height > 0)) continue;
      const local = node._view.toLocal(point);
      if (local.x >= 0 && local.y >= 0 && local.x < width && local.y < height)
        return node;
    }
    return null;
  }

  function unlisten() {
    if (tailTimer !== undefined) clearTimeout(tailTimer);
    tailTimer = undefined;
    pressed = false;
    if (!listening) return;
    listening = false;
    for (const type of events) doc.removeEventListener(type, capture, true);
    doc.removeEventListener('keydown', keydown, true);
    canvas.removeEventListener('pointerleave', leave);
  }

  function stop() {
    if (active) {
      active = false;
      if (canvas.style.cursor === 'crosshair')
        canvas.style.cursor = previousCursor;
      options.onHover(null);
    }
    // Cancelling between down and click must not deliver the trailing click to Pixi.
    // Keep the guard while physically held; start a fallback only after release.
    if (!pressed) unlisten();
  }

  function capture(event: Event) {
    const onCanvas = event.composedPath().includes(canvas);
    if (!active && event.type === 'pointerdown') {
      unlisten();
      return;
    }
    if (!onCanvas) {
      if (
        event.type === 'pointerup' ||
        event.type === 'mouseup' ||
        event.type === 'pointercancel'
      ) {
        pressed = false;
        if (!active) unlisten();
      }
      return;
    }
    const mouse = event as MouseEvent;
    if (
      mouse.button !== 0 &&
      event.type !== 'pointermove' &&
      event.type !== 'pointercancel'
    )
      return;
    // Modern browsers also construct click as PointerEvent with isPrimary=false.
    if (
      event.type.startsWith('pointer') &&
      'isPrimary' in event &&
      event.isPrimary === false
    )
      return;
    if (!active && !pressed) return;
    if (event.type === 'pointermove') {
      if (active) {
        event.preventDefault();
        event.stopImmediatePropagation();
        options.onHover(hit(mouse));
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type === 'pointerdown' || event.type === 'mousedown')
      pressed = true;
    if (event.type === 'click') {
      const node = active ? hit(mouse) : null;
      pressed = false;
      if (node) options.onPick(node);
      if (!active) unlisten();
    } else if (
      !active &&
      (event.type === 'pointerup' || event.type === 'mouseup')
    ) {
      if (tailTimer === undefined) tailTimer = setTimeout(unlisten, 750);
    } else if (event.type === 'pointercancel') {
      pressed = false;
      if (!active) unlisten();
    }
  }

  function keydown(event: KeyboardEvent) {
    if (!active || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    options.onCancel();
    stop();
  }
  function leave() {
    if (active) options.onHover(null);
  }

  return {
    start() {
      if (removed || active) return;
      unlisten();
      active = true;
      previousCursor = canvas.style.cursor;
      canvas.style.cursor = 'crosshair';
      listening = true;
      for (const type of events)
        doc.addEventListener(type, capture, { capture: true, passive: false });
      doc.addEventListener('keydown', keydown, true);
      canvas.addEventListener('pointerleave', leave);
    },
    stop,
    remove() {
      if (removed) return;
      stop();
      unlisten();
      removed = true;
    },
  };
}

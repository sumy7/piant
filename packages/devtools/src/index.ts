import type { PNode } from '@piant/core';
import { type Container, UPDATE_PRIORITY } from 'pixi.js';
import { createPanel } from './panel';
import { createPicker } from './picker';
import { readonlySnapshot } from './snapshot';
import type {
  AnimationInspection,
  DevtoolsOptions,
  DevtoolsSession,
  DevtoolsSnapshot,
  ElementInspection,
} from './types';

export type { SnapshotValue } from './snapshot';
export { readonlySnapshot } from './snapshot';
export type {
  AnimationInspection,
  DevtoolsOptions,
  DevtoolsSession,
  DevtoolsSnapshot,
  ElementInspection,
} from './types';

const sessions = new WeakMap<Document, DevtoolsSession>();
const bound = (
  value: number | undefined,
  fallback: number,
  max: number,
  min = 1,
) =>
  Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.floor(value!)))
    : fallback;

/** Attach one page-embedded Piant inspector per document. Import inside a development-only branch. */
export function attachDevtools(
  options: DevtoolsOptions,
): DevtoolsSession | null {
  if (options.enabled !== true) return null;
  const { root, app } = options;
  if (root.isDestroyed || root._view.destroyed || app.stage.destroyed)
    return null;
  const mount = options.mount ?? document.body;
  sessions.get(mount.ownerDocument)?.detach();
  const interval = bound(options.sampleInterval, 100, 60000, 16);
  const maxEntries = bound(options.maxEntries, 120, 1000);
  const maxNodes = bound(options.maxNodes, 2000, 10000);
  const stage = app.stage;
  const ticker = app.ticker;
  const canvas = app.canvas;
  const doc = mount.ownerDocument;
  const overlay = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.dataset.piantHighlight = '';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99997;overflow:hidden;';
  const polygon = doc.createElementNS(overlay.namespaceURI, 'polygon');
  polygon.setAttribute('fill', '#38bdf833');
  polygon.setAttribute('stroke', '#38bdf8');
  polygon.setAttribute('stroke-width', '2');
  overlay.appendChild(polygon);
  doc.body.appendChild(overlay);
  let detached = false;
  let active = false;
  let dirty = true;
  let selected: PNode | null = null;
  let picking = false;
  let hovered: PNode | null = null;
  let elapsed = interval;
  let elements: readonly ElementInspection[] = [];
  const nodes = new Map<number, PNode>();
  let truncated = false;
  const timeline: { time: number; duration: number }[] = [];
  const stats = {
    frames: 0,
    frameInterval: 0,
    maxFrameInterval: 0,
    layoutUpdates: 0,
    layoutDuration: 0,
  };
  const animations = new Map<
    string,
    {
      inspection: AnimationInspection;
      observedFrames: number;
      observedElapsed: number;
    }
  >();
  let current: DevtoolsSnapshot;

  function belongs(node: PNode): boolean {
    return node._root === root && !node._view.destroyed;
  }

  function isVisible(view: Container | null): boolean {
    while (view) {
      if (!view.visible || !view.renderable) return false;
      view = view.parent;
    }
    return true;
  }

  function highlight() {
    if (!active) {
      overlay.style.display = 'none';
      return;
    }
    if (selected && !belongs(selected)) {
      selected = null;
      dirty = true;
    }
    const target = picking ? hovered : selected;
    if (!target || !belongs(target)) {
      overlay.style.display = 'none';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    if (
      !canvas.isConnected ||
      !isVisible(target._view) ||
      !rect.width ||
      !rect.height
    ) {
      overlay.style.display = 'none';
      return;
    }
    const width = target._layoutNode.getComputedWidth();
    const height = target._layoutNode.getComputedHeight();
    const points = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ].map(([x, y]) => {
      const point = target._view.toGlobal({ x, y });
      return `${rect.left + (point.x * rect.width) / app.screen.width},${rect.top + (point.y * rect.height) / app.screen.height}`;
    });
    polygon.setAttribute('points', points.join(' '));
    overlay.style.display = '';
  }

  function readTree() {
    nodes.clear();
    const tree: ElementInspection[] = [];
    const pending = [
      { node: root as PNode, depth: 0, parentId: null as number | null },
    ];
    while (pending.length && tree.length < maxNodes) {
      const { node, depth, parentId } = pending.pop()!;
      nodes.set(node._id, node);
      tree.push(
        Object.freeze({
          id: node._id,
          parentId,
          depth,
          name: node.displayName,
        }),
      );
      // Bound pending storage as well as visited nodes, even for very wide trees.
      const count = Math.min(
        node._children.length,
        maxNodes - tree.length - pending.length,
      );
      if (count < node._children.length) truncated = true;
      for (let i = count - 1; i >= 0; i--)
        pending.push({
          node: node._children[i],
          depth: depth + 1,
          parentId: node._id,
        });
    }
    if (pending.length) truncated = true;
    elements = Object.freeze(tree);
  }

  function readAnimations() {
    const retained = new Set<string>();
    let error: string | undefined;
    try {
      for (const entry of (options.animations?.() ?? []).slice(0, maxEntries)) {
        if (!belongs(entry.node)) continue;
        retained.add(entry.id);
        const previous = animations.get(entry.id);
        if (previous?.inspection.animation !== entry.animation) {
          animations.set(entry.id, {
            inspection: entry,
            observedFrames: 0,
            observedElapsed: 0,
          });
        } else {
          previous.inspection = entry;
        }
      }
    } catch {
      error = '[Animation source failed]';
    }
    for (const id of animations.keys())
      if (!retained.has(id)) animations.delete(id);
    return (
      error ??
      [...animations].map(([id, record]) => {
        try {
          return {
            id,
            nodeId: record.inspection.node._id,
            playState: record.inspection.animation.playState,
            currentTime: record.inspection.animation.currentTime,
            observedFrames: record.observedFrames,
            observedElapsed: record.observedElapsed,
          };
        } catch {
          return { id, error: '[Animation unavailable]' };
        }
      })
    );
  }

  function refresh() {
    if (detached) return;
    if (dirty) {
      truncated = false;
      readTree();
      dirty = false;
    }
    if (selected && (!belongs(selected) || !nodes.has(selected._id)))
      selected = null;
    let state: unknown;
    try {
      state = options.getState?.();
    } catch {
      state = '[State source failed]';
    }
    current = Object.freeze({
      elements,
      truncated,
      selectedId: selected?._id ?? null,
      selection: readonlySnapshot(
        selected
          ? {
              id: selected._id,
              name: selected.displayName,
              style: selected._layoutStyle,
              layout: {
                left: selected._layoutNode.getComputedLeft(),
                top: selected._layoutNode.getComputedTop(),
                width: selected._layoutNode.getComputedWidth(),
                height: selected._layoutNode.getComputedHeight(),
              },
              transform: {
                x: selected._view.x,
                y: selected._view.y,
                scaleX: selected._view.scale.x,
                scaleY: selected._view.scale.y,
                rotation: selected._view.rotation,
                alpha: selected._view.alpha,
              },
            }
          : null,
      ),
      state: readonlySnapshot(state),
      animations: readonlySnapshot(readAnimations()),
      stats: Object.freeze({ ...stats }),
      timeline: Object.freeze(
        timeline.map((event) => Object.freeze({ ...event })),
      ),
    });
    highlight();
    panel.render(current);
  }

  function select(id: number | null) {
    if (detached) return;
    selected = id === null ? null : (nodes.get(id) ?? null);
    refresh();
  }

  function tick() {
    if (detached || !active) return;
    const delta = Number.isFinite(ticker.elapsedMS)
      ? Math.max(0, ticker.elapsedMS)
      : 0;
    stats.frames++;
    stats.frameInterval = delta;
    stats.maxFrameInterval = Math.max(stats.maxFrameInterval, delta);
    for (const [id, record] of animations) {
      if (!belongs(record.inspection.node)) {
        animations.delete(id);
        continue;
      }
      try {
        if (record.inspection.animation.playState === 'running') {
          record.observedFrames++;
          record.observedElapsed += delta;
        }
      } catch {
        animations.delete(id);
      }
    }
    highlight();
    elapsed += delta;
    if (elapsed >= interval) {
      elapsed = 0;
      refresh();
    }
  }

  function setActive(next: boolean) {
    if (detached || active === next) return;
    active = next;
    if (active) {
      // Layouts may have changed while the panel was collapsed.
      dirty = true;
      elapsed = 0;
      ticker.add(tick, undefined, UPDATE_PRIORITY.LOW);
      refresh();
    } else {
      setPicking(false);
      ticker.remove(tick);
      selected = null;
      animations.clear();
      overlay.style.display = 'none';
      current = Object.freeze({
        ...current,
        selectedId: null,
        selection: null,
        animations: readonlySnapshot([]),
      });
      panel.render(current);
    }
  }

  function setPicking(next: boolean) {
    next = next && active && !detached;
    if (picking === next) return;
    picking = next;
    hovered = null;
    if (next) picker.start();
    else picker.stop();
    panel.setPicking(next);
    highlight();
  }

  const panel = createPanel(
    mount,
    select,
    refresh,
    detach,
    setActive,
    options.defaultOpen,
    () => setPicking(!picking),
  );
  const picker = createPicker({
    canvas,
    app,
    getNodes() {
      if (dirty && !detached) refresh();
      return nodes.values();
    },
    onHover(node) {
      hovered = node;
      highlight();
    },
    onPick(node) {
      if (!picking || !belongs(node)) return;
      setPicking(false);
      select(node._id);
      panel.reveal(node._id);
    },
    onCancel: () => setPicking(false),
  });
  const unsubscribe = root.observe((event) => {
    if (event.type === 'destroy') {
      detach();
      return;
    }
    dirty = true;
    if (!active) return;
    stats.layoutUpdates++;
    stats.layoutDuration += event.duration;
    timeline.push({ time: performance.now(), duration: event.duration });
    if (timeline.length > maxEntries) timeline.shift();
  });
  function detach() {
    if (detached) return;
    detached = true;
    unsubscribe();
    ticker.remove(tick);
    stage.off('destroyed', detach);
    root._view.off('destroyed', detach);
    picker.remove();
    try {
      panel.remove();
    } finally {
      overlay.remove();
      nodes.clear();
      animations.clear();
      selected = null;
      hovered = null;
      picking = false;
      sessions.delete(doc);
    }
  }
  const session: DevtoolsSession = {
    select,
    refresh,
    snapshot: () => current,
    detach,
  };
  sessions.set(doc, session);
  stage.on('destroyed', detach);
  root._view.on('destroyed', detach);
  refresh();
  return session;
}

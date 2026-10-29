import type { Container, Renderer } from 'pixi.js';
import { Ticker } from 'pixi.js';
import type { ViewStyles } from './layout/viewStyles';
import type { PNode } from './PNode';
import { PText } from './PText';
import { PView } from './PView';

const layoutTicker = Ticker.shared;

const renderLayouts = new WeakMap<
  Container,
  { roots: Set<PRoot>; release: () => void }
>();

function subscribeRenderLayout(container: Container, root: PRoot): () => void {
  let subscription = renderLayouts.get(container);
  if (!subscription) {
    const roots = new Set<PRoot>();
    const previous = container.onRender;
    let rendering = 0;
    const onRender = (renderer: Renderer) => {
      rendering++;
      try {
        previous?.call(container, renderer);
        // Set iteration also visits roots added by a synchronous layout observer.
        for (const root of roots) root.doLayout();
      } finally {
        rendering--;
      }
    };
    const release = () => {
      if (renderLayouts.get(container)?.roots !== roots) return;
      if (roots.size) return;
      if (rendering) {
        // Pixi iterates a live onRender array. Unregistering its current entry
        // would skip the next callback; only hook cleanup waits, never layout.
        queueMicrotask(release);
        return;
      }
      if (container.onRender === onRender)
        container.onRender = previous ?? null;
      renderLayouts.delete(container);
    };
    subscription = { roots, release };
    renderLayouts.set(container, subscription);
    container.onRender = onRender;
  }
  const { roots, release } = subscription;
  roots.add(root);
  return () => {
    roots.delete(root);
    if (!roots.size) release();
  };
}

export type PRootDebugOptions = {
  textRendering: boolean;
};

export type PRootObservation =
  | { readonly type: 'layout'; readonly duration: number }
  | { readonly type: 'destroy' };

const DEFAULT_DEBUG_OPTIONS: PRootDebugOptions = {
  textRendering: false,
};

export class PRoot extends PView {
  _isDirty = true;
  _debugOptions: PRootDebugOptions = { ...DEFAULT_DEBUG_OPTIONS };
  private observers?: Set<(event: PRootObservation) => void>;
  private readonly stopRenderLayout: () => void;

  constructor(
    private readonly renderContainer: Container,
    styles: ViewStyles = {},
    debugOptions: Partial<PRootDebugOptions> = {},
  ) {
    super();
    renderContainer.addChild(this._view);
    this._root = this;
    this.setStyle(styles);
    this.setDebugOptions(debugOptions);
    layoutTicker.add(this.doLayout, this);
    // Applications may draw on a different ticker (or render manually). Flush
    // pending tree/geometry changes before Pixi builds this frame's instructions.
    this.stopRenderLayout = subscribeRenderLayout(renderContainer, this);
    renderContainer.on('destroyed', this.destroy, this);
  }

  setDebugOptions(options: Partial<PRootDebugOptions> = {}) {
    this._debugOptions = {
      ...this._debugOptions,
      ...options,
    };
    this.markDirty();
  }

  private applyDebugOptionsToTree() {
    this.walkTree(this, (node) => {
      if (node instanceof PText) {
        node.setDebugTextRendering(this._debugOptions.textRendering);
      }
    });
  }

  private walkTree(node: PNode, visitor: (node: PNode) => void) {
    visitor(node);
    for (const child of node._children) {
      this.walkTree(child, visitor);
    }
  }

  markDirty() {
    this._isDirty = true;
  }

  /** Observe completed layouts until unsubscribed or the root is destroyed. */
  observe(listener: (event: PRootObservation) => void): () => void {
    if (this.isDestroyed) return () => {};
    this.observers ??= new Set();
    this.observers.add(listener);
    return () => {
      this.observers?.delete(listener);
    };
  }

  private notifyObservers(event: PRootObservation) {
    if (!this.observers?.size) return;
    for (const listener of [...this.observers]) {
      if (!this.observers.has(listener)) continue;
      try {
        listener(event);
      } catch (error) {
        // Optional diagnostics must not interrupt rendering or teardown.
        console.error('[piant] Root observer failed.', error);
      }
    }
  }

  doLayout() {
    if (this.isDestroyed || !this._isDirty) {
      return;
    }
    const started = this.observers?.size ? performance.now() : undefined;
    this._isDirty = false;
    this.applyDebugOptionsToTree();
    this._layoutNode.calculateLayout(
      this._layoutStyle.width as number,
      this._layoutStyle.height as number,
    );
    this.applyLayout();
    if (started !== undefined) {
      this.notifyObservers({
        type: 'layout',
        duration: performance.now() - started,
      });
    }
  }

  protected getDestroyTasks() {
    return [
      () => this.renderContainer.off('destroyed', this.destroy, this),
      () => layoutTicker.remove(this.doLayout, this),
      () => this.stopRenderLayout(),
      () => this.notifyObservers({ type: 'destroy' }),
      () => this.observers?.clear(),
    ];
  }
}

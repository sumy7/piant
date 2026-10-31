import { Container, Graphics } from 'pixi.js';
import Yoga, { Edge } from 'yoga-layout';
import { applyStyle } from './layout/applyStyle';
import type { ViewStyles } from './layout/viewStyles';
import type { PRoot } from './PRoot';

let globalId = 0;

const getNextId = () => {
  globalId += 1;
  return globalId;
};

export class PNode {
  _id = getNextId();

  private destroyCallbacks = new Set<() => void>();
  private disposed = false;
  private rootChangeListeners?: Set<() => void>;

  get isDestroyed(): boolean {
    return this.disposed;
  }

  /** Whether this retained node and its logical ancestors can currently be drawn. */
  get isVisible(): boolean {
    if (!this._root || this._root.isDestroyed) return false;
    let current: PNode | null = this;
    while (current) {
      if (
        current.isDestroyed ||
        current._layoutStyle.display === 'none' ||
        (current._animAlpha ?? current._layoutStyle.opacity ?? 1) <= 0 ||
        !current._view.visible ||
        !current._view.renderable ||
        current._view.alpha <= 0
      )
        return false;
      current = current._parent;
    }
    return true;
  }

  /** Observe settled geometry/visibility, including ancestor and root changes. */
  observeLayout(listener: () => void): () => void {
    if (this.disposed) return () => {};
    let active = true;
    let pending = false;
    let stopRoot = () => {};
    let stopDestroy = () => {};
    let observedRoot: PRoot | null = null;
    const notify = () => {
      pending = false;
      if (!active || this.disposed) return;
      try {
        listener();
      } catch (error) {
        console.error('[piant] Node layout observer failed.', error);
      }
    };
    const schedule = () => {
      if (!active || pending) return;
      pending = true;
      queueMicrotask(() => {
        if (pending) notify();
      });
    };
    const followRoot = () => {
      if (observedRoot !== this._root) {
        stopRoot();
        observedRoot = this._root;
        stopRoot = observedRoot?.observe(() => notify()) ?? (() => {});
      }
      // Reconciliation clears and restores a root in the same stack. Wait until
      // it settles rather than briefly hiding a retained, focused DOM element.
      schedule();
    };
    const dispose = () => {
      if (!active) return;
      active = false;
      pending = false;
      this._view.off('sizeChange', schedule);
      this.rootChangeListeners?.delete(followRoot);
      stopRoot();
      stopDestroy();
    };
    this.rootChangeListeners ??= new Set();
    this.rootChangeListeners.add(followRoot);
    this._view.on('sizeChange', schedule);
    stopDestroy = this.onDestroy(dispose);
    followRoot();
    return dispose;
  }

  private notifyRootChange() {
    if (!this.rootChangeListeners?.size) return;
    for (const listener of [...this.rootChangeListeners]) listener();
  }

  /** Release a node-owned resource on destruction, including recursive removal. */
  onDestroy(callback: () => void): () => void {
    if (this.disposed) {
      callback();
      return () => {};
    }
    this.destroyCallbacks.add(callback);
    return () => this.destroyCallbacks.delete(callback);
  }

  displayName = 'PNode';

  // 所属的根节点
  _root: PRoot | null = null;
  // 父节点
  _parent: PNode | null = null;
  // 子节点列表
  _children: PNode[] = [];

  // 布局节点
  _layoutNode = Yoga.Node.create();
  _layoutStyle: ViewStyles = {
    boxSizing: 'border-box',
    position: 'static',
  };

  // Animation translation offset (driven by @piant/animation)
  _animTranslate: { x: number; y: number } = { x: 0, y: 0 };
  // Animation alpha override (null = use _layoutStyle.opacity)
  _animAlpha: number | null = null;

  // 实际的内容容器 = [_viewBg, _viewContent, _viewMask]
  _view = new Container({
    label: 'view',
  });
  // 背景
  _viewBg = new Graphics({
    label: 'bg',
    zIndex: -1,
  });
  // 子内容容器
  _viewContent = new Container({
    label: 'content',
    zIndex: 0,
  });
  // 遮罩圆角
  _viewMask = new Graphics({
    label: 'mask',
    zIndex: 1,
  });

  constructor() {
    this.displayName = this.constructor.name;
    this._view.label = this.displayName;
    this._view.addChild(this._viewBg);
    this._view.addChild(this._viewContent);
    this._view.addChild(this._viewMask);
  }

  markDirty() {
    this._root?.markDirty();
  }

  setStyle(style: ViewStyles = {}) {
    Object.assign(this._layoutStyle, style);
    applyStyle(this._layoutNode, this._layoutStyle);
    this.markDirty();
  }

  bindToRoot(root: PRoot) {
    if (this._root !== root) {
      this._root = root;
      this.notifyRootChange();
    }
    for (const child of this._children) {
      child.bindToRoot(root);
    }
  }

  get parentNode(): PNode | null {
    return this._parent;
  }

  get firstChild(): PNode | null {
    return this._children.length > 0 ? this._children[0] : null;
  }

  private resolveBorderRadii(width: number, height: number) {
    const baseRadius = this.toNonNegativeRadius(this._layoutStyle.borderRadius);
    let topLeft = this.toNonNegativeRadius(
      this._layoutStyle.borderTopLeftRadius ?? baseRadius,
    );
    let topRight = this.toNonNegativeRadius(
      this._layoutStyle.borderTopRightRadius ?? baseRadius,
    );
    let bottomRight = this.toNonNegativeRadius(
      this._layoutStyle.borderBottomRightRadius ?? baseRadius,
    );
    let bottomLeft = this.toNonNegativeRadius(
      this._layoutStyle.borderBottomLeftRadius ?? baseRadius,
    );

    const maxRadius = Math.max(0, Math.min(width, height) / 2);
    topLeft = Math.min(topLeft, maxRadius);
    topRight = Math.min(topRight, maxRadius);
    bottomRight = Math.min(bottomRight, maxRadius);
    bottomLeft = Math.min(bottomLeft, maxRadius);

    return {
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    };
  }

  private toNonNegativeRadius(value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value;
  }

  protected drawRoundedRect(
    graphics: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radii = this.resolveBorderRadii(width, height),
  ) {
    const hasAnyRadius =
      radii.topLeft > 0 ||
      radii.topRight > 0 ||
      radii.bottomRight > 0 ||
      radii.bottomLeft > 0;

    if (!hasAnyRadius) {
      graphics.rect(x, y, width, height);
      return;
    }

    if (
      radii.topLeft === radii.topRight &&
      radii.topLeft === radii.bottomRight &&
      radii.topLeft === radii.bottomLeft
    ) {
      graphics.roundRect(x, y, width, height, radii.topLeft);
      return;
    }

    graphics
      .moveTo(x + radii.topLeft, y)
      .lineTo(x + width - radii.topRight, y)
      .arcTo(x + width, y, x + width, y + radii.topRight, radii.topRight)
      .lineTo(x + width, y + height - radii.bottomRight)
      .arcTo(
        x + width,
        y + height,
        x + width - radii.bottomRight,
        y + height,
        radii.bottomRight,
      )
      .lineTo(x + radii.bottomLeft, y + height)
      .arcTo(x, y + height, x, y + height - radii.bottomLeft, radii.bottomLeft)
      .lineTo(x, y + radii.topLeft)
      .arcTo(x, y, x + radii.topLeft, y, radii.topLeft)
      .closePath();
  }

  private drawBackground() {
    const width = this._layoutNode.getComputedWidth();
    const height = this._layoutNode.getComputedHeight();
    const border = {
      top: this._layoutNode.getComputedBorder(Edge.Top),
      right: this._layoutNode.getComputedBorder(Edge.Right),
      bottom: this._layoutNode.getComputedBorder(Edge.Bottom),
      left: this._layoutNode.getComputedBorder(Edge.Left),
    };
    const hasBorder = Object.values(border).some((value) => value > 0);
    const hasBorderColor =
      this._layoutStyle.borderColor !== null &&
      this._layoutStyle.borderColor !== undefined;

    this._viewBg.clear().beginPath();
    if (hasBorder && hasBorderColor) {
      const outerRadii = this.resolveBorderRadii(width, height);
      const innerWidth = Math.max(0, width - border.left - border.right);
      const innerHeight = Math.max(0, height - border.top - border.bottom);
      const innerRadii = {
        topLeft: Math.max(
          0,
          outerRadii.topLeft - Math.max(border.top, border.left),
        ),
        topRight: Math.max(
          0,
          outerRadii.topRight - Math.max(border.top, border.right),
        ),
        bottomRight: Math.max(
          0,
          outerRadii.bottomRight - Math.max(border.bottom, border.right),
        ),
        bottomLeft: Math.max(
          0,
          outerRadii.bottomLeft - Math.max(border.bottom, border.left),
        ),
      };

      this.drawRoundedRect(this._viewBg, 0, 0, width, height, outerRadii);
      this._viewBg.fill({ color: this._layoutStyle.borderColor });

      if (innerWidth > 0 && innerHeight > 0) {
        this._viewBg.beginPath();
        this.drawRoundedRect(
          this._viewBg,
          border.left,
          border.top,
          innerWidth,
          innerHeight,
          innerRadii,
        );
        this._viewBg.cut();
        this._viewBg.beginPath();
        this.drawRoundedRect(
          this._viewBg,
          border.left,
          border.top,
          innerWidth,
          innerHeight,
          innerRadii,
        );
        this._viewBg.fill({
          color: this._layoutStyle.backgroundColor ?? 'transparent',
        });
      }
    } else {
      this.drawRoundedRect(this._viewBg, 0, 0, width, height);
      this._viewBg.fill({
        color: this._layoutStyle.backgroundColor ?? 'transparent',
      });
    }

    this._viewMask.clear();
    if (this._layoutStyle.overflow === 'hidden') {
      this._view.mask = this._viewMask;
      this._viewMask.clear().beginPath();
      this.drawRoundedRect(this._viewMask, 0, 0, width, height);
      this._viewMask.fill({
        color: 'red',
      });
    } else {
      this._view.mask = null;
    }
  }

  // diff and update pixi container children
  applyViewChildren() {
    if (this.disposed) return;
    const currentChildren = [...this._viewContent.children];
    const targetChildren = this._children.map((child) => child._view);
    // Remove children that are not in targetChildren
    for (const child of currentChildren) {
      if (!targetChildren.includes(child)) {
        this._viewContent.removeChild(child);
        if (this.disposed) return;
      }
    }
    // Add children to match targetChildren
    for (const child of targetChildren) {
      if (!this._viewContent.children.includes(child)) {
        this._viewContent.addChild(child);
        if (this.disposed) return;
      }
    }
    // Update the idx property for ordering, calc new ZIndex by child index and _id
    for (let i = 0; i < this._children.length; i++) {
      const child = this._children[i];
      const view = child._view;
      // Sort by View Style ZIndex, then by order of addition
      view.zIndex = (child._layoutStyle.zIndex || 0) * 100000 + i;
    }

    // Reorder children by idx
    this._viewContent.sortChildren();
  }

  applyLayout() {
    if (this.disposed) return;
    this.applyViewChildren();
    if (this.disposed) return;

    if (this._layoutStyle.display === 'none') {
      this._view.visible = false;
      return;
    }
    this._view.visible = true;
    this._view.alpha =
      this._animAlpha !== null
        ? this._animAlpha
        : (this._layoutStyle.opacity ?? 1.0);

    for (const child of this._children) {
      child.applyLayout();
    }
    if (this.disposed) return;
    this._view.x = this._layoutNode.getComputedLeft() + this._animTranslate.x;
    this._view.y = this._layoutNode.getComputedTop() + this._animTranslate.y;

    this._view.emit('sizeChange', {
      width: this._layoutNode.getComputedWidth(),
      height: this._layoutNode.getComputedHeight(),
    });

    if (this.disposed) return;
    this.drawBackground();
  }

  get nextSibling(): PNode | null {
    if (!this._parent) return null;
    const siblings = this._parent._children;
    const index = siblings.indexOf(this);
    return index >= 0 && index < siblings.length - 1
      ? (siblings[index + 1] as PNode)
      : null;
  }

  /**
   * 添加子节点
   */
  appendChild(child: PNode) {
    if (child._parent) {
      child._parent.detachChild(child);
    }
    this._children.push(child);
    this._layoutNode.insertChild(
      child._layoutNode,
      this._layoutNode.getChildCount(),
    );
    child._parent = this;
    if (this._root) {
      child.bindToRoot(this._root);
      child.markDirty();
    }
  }

  /**
   * 移除所有子节点
   */
  removeAllChildren() {
    const removedChildren = [...this._children];
    removedChildren.forEach((child) => {
      child.remove();
    });
  }

  /**
   * 移除子节点
   */
  removeChild(child: PNode) {
    if (child._parent === this) {
      child.remove();
    }
  }

  /**
   * 替换子节点
   */
  replaceChild(newChild: PNode, oldChild: PNode) {
    if (oldChild._parent !== this || newChild === oldChild) {
      return;
    }
    if (newChild._parent) {
      newChild._parent.detachChild(newChild);
    }

    const index = this._children.indexOf(oldChild);
    this.detachChild(oldChild);
    this._children.splice(index, 0, newChild);
    this._layoutNode.insertChild(newChild._layoutNode, index);

    newChild._parent = this;

    if (this._root) {
      newChild.bindToRoot(this._root);
      newChild.markDirty();
    }
    oldChild.destroyRecursive();
  }

  insertBefore(newChild: PNode, refChild: PNode | null) {
    // Inserting a node before itself is a no-op (matches browser DOM semantics).
    if (newChild === refChild) return;

    if (!refChild) {
      this.appendChild(newChild);
      return;
    }

    if (refChild._parent !== this) {
      return;
    }

    if (newChild._parent) {
      newChild._parent.detachChild(newChild);
    }

    const index = this._children.indexOf(refChild);
    this._children.splice(index, 0, newChild);
    this._layoutNode.insertChild(newChild._layoutNode, index);

    newChild._parent = this;
    if (this._root) {
      newChild.bindToRoot(this._root);
      newChild.markDirty();
    }
  }

  remove() {
    if (this._parent) {
      this.detach();
      this.destroyRecursive();
    }
  }

  /** @internal Detach for reconciliation without disposing a retained node. */
  detach() {
    this._parent?.detachChild(this);
  }

  private detachChild(child: PNode) {
    if (child._parent !== this) return false;

    const index = this._children.indexOf(child);
    if (index < 0) return false;

    const root = child._root;
    this._children.splice(index, 1);
    this._layoutNode.removeChild(child._layoutNode);
    child._parent = null;
    child.clearRoot();
    root?.markDirty();
    return true;
  }

  private clearRoot() {
    if (this._root) {
      this._root = null;
      this.notifyRootChange();
    }
    for (const child of this._children) {
      child.clearRoot();
    }
  }

  destroyRecursive() {
    this.destroy();
  }

  /** Permanently dispose this subtree. Detach/reordering must not call this. */
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    const callbacks = [...this.destroyCallbacks];
    this.destroyCallbacks.clear();
    const tasks = [
      // Finish logical detachment before Pixi removal events can trigger cleanup.
      () => this.detach(),
      () => this._view.removeFromParent(),
      ...this._children.map((child) => () => {
        // Removal listeners may already have removed or reparented a sibling.
        if (child._parent === this) child.destroyRecursive();
      }),
      ...callbacks,
      ...this.getDestroyTasks(),
      // A moved-out PNode can still have its view here until the next layout.
      // Its new parent owns it; never recursively destroy that stale Pixi child.
      () => {
        if (!this._viewContent.destroyed) this._viewContent.removeChildren();
      },
      // Graphics.destroy({ children: true }) does not free its owned context.
      () => {
        if (!this._viewBg.destroyed) this._viewBg.destroy();
      },
      () => {
        if (!this._viewMask.destroyed) this._viewMask.destroy();
      },
      () => {
        if (!this._view.destroyed) this._view.destroy({ children: true });
      },
      () => this._layoutNode.free(),
    ];
    let failure: unknown;
    let failed = false;
    for (const task of tasks) {
      try {
        task();
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
    if (failed) throw failure;
  }

  /** Release subclass-owned resources independently, before base containers. */
  protected getDestroyTasks(): (() => void)[] {
    return [];
  }
}

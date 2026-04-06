import { Container, Graphics } from 'pixi.js';
import Yoga from 'yoga-layout';
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

  // 实际的内容容器 = [_viewBg, _viewContent, _viewMask]
  _view = new Container();
  // 背景
  _viewBg = new Graphics();
  // 子内容容器
  _viewContent = new Container();
  // 遮罩圆角
  _viewMask = new Graphics();

  constructor() {
    console.log('PNode created with id:', this._id, this);
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
    this._root = root;
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

  private drawBackground() {
    this._viewBg
      .clear()
      .roundRect(
        0,
        0,
        this._layoutNode.getComputedWidth(),
        this._layoutNode.getComputedHeight(),
        this._layoutStyle.borderRadius || 0,
      )
      .fill({
        color: this._layoutStyle.backgroundColor || 'transparent',
      });
    this._viewMask.clear();
    if (this._layoutStyle.overflow === 'hidden') {
      this._view.mask = this._viewMask;
      this._viewMask
        .clear()
        .roundRect(
          0,
          0,
          this._layoutNode.getComputedWidth(),
          this._layoutNode.getComputedHeight(),
          this._layoutStyle.borderRadius || 0,
        )
        .fill({
          color: 'red',
        });
    } else {
      this._view.mask = null;
    }
  }

  // diff and update pixi container children
  applyViewChildren() {
    const currentChildren = [...this._viewContent.children];
    const targetChildren = this._children.map((child) => child._view);
    // Remove children that are not in targetChildren
    for (const child of currentChildren) {
      if (!targetChildren.includes(child)) {
        this._viewContent.removeChild(child);
      }
    }
    // Add children to match targetChildren
    for (const child of targetChildren) {
      if (!this._viewContent.children.includes(child)) {
        this._viewContent.addChild(child);
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
    this.applyViewChildren();

    if (this._layoutStyle.display === 'none') {
      this._view.visible = false;
      return;
    }
    this._view.visible = true;
    this._view.alpha = this._layoutStyle.opacity ?? 1.0;

    for (const child of this._children) {
      child.applyLayout();
    }
    this._view.x = this._layoutNode.getComputedLeft();
    this._view.y = this._layoutNode.getComputedTop();

    this._view.emit('sizeChange', {
      width: this._layoutNode.getComputedWidth(),
      height: this._layoutNode.getComputedHeight(),
    });

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
      child._parent.removeChild(child);
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
    if (oldChild._parent !== this) {
      return;
    }
    if (newChild._parent) {
      newChild._parent.removeChild(newChild);
    }

    const index = this._children.indexOf(oldChild);
    this._children.splice(index, 1, newChild);

    this._layoutNode.removeChild(oldChild._layoutNode);
    this._layoutNode.insertChild(newChild._layoutNode, index);

    oldChild._parent = null;
    newChild._parent = this;

    oldChild._root = null;

    if (this._root) {
      newChild.bindToRoot(this._root);
      newChild.markDirty();
    }
  }

  insertBefore(newChild: PNode, refChild: PNode | null) {
    if (newChild._parent) {
      newChild._parent.removeChild(newChild);
    }

    if (!refChild) {
      this.appendChild(newChild);
      return;
    }

    if (refChild._parent !== this) {
      return;
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
      const parent = this._parent;
      const index = parent._children.indexOf(this);
      if (index >= 0) {
        parent._children.splice(index, 1);
        parent._layoutNode.removeChild(this._layoutNode);
      }
      this.markDirty();
      this._parent = null;
      this._root = null;
      this.destroyRecursive();
    }
  }

  destroyRecursive() {
    for (const child of this._children) {
      child.destroyRecursive();
    }
    this.destroy();
  }

  destroy() {
    // todo 区分销毁和移除
    // this._layoutNode.free();
    // this._layoutNode = null as any;
  }
}

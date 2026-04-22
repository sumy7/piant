import type { Container } from 'pixi.js';
import { Ticker } from 'pixi.js';
import { PText } from './PText';
import type { ViewStyles } from './layout/viewStyles';
import { PNode } from './PNode';
import { PView } from './PView';

const layoutTicker = Ticker.shared;

export type PRootDebugOptions = {
  textRendering: boolean;
};

const DEFAULT_DEBUG_OPTIONS: PRootDebugOptions = {
  textRendering: false,
};

export class PRoot extends PView {
  _isDirty = true;
  _debugOptions: PRootDebugOptions = { ...DEFAULT_DEBUG_OPTIONS };

  constructor(
    renderContainer: Container,
    styles: ViewStyles = {},
    debugOptions: Partial<PRootDebugOptions> = {},
  ) {
    super();
    renderContainer.addChild(this._view);
    this._root = this;
    this.setStyle(styles);
    this.setDebugOptions(debugOptions);
    layoutTicker.add(this.doLayout, this);
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

  doLayout() {
    if (!this._isDirty) {
      return;
    }
    this._isDirty = false;
    this.applyDebugOptionsToTree();
    this._layoutNode.calculateLayout(
      this._layoutStyle.width as number,
      this._layoutStyle.height as number,
    );
    this.applyLayout();
  }

  destroy() {
    layoutTicker.remove(this.doLayout, this);
    super.destroy();
  }
}

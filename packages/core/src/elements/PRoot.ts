import type { Container } from 'pixi.js';
import { Ticker } from 'pixi.js';
import type { ViewStyles } from './layout/viewStyles';
import { PView } from './PView';

const layoutTicker = Ticker.shared;

export class PRoot extends PView {
  _isDirty = true;

  constructor(renderContainer: Container, styles: ViewStyles = {}) {
    super();
    renderContainer.addChild(this._view);
    this._root = this;
    this.setStyle(styles);
    layoutTicker.add(this.doLayout, this);
  }

  markDirty() {
    this._isDirty = true;
  }

  doLayout() {
    if (!this._isDirty) {
      return;
    }
    this._isDirty = false;
    this._layoutNode.calculateLayout(
      this._layoutStyle.width as number,
      this._layoutStyle.height as number,
    );
    this.applyLayout();
  }
}

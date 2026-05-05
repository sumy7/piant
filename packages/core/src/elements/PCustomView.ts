import { Graphics } from 'pixi.js';
import type { ViewStyles } from './layout/viewStyles';
import { PNode } from './PNode';

export class PCustomView extends PNode {
  _graphic = new Graphics();
  _layoutStyle: ViewStyles = {};

  constructor() {
    super();
    // add graphic before _viewContent
    const viewContentIndex = this._view.getChildIndex(this._viewContent);
    this._view.addChildAt(this._graphic, viewContentIndex);
  }
}

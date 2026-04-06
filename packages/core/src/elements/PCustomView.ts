import { Graphics } from 'pixi.js';
import type { ViewStyles } from './layout/viewStyles';
import { PNode } from './PNode';

export class PCustomView extends PNode {
  _graphic = new Graphics();
  _layoutStyle: ViewStyles = {};

  constructor() {
    super();
    this._viewContent.addChild(this._graphic);
  }
}

import { DOMContainer } from 'pixi.js';
import { PNode } from './PNode';

export class PInput extends PNode {
  _domContainer: DOMContainer;
  _inputElement: HTMLInputElement;

  constructor() {
    super();

    this._inputElement = document.createElement('input');
    this._inputElement.style.border = 'none';
    this._inputElement.style.outline = 'none';
    this._inputElement.style.background = 'transparent';
    this._inputElement.style.padding = '0';
    this._inputElement.style.margin = '0';
    this._inputElement.style.boxSizing = 'border-box';
    this._inputElement.style.width = '100%';
    this._inputElement.style.height = '100%';
    this._inputElement.style.fontSize = 'inherit';
    this._inputElement.style.fontFamily = 'inherit';
    this._inputElement.style.color = 'inherit';

    this._domContainer = new DOMContainer({
      element: this._inputElement,
    });
  }

  applyInputElement() {
    if (this._viewContent.children.indexOf(this._domContainer) < 0) {
      this._viewContent.removeChildren();
      this._viewContent.addChild(this._domContainer);
    }

    const width = this._layoutNode.getComputedWidth();
    const height = this._layoutNode.getComputedHeight();

    this._inputElement.style.width = `${width}px`;
    this._inputElement.style.height = `${height}px`;
  }

  applyLayout() {
    super.applyLayout();
    this.applyInputElement();
  }

  destroy() {
    this._domContainer.destroy();
    super.destroy();
  }
}

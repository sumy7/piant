import type { DOMContainer } from 'pixi.js';
import { attachDOMElement, type DOMElementBinding } from './attachDOMElement';
import { PNode } from './PNode';

export class PInput extends PNode {
  _domContainer: DOMContainer;
  _inputElement: HTMLInputElement;
  readonly domElement: DOMElementBinding<HTMLInputElement>;

  /** The same native input used for rendering, values and DOM events. */
  get element(): HTMLInputElement {
    return this._inputElement;
  }

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
    this._inputElement.style.pointerEvents = 'auto';

    this.domElement = attachDOMElement(this, this._inputElement);
    this._domContainer = this.domElement.container;
  }

  applyInputElement() {
    this.domElement.sync();
  }

  applyLayout() {
    super.applyLayout();
    if (this.isDestroyed) return;
    this.applyInputElement();
  }

  protected getDestroyTasks() {
    return [() => this.domElement.dispose()];
  }
}

import type { DOMContainer } from 'pixi.js';
import { Edge } from 'yoga-layout';
import { attachDOMElement, type DOMElementBinding } from './attachDOMElement';
import { isInputComposing } from './inputComposition';
import type { InputStyles } from './inputStyles';
import { PNode } from './PNode';

export class PInput extends PNode {
  declare _layoutStyle: InputStyles;
  _domContainer: DOMContainer;
  _inputElement: HTMLInputElement;
  readonly domElement: DOMElementBinding<HTMLInputElement>;

  /** The same native input used for rendering, values and DOM events. */
  get element(): HTMLInputElement {
    return this._inputElement;
  }

  get isComposing(): boolean {
    return isInputComposing(this.element);
  }

  focus(options?: FocusOptions): void {
    if (!this.isDestroyed) this.element.focus(options);
  }

  blur(): void {
    if (!this.isDestroyed) this.element.blur();
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
    if (this.isDestroyed) return;
    for (const [name, edge] of [
      ['paddingTop', Edge.Top],
      ['paddingRight', Edge.Right],
      ['paddingBottom', Edge.Bottom],
      ['paddingLeft', Edge.Left],
    ] as const) {
      this.element.style[name] =
        `${this._layoutNode.getComputedPadding(edge) + this._layoutNode.getComputedBorder(edge)}px`;
    }
  }

  setStyle(style: InputStyles = {}) {
    super.setStyle(style);
    const current = this._layoutStyle;
    const lineHeight = current.lineHeight;
    Object.assign(this.element.style, {
      fontFamily: current.fontFamily ?? 'inherit',
      fontSize:
        current.fontSize === undefined ? 'inherit' : `${current.fontSize}px`,
      fontWeight:
        current.fontWeight === undefined
          ? 'inherit'
          : String(current.fontWeight),
      fontStyle: current.fontStyle ?? 'inherit',
      lineHeight:
        typeof lineHeight === 'number'
          ? `${lineHeight}px`
          : lineHeight?.endsWith('x')
            ? lineHeight.slice(0, -1)
            : (lineHeight ?? 'inherit'),
      letterSpacing:
        current.letterSpacing === undefined
          ? 'inherit'
          : `${current.letterSpacing}px`,
      color: current.color ?? 'inherit',
      caretColor: current.caretColor ?? 'auto',
      textAlign: current.textAlign ?? 'start',
    });
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

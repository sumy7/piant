import { Sprite, Texture } from 'pixi.js';
import { PNode } from './PNode';
import {
  type ImageSource,
  type InlineItem,
  type TextRenderSurface,
  Typesetter,
} from './text';

export class PText extends PNode {
  _textContent: InlineItem[] = [];
  _textLayoutStyle: any;
  _textTypesetter: Typesetter;
  _textCanvas = document.createElement('canvas');
  _textCtx: CanvasRenderingContext2D;
  _textSprite: Sprite;
  _textTexture: Texture;

  constructor(items: InlineItem[] | string = []) {
    super();
    const ctx = this._textCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('2d canvas context is required for PText rendering.');
    }
    this._textCtx = ctx;
    this._textTexture = Texture.from(this._textCanvas);
    this._textSprite = new Sprite({
      texture: Texture.EMPTY,
      roundPixels: true,
    });
    this._textContent =
      typeof items === 'string' ? [{ type: 'text', content: items }] : items;
    this._textLayoutStyle = {
      fontSize: 16,
      color: '#000000',
      lineHeight: 20,
      verticalAlign: 'baseline',
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacing: 0,
      textTransform: 'none',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      textAlign: 'left',
    };

    this._textTypesetter = new Typesetter(
      this._textContent,
      this._textLayoutStyle,
    );
    this._layoutNode.setMeasureFunc(this.measureText.bind(this));
  }

  setStyle(style: any = {}) {
    const textStyleKeys = [
      'fontSize',
      'color',
      'lineHeight',
      'verticalAlign',
      'fontFamily',
      'fontWeight',
      'fontStyle',
      'letterSpacing',
      'textTransform',
      'whiteSpace',
      'wordBreak',
      'textAlign',
    ];
    textStyleKeys.forEach((key) => {
      if (style[key] !== undefined) {
        this._textLayoutStyle[key] = style[key];
      }
    });

    super.setStyle(style);
    this._textTypesetter.setStyles(this._textLayoutStyle);
    this._layoutNode.markDirty();
    this.markDirty();
  }

  setContents(contents: any[]) {
    const items: InlineItem[] = contents.map((content) => {
      if (content.type === 'text') {
        return { ...content, type: 'text' };
      } else if (content.type === 'image') {
        const source: ImageSource | undefined =
          content.source ?? content.src ?? content.content;

        const texture =
          source instanceof Sprite
            ? source.texture
            : source instanceof Texture
              ? source
              : undefined;

        if (texture && texture.width === 0) {
          (texture as any).once?.('update', () => {
            this._layoutNode.markDirty();
            this.markDirty();
          });
        }
        return { ...content, type: 'image', source };
      }
      return content;
    });

    this._textContent = items;
    this._textTypesetter.setContents(items);
    this._layoutNode.markDirty();
    this.markDirty();
  }

  measureText(width: number) {
    return this._textTypesetter.flow(width);
  }

  applyLayout() {
    super.applyLayout();
    const surface: TextRenderSurface = {
      sprite: this._textSprite,
      texture: this._textTexture,
      canvas: this._textCanvas,
      ctx: this._textCtx,
    };
    this._textTypesetter.renderTo(this._viewContent, surface, {
      width: this._layoutNode.getComputedWidth(),
      height: this._layoutNode.getComputedHeight(),
    });
  }
}

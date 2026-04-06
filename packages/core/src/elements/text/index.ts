import {
  materializeRichInlineLineRange,
  measureRichInlineStats,
  prepareRichInline,
  walkRichInlineLineRanges,
  type PreparedRichInline,
  type RichInlineItem,
  type RichInlineLine,
  type RichInlineLineRange,
} from '@chenglou/pretext/rich-inline';
import { Container, Sprite, Texture } from 'pixi.js';

export type TextAlign = 'left' | 'center' | 'right';

export type TextLayoutStyle = {
  fontSize: number;
  color: string;
  lineHeight: number | string;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic' | 'oblique' | string;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace: 'normal' | 'nowrap' | string;
  wordBreak: 'break-word' | 'normal' | string;
  textAlign: TextAlign;
};

type InlineBaseStyle = Partial<TextLayoutStyle> & {
  width?: number;
  height?: number;
};

export type InlineTextItem = InlineBaseStyle & {
  type: 'text';
  content: string;
};

export type InlineImageItem = InlineBaseStyle & {
  type: 'image';
  content?: Sprite;
  src?: Sprite;
};

export type InlineItem = InlineTextItem | InlineImageItem;

export type TextRenderSurface = {
  sprite: Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};

const DEFAULT_TEXT_STYLE: TextLayoutStyle = {
  fontSize: 16,
  color: '#000000',
  lineHeight: 20,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  letterSpacing: 0,
  textTransform: 'none',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  textAlign: 'left',
};

export class Typesetter {
  private _contents: InlineItem[] = [];
  private _styles: TextLayoutStyle = DEFAULT_TEXT_STYLE;
  private _prepared: PreparedRichInline | null = null;
  private _cachedWidth: number | null = null;
  private _cachedLines: RichInlineLine[] = [];
  private _cachedStats: { lineCount: number; maxLineWidth: number } | null =
    null;
  private _textMeasureCache = new Map<
    string,
    { width: number; ascent: number; descent: number; height: number }
  >();

  constructor(items: InlineItem[] = [], style: Partial<TextLayoutStyle> = {}) {
    this._contents = items;
    this._styles = { ...DEFAULT_TEXT_STYLE, ...style };
  }

  setStyles(style: Partial<TextLayoutStyle> = {}) {
    this._styles = { ...this._styles, ...style };
    this.invalidate();
  }

  setContents(items: InlineItem[] = []) {
    this._contents = items;
    this.invalidate();
  }

  flow(width: number) {
    const layoutWidth = this.normalizeLayoutWidth(width);
    this.ensureLayout(layoutWidth);

    const stats = this._cachedStats ?? { lineCount: 0, maxLineWidth: 0 };
    const lineCount = Math.max(1, stats.lineCount);
    const measuredWidth = Number.isFinite(layoutWidth)
      ? Math.min(stats.maxLineWidth, layoutWidth)
      : stats.maxLineWidth;

    return {
      width: measuredWidth,
      height: lineCount * this.getResolvedLineHeight(),
    };
  }

  renderTo(
    container: Container,
    surface: TextRenderSurface,
    bounds?: { width?: number; height?: number },
  ) {
    const layoutWidth = this._cachedWidth ?? Number.POSITIVE_INFINITY;
    this.ensureLayout(layoutWidth);

    const nextChildren: Sprite[] = [];
    const renderWidth = this.resolveRenderWidth(bounds?.width, layoutWidth);
    const renderHeight = this.resolveRenderHeight(bounds?.height);
    let hasText = false;

    this.prepareTextSurface(surface, renderWidth, renderHeight);

    const lineHeight = this.getResolvedLineHeight();
    for (let lineIndex = 0; lineIndex < this._cachedLines.length; lineIndex++) {
      const line = this._cachedLines[lineIndex]!;
      const textAlignOffset = this.getTextAlignOffset(renderWidth, line.width);
      const baselineY = lineIndex * lineHeight;
      let currentX = textAlignOffset;

      for (const fragment of line.fragments) {
        currentX += fragment.gapBefore;
        const sourceItem = this._contents[fragment.itemIndex];
        if (!sourceItem) {
          currentX += fragment.occupiedWidth;
          continue;
        }

        if (sourceItem.type === 'image') {
          const sprite = this.resolveImageSprite(sourceItem);
          if (sprite) {
            const imageWidth = this.resolveImageWidth(sourceItem, sprite);
            const imageHeight = this.resolveImageHeight(sourceItem, sprite);
            sprite.width = imageWidth;
            sprite.height = imageHeight;
            sprite.x = currentX;
            sprite.y = baselineY + Math.max(0, (lineHeight - imageHeight) / 2);
            nextChildren.push(sprite);
          }
        } else {
          const renderedText = fragment.text.replace(/\u200B/g, '');
          if (renderedText.length > 0) {
            const style = this.resolveItemStyle(sourceItem);
            this.drawTextFragment(
              surface,
              renderedText,
              style,
              currentX,
              baselineY,
              lineHeight,
            );
            hasText = true;
          }
        }

        currentX += fragment.occupiedWidth;
      }
    }

    this.updateTextSurfaceSprite(surface, renderWidth, renderHeight);
    if (hasText) {
      nextChildren.unshift(surface.sprite);
    }

    this.reconcileChildren(container, nextChildren);
  }

  private invalidate() {
    this._prepared = null;
    this._cachedWidth = null;
    this._cachedLines = [];
    this._cachedStats = null;
  }

  private normalizeLayoutWidth(width: number): number {
    if (!Number.isFinite(width) || width <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return width;
  }

  private ensurePrepared(): PreparedRichInline {
    if (this._prepared) return this._prepared;

    const items: RichInlineItem[] = this._contents.map((item) => {
      if (item.type === 'image') {
        const style = this.resolveItemStyle(item);
        const imageSprite = this.resolveImageSprite(item);
        return {
          text: '\u200B',
          font: this.toFont(style),
          break: 'never',
          extraWidth: this.resolveImageWidth(item, imageSprite),
        };
      }

      const style = this.resolveItemStyle(item);
      return {
        text: this.applyTextTransform(item.content ?? '', style.textTransform),
        font: this.toFont(style),
        extraWidth: 0,
      };
    });

    this._prepared = prepareRichInline(items);
    return this._prepared;
  }

  private ensureLayout(width: number) {
    if (this._cachedWidth === width && this._cachedStats) return;

    const prepared = this.ensurePrepared();
    const lines: RichInlineLine[] = [];
    walkRichInlineLineRanges(prepared, width, (range: RichInlineLineRange) => {
      lines.push(materializeRichInlineLineRange(prepared, range));
    });

    this._cachedWidth = width;
    this._cachedLines = lines;
    this._cachedStats = measureRichInlineStats(prepared, width);
  }

  private resolveItemStyle(item?: InlineBaseStyle): TextLayoutStyle {
    return {
      ...this._styles,
      ...item,
    };
  }

  private toFont(style: TextLayoutStyle): string {
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  }

  private applyTextTransform(
    text: string,
    transform: TextLayoutStyle['textTransform'],
  ) {
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'capitalize') {
      return text.replace(/\b(\p{L})/gu, (m) => m.toUpperCase());
    }
    return text;
  }

  private getResolvedLineHeight(): number {
    const lineHeight = this._styles.lineHeight;
    if (
      typeof lineHeight === 'number' &&
      Number.isFinite(lineHeight) &&
      lineHeight > 0
    ) {
      return lineHeight;
    }

    if (typeof lineHeight === 'string') {
      if (lineHeight.endsWith('px')) {
        const px = Number.parseFloat(lineHeight);
        if (Number.isFinite(px) && px > 0) return px;
      }
      if (lineHeight === 'normal') {
        return this._styles.fontSize * 1.2;
      }
      const numeric = Number.parseFloat(lineHeight);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }

    return this._styles.fontSize * 1.2;
  }

  private resolveImageSprite(item: InlineImageItem): Sprite | null {
    return item.content ?? item.src ?? null;
  }

  private resolveImageWidth(
    item: InlineImageItem,
    sprite: Sprite | null,
  ): number {
    if (
      typeof item.width === 'number' &&
      Number.isFinite(item.width) &&
      item.width > 0
    ) {
      return item.width;
    }
    if (!sprite) return this._styles.fontSize;
    if (sprite.texture?.width) return sprite.texture.width;
    if (sprite.width) return sprite.width;
    return this._styles.fontSize;
  }

  private resolveImageHeight(
    item: InlineImageItem,
    sprite: Sprite | null,
  ): number {
    if (
      typeof item.height === 'number' &&
      Number.isFinite(item.height) &&
      item.height > 0
    ) {
      return item.height;
    }
    if (!sprite) return this.getResolvedLineHeight();
    if (sprite.texture?.height) return sprite.texture.height;
    if (sprite.height) return sprite.height;
    return this.getResolvedLineHeight();
  }

  private getTextAlignOffset(layoutWidth: number, lineWidth: number): number {
    if (!Number.isFinite(layoutWidth)) return 0;
    const remaining = Math.max(0, layoutWidth - lineWidth);
    if (this._styles.textAlign === 'center') return remaining / 2;
    if (this._styles.textAlign === 'right') return remaining;
    return 0;
  }

  private getDevicePixelRatio(): number {
    return typeof window !== 'undefined' && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  }

  private resolveRenderWidth(width: number | undefined, layoutWidth: number) {
    if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
      return width;
    }

    const statsWidth = this._cachedStats?.maxLineWidth ?? 0;
    if (Number.isFinite(layoutWidth)) {
      return Math.max(layoutWidth, statsWidth, 1);
    }

    return Math.max(statsWidth, 1);
  }

  private resolveRenderHeight(height: number | undefined) {
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
      return height;
    }

    const lineCount = Math.max(1, this._cachedStats?.lineCount ?? 0);
    return Math.max(1, lineCount * this.getResolvedLineHeight());
  }

  private prepareTextSurface(
    surface: TextRenderSurface,
    width: number,
    height: number,
  ) {
    const dpr = this.getDevicePixelRatio();
    const pixelWidth = Math.max(1, Math.ceil(width * dpr));
    const pixelHeight = Math.max(1, Math.ceil(height * dpr));

    if (
      surface.canvas.width !== pixelWidth ||
      surface.canvas.height !== pixelHeight
    ) {
      surface.canvas.width = pixelWidth;
      surface.canvas.height = pixelHeight;
    }

    if (typeof surface.ctx.setTransform === 'function') {
      surface.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (typeof surface.ctx.clearRect === 'function') {
      surface.ctx.clearRect(0, 0, width, height);
    }
  }

  private getTextMetrics(text: string, style: TextLayoutStyle) {
    const font = this.toFont(style);
    const cacheKey = `${font}|${text}`;
    const cached = this._textMeasureCache.get(cacheKey);
    if (cached) return cached;

    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) {
      return {
        width: text.length * style.fontSize * 0.5,
        ascent: style.fontSize * 0.8,
        descent: style.fontSize * 0.2,
        height: style.fontSize,
      };
    }

    measureCtx.font = font;
    const metrics = measureCtx.measureText(text);
    const measuredTextWidth = metrics.width;
    const letterSpacingWidth =
      Math.max(0, text.length - 1) * style.letterSpacing;
    const ascent = Math.max(
      1,
      Math.ceil(metrics?.actualBoundingBoxAscent ?? style.fontSize * 0.8),
    );
    const descent = Math.max(
      1,
      Math.ceil(metrics?.actualBoundingBoxDescent ?? style.fontSize * 0.2),
    );
    const resolved = {
      width: Math.max(1, Math.ceil(measuredTextWidth + letterSpacingWidth)),
      ascent,
      descent,
      height: Math.max(1, ascent + descent),
    };
    this._textMeasureCache.set(cacheKey, resolved);
    return resolved;
  }

  private drawTextFragment(
    surface: TextRenderSurface,
    text: string,
    style: TextLayoutStyle,
    x: number,
    baselineY: number,
    lineHeight: number,
  ) {
    const { ctx } = surface;
    const font = this.toFont(style);
    const metrics = this.getTextMetrics(text, style);
    const drawY = baselineY + Math.max(0, (lineHeight - metrics.height) / 2);

    ctx.font = font;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (typeof ctx.fillText === 'function') {
      if (style.letterSpacing > 0) {
        let currentX = x;
        for (const ch of text) {
          ctx.fillText(ch, currentX, drawY + metrics.ascent);
          const w =
            typeof ctx.measureText === 'function'
              ? ctx.measureText(ch).width
              : style.fontSize * 0.5;
          currentX += w + style.letterSpacing;
        }
      } else {
        ctx.fillText(text, x, drawY + metrics.ascent);
      }
    }
  }

  private updateTextSurfaceSprite(
    surface: TextRenderSurface,
    width: number,
    height: number,
  ) {
    const source = (surface.sprite.texture as any).source;
    if (source && typeof source.update === 'function') {
      source.update();
    }
    surface.sprite.x = 0;
    surface.sprite.y = 0;
    surface.sprite.width = width;
    surface.sprite.height = height;
  }

  private reconcileChildren(container: Container, nextChildren: Sprite[]) {
    const nextSet = new Set(nextChildren);

    for (const child of [...container.children]) {
      if (!nextSet.has(child as Sprite)) {
        container.removeChild(child);
      }
    }

    for (let i = 0; i < nextChildren.length; i++) {
      const child = nextChildren[i]!;
      if (child.parent !== container) {
        container.addChildAt(child, i);
      } else if (container.getChildIndex(child) !== i) {
        container.setChildIndex(child, i);
      }
    }
  }
}
